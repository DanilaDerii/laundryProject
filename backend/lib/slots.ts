// backend/lib/slots.ts
// Pure helpers to validate + work with 15-minute pickup slots.
// Assumptions:
// - Input times are ISO strings interpreted in the server's local timezone.
// - Slot "duration" is one 15-min block. Last valid start is 15:45 for a 09:00–16:00 day.
// - Wednesday is off (no slots at all).
// - Until drivers exist, we enforce **one pickup per slot globally**.
//   Later you can change `hasSlotConflict` to be "per driver".

import { Order } from "./types";

const SLOT_MINUTES = 15;
const OPEN_HOUR = 9;   // 09:00 inclusive
const CLOSE_HOUR = 16; // 16:00 exclusive

// --- Date helpers (local time) ---

function clone(d: Date) { return new Date(d.getTime()); }

function isWednesday(d: Date) {
  // JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed
  return d.getDay() === 3;
}

function isWithinBusinessHours(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  // 09:00 <= slotStart < 16:00 (so last start is 15:45)
  if (h < OPEN_HOUR || h >= CLOSE_HOUR) return false;
  // minutes must be one of 0,15,30,45
  return m % SLOT_MINUTES === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
}

export function roundDownToSlot(d: Date) {
  const out = clone(d);
  out.setSeconds(0, 0);
  const m = out.getMinutes();
  const snapped = Math.floor(m / SLOT_MINUTES) * SLOT_MINUTES;
  out.setMinutes(snapped);
  return out;
}

export function addMinutes(d: Date, mins: number) {
  const out = clone(d);
  out.setMinutes(out.getMinutes() + mins);
  return out;
}

export function toIsoLocal(d: Date) {
  // Keep local wall-clock—serialize like "YYYY-MM-DDTHH:mm"
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

// --- Core rules ---

export function isBusinessDay(d: Date) {
  return !isWednesday(d);
}

/**
 * Validate a requested slot against business rules and existing orders.
 * @param orders Existing orders (used to check slot occupancy)
 * @param requestedIso ISO string (local) for slot start, e.g. "2025-09-05T09:30"
 */
export function validateSlot(
  orders: Order[],
  requestedIso: string
): { ok: true; normalizedSlot: string } | { ok: false; reason: string; suggestion?: string } {
  const req = new Date(requestedIso);
  if (Number.isNaN(req.getTime())) {
    return { ok: false, reason: "Invalid date/time format." };
  }

  // Normalize to exact 15-min boundary (but don't silently change it)
  const snapped = roundDownToSlot(req);
  const sameBoundary = req.getMinutes() % SLOT_MINUTES === 0 && req.getSeconds() === 0 && req.getMilliseconds() === 0;
  const normalizedIso = toIsoLocal(snapped);

  // Off-day?
  if (!isBusinessDay(req)) {
    const next = nextOpenSlotAfter(req);
    return { ok: false, reason: "Closed on Wednesdays.", suggestion: next ? toIsoLocal(next) : undefined };
  }

  // Business hours + alignment
  if (!isWithinBusinessHours(req)) {
    if (!sameBoundary) {
      // Suggest the snapped boundary if within hours, else the next open
      if (isWithinBusinessHours(snapped)) {
        return { ok: false, reason: "Slots are 15 minutes aligned.", suggestion: normalizedIso };
      }
    }
    const next = nextOpenSlotAfter(req);
    return { ok: false, reason: "Outside business hours (09:00–16:00).", suggestion: next ? toIsoLocal(next) : undefined };
  }

  // Occupancy: one order per slot (global for now)
  if (hasSlotConflict(orders, req)) {
    const next = nextFreeSlot(orders, req);
    return { ok: false, reason: "Slot already taken.", suggestion: next ? toIsoLocal(next) : undefined };
  }

  // All good
  return { ok: true, normalizedSlot: sameBoundary ? toIsoLocal(req) : normalizedIso };
}

/** Return true if any existing order occupies this slot start (exact match). */
export function hasSlotConflict(orders: Order[], slotStart: Date) {
  const want = toIsoLocal(roundDownToSlot(slotStart));
  return orders.some(o => toIsoLocal(roundDownToSlot(new Date(o.pickupSlot))) === want);
}

/** First next valid business slot after given date-time (skips Wednesdays, enforces hours & alignment). */
export function nextOpenSlotAfter(d: Date) {
  // Start at next 15-min boundary
  let cur = addMinutes(roundDownToSlot(d), SLOT_MINUTES);
  for (let i = 0; i < 96 * 14; i++) { // up to ~2 weeks scan
    if (isBusinessDay(cur) && isWithinBusinessHours(cur)) return cur;
    cur = addMinutes(cur, SLOT_MINUTES);
    // If we rolled past closing, jump to next day's 09:00
    if (cur.getHours() >= CLOSE_HOUR) {
      cur.setHours(OPEN_HOUR, 0, 0, 0);
      cur = addMinutes(cur, SLOT_MINUTES * Math.ceil((24 * 60 - (CLOSE_HOUR - OPEN_HOUR) * 60) / SLOT_MINUTES)); // ensure move to next day's grid
    }
  }
  return null;
}

/** Next free slot considering existing orders (global capacity = 1 per slot). */
export function nextFreeSlot(orders: Order[], from: Date) {
  let cur = nextOpenSlotAfter(from);
  while (cur) {
    if (!hasSlotConflict(orders, cur)) return cur;
    cur = addMinutes(cur, SLOT_MINUTES);
    // If we pass close, rely on nextOpenSlotAfter logic:
    if (!isBusinessDay(cur) || !isWithinBusinessHours(cur)) {
      cur = nextOpenSlotAfter(cur);
    }
  }
  return null;
}

/** Utility to list all available slots for a given local date (YYYY-MM-DD). */
export function listAvailableSlotsForDate(orders: Order[], yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const start = new Date(y, (m - 1), d, OPEN_HOUR, 0, 0, 0);
  if (!isBusinessDay(start)) return [];
  const slots: string[] = [];
  for (let t = clone(start); t.getHours() < CLOSE_HOUR; t = addMinutes(t, SLOT_MINUTES)) {
    if (isWithinBusinessHours(t) && !hasSlotConflict(orders, t)) {
      slots.push(toIsoLocal(t));
    }
  }
  return slots;
}

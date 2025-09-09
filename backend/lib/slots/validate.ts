// backend/lib/slots/validate.ts
import type { Order, ISODateTime } from "../types";
import { SLOT_MINUTES, OPEN_HOUR, CLOSE_HOUR } from "./constants";
import {
  isBusinessDay,
  isWithinBusinessHours,
  isAlignedToSlot,
  roundDownToSlot,
  toIsoLocal,
  nextOpenSlotAfter,
} from "./time";
import * as occ from "./occupancy";

export type ValidateOk = { ok: true; normalizedSlot: ISODateTime };
export type ValidateErr = { ok: false; reason: string; suggestion?: ISODateTime };

export function validateSlot(orders: Order[], requestedIso: string): ValidateOk | ValidateErr {
  const req = new Date(requestedIso);
  if (Number.isNaN(req.getTime())) {
    return { ok: false, reason: "Invalid date/time format." };
  }

  // Snap to grid and normalize once
  const snapped = roundDownToSlot(req);
  const sameBoundary = isAlignedToSlot(req);
  const normalizedIso = toIsoLocal(snapped);

  // Closed day (e.g., Wednesday)
  if (!isBusinessDay(req)) {
    const next = nextOpenSlotAfter(req);
    return {
      ok: false,
      reason: "Closed on Wednesdays.",
      suggestion: next ? toIsoLocal(next) : undefined,
    };
  }

  // Hours + alignment
  if (!isWithinBusinessHours(req)) {
    // If just misaligned but the snapped time is valid, suggest the snapped time
    if (!sameBoundary && isWithinBusinessHours(snapped)) {
      return {
        ok: false,
        reason: "Slots must align to 15-minute boundaries.",
        suggestion: normalizedIso,
      };
    }
    const next = nextOpenSlotAfter(req);
    return {
      ok: false,
      reason: "Outside business hours (09:00–16:00).",
      suggestion: next ? toIsoLocal(next) : undefined,
    };
  }

  // Occupancy check is performed on the snapped (grid-aligned) time
  if (occ.hasSlotConflict(orders, snapped)) {
    const next = occ.nextFreeSlot(orders, snapped);
    return {
      ok: false,
      reason: "Slot already taken.",
      suggestion: next ? toIsoLocal(next) : undefined,
    };
  }

  // OK: return aligned ISO (if already aligned, keep exact boundary)
  return { ok: true, normalizedSlot: sameBoundary ? toIsoLocal(req) : normalizedIso };
}

export function listAvailableSlotsForDate(orders: Order[], yyyyMmDd: string): ISODateTime[] {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const start = new Date(y, m - 1, d, OPEN_HOUR, 0, 0, 0);
  if (!isBusinessDay(start)) return [];

  const out: ISODateTime[] = [];
  for (
    let t = new Date(start);
    t.getHours() < CLOSE_HOUR;
    t = new Date(t.getTime() + SLOT_MINUTES * 60 * 1000)
  ) {
    if (isWithinBusinessHours(t) && !occ.hasSlotConflict(orders, t)) {
      out.push(toIsoLocal(t));
    }
  }
  return out;
}

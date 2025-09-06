// backend/lib/slots/validate.ts
import type { Order } from "../types";
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

export type ValidateOk = { ok: true; normalizedSlot: string };
export type ValidateErr = { ok: false; reason: string; suggestion?: string };

export function validateSlot(orders: Order[], requestedIso: string): ValidateOk | ValidateErr {
  const req = new Date(requestedIso);
  if (Number.isNaN(req.getTime())) {
    return { ok: false, reason: "Invalid date/time format." };
  }

  const snapped = roundDownToSlot(req);
  const sameBoundary = isAlignedToSlot(req);
  const normalizedIso = toIsoLocal(snapped);

  // Off-day
  if (!isBusinessDay(req)) {
    const next = nextOpenSlotAfter(req);
    return { ok: false, reason: "Closed on Wednesdays.", suggestion: next ? toIsoLocal(next) : undefined };
  }

  // Hours + alignment
  if (!isWithinBusinessHours(req)) {
    if (!sameBoundary && isWithinBusinessHours(snapped)) {
      return { ok: false, reason: "Slots are 15 minutes aligned.", suggestion: normalizedIso };
    }
    const next = nextOpenSlotAfter(req);
    return { ok: false, reason: "Outside business hours (09:00–16:00).", suggestion: next ? toIsoLocal(next) : undefined };
  }

  // Occupancy (capacity = 1 per slot)
  if (occ.hasSlotConflict(orders, req)) {
    const next = occ.nextFreeSlot(orders, req);
    return { ok: false, reason: "Slot already taken.", suggestion: next ? toIsoLocal(next) : undefined };
  }

  return { ok: true, normalizedSlot: sameBoundary ? toIsoLocal(req) : normalizedIso };
}

export function listAvailableSlotsForDate(orders: Order[], yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const start = new Date(y, m - 1, d, OPEN_HOUR, 0, 0, 0);
  if (!isBusinessDay(start)) return [];

  const out: string[] = [];
  for (let t = new Date(start); t.getHours() < CLOSE_HOUR; t = new Date(t.getTime() + SLOT_MINUTES * 60 * 1000)) {
    if (isWithinBusinessHours(t) && !occ.hasSlotConflict(orders, t)) {
      out.push(toIsoLocal(t));
    }
  }
  return out;
}

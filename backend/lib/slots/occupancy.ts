// backend/lib/slots/occupancy.ts
import type { Order } from "../types";
import { SLOT_MINUTES } from "./constants";
import {
  toIsoLocal,
  roundDownToSlot,
  isBusinessDay,
  isWithinBusinessHours,
  nextOpenSlotAfter,
  addMinutes,
} from "./time";

/**
 * Returns true if any existing order occupies the same pickup minute.
 * Compares on local-ISO at 15-min resolution to avoid TZ drift.
 */
export function hasSlotConflict(orders: Order[], slotStart: Date): boolean {
  const want = toIsoLocal(roundDownToSlot(slotStart));
  return orders.some((o) => {
    const d = new Date(o.pickupSlot);
    if (Number.isNaN(d.getTime())) return false; // ignore bad data defensively
    return toIsoLocal(roundDownToSlot(d)) === want;
  });
}

/**
 * Finds the next free, valid business slot after `from`.
 * Observes: 15-min grid, 09:00–16:00 window, Wednesday closed, capacity=1.
 */
export function nextFreeSlot(orders: Order[], from: Date): Date | null {
  let cur = nextOpenSlotAfter(from);
  while (cur) {
    if (!hasSlotConflict(orders, cur)) return cur;

    // advance by one slot
    cur = addMinutes(cur, SLOT_MINUTES);

    // if we walk out of window/day, hop to next valid open slot
    if (!isBusinessDay(cur) || !isWithinBusinessHours(cur)) {
      cur = nextOpenSlotAfter(cur);
    }
  }
  return null;
}

// Optional: alternate names some bundlers keep during optimization
export { hasSlotConflict as _hasSlotConflict, nextFreeSlot as _nextFreeSlot };

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
 * True if any existing order occupies the same snapped (15-min) pickup slot.
 * Compares via local-ISO at 15-min resolution to avoid TZ drift.
 */
export function hasSlotConflict(orders: Order[], slotStart: Date): boolean {
  const want = toIsoLocal(roundDownToSlot(slotStart));
  return orders.some((o) => {
    const d = new Date(o.pickupSlot);
    if (Number.isNaN(d.getTime())) return false; // defensive
    return toIsoLocal(roundDownToSlot(d)) === want;
  });
}

/**
 * First free, valid business slot strictly after `from`.
 * Observes: 15-min grid, 09:00–16:00 window, Wednesday closed, capacity=1.
 */
export function nextFreeSlot(orders: Order[], from: Date): Date | null {
  let cur = nextOpenSlotAfter(from);
  // Safety cap: scan up to ~14 days
  for (let i = 0; cur && i < 96 * 14; i++) {
    if (!hasSlotConflict(orders, cur)) return cur;

    // advance one slot; if outside business window/day, jump to next open
    const step = addMinutes(cur, SLOT_MINUTES);
    cur =
      isBusinessDay(step) && isWithinBusinessHours(step)
        ? step
        : nextOpenSlotAfter(step);
  }
  return null;
}

// Optional: stable names
export { hasSlotConflict as _hasSlotConflict, nextFreeSlot as _nextFreeSlot };

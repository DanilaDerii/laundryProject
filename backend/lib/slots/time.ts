import { SLOT_MINUTES, OPEN_HOUR, CLOSE_HOUR, CLOSED_WEEKDAY } from "./constants";

// ---------- Basics ----------
export function clone(d: Date) { return new Date(d.getTime()); }

export function isWednesday(d: Date) {
  return d.getDay() === CLOSED_WEEKDAY;
}

export function isBusinessDay(d: Date) {
  return !isWednesday(d);
}

// Exact 15-min grid + 00 seconds/ms
export function isAlignedToSlot(d: Date) {
  return d.getMinutes() % SLOT_MINUTES === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
}

export function roundDownToSlot(d: Date) {
  const out = clone(d);
  out.setSeconds(0, 0);
  const m = out.getMinutes();
  out.setMinutes(Math.floor(m / SLOT_MINUTES) * SLOT_MINUTES);
  return out;
}

export function addMinutes(d: Date, mins: number) {
  const out = clone(d);
  out.setMinutes(out.getMinutes() + mins);
  return out;
}

// Start must be >= 09:00 and < 16:00 (15:45 is last valid start)
export function isWithinBusinessHours(slotStart: Date) {
  const h = slotStart.getHours();
  if (h < OPEN_HOUR || h >= CLOSE_HOUR) return false;
  return isAlignedToSlot(slotStart);
}

// “Local ISO” without timezone suffix (matches your previous behavior)
export function toIsoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

// ---------- Next open slot ----------

function firstBusinessMinuteOfNextDay(from: Date) {
  const nextDay = new Date(from);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(OPEN_HOUR, 0, 0, 0);
  return nextDay;
}

/**
 * First valid business slot strictly AFTER the given time.
 * - Aligns to grid, then moves one slot forward
 * - Skips closed days (Wednesday) via isBusinessDay
 * - Clamps past 16:00 to next day 09:00
 * Returns Date or null if nothing found within ~2 weeks (safety cap).
 */
export function nextOpenSlotAfter(d: Date): Date | null {
  let cur = addMinutes(roundDownToSlot(d), SLOT_MINUTES); // strictly after 'd'

  // Safety cap: search up to 14 days * 96 slots/day
  for (let i = 0; i < 96 * 14; i++) {
    if (cur.getHours() >= CLOSE_HOUR) {
      cur = firstBusinessMinuteOfNextDay(cur);
    }
    if (isBusinessDay(cur) && isWithinBusinessHours(cur)) {
      return cur;
    }
    cur = addMinutes(cur, SLOT_MINUTES);
  }
  return null;
}

// backend/lib/slots/time.ts
import { SLOT_MINUTES, OPEN_HOUR, CLOSE_HOUR, CLOSED_WEEKDAY } from "./constants";

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

// Start must be >= 09:00 and end (=start+15m) must be <= 16:00
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

// First next valid business slot after given date-time
// replace the existing nextOpenSlotAfter with:
export function nextOpenSlotAfter(d: Date) {
  let cur = addMinutes(roundDownToSlot(d), SLOT_MINUTES);
  // scan up to ~2 weeks
  for (let i = 0; i < 96 * 14; i++) {
    if (isBusinessDay(cur) && isWithinBusinessHours(cur)) return cur;
    cur = addMinutes(cur, SLOT_MINUTES);
    // If we rolled past closing, jump to NEXT day's 09:00
    if (cur.getHours() >= CLOSE_HOUR) {
      const nextDay = new Date(cur);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(OPEN_HOUR, 0, 0, 0);
      cur = nextDay;
    }
  }
  return null;
}


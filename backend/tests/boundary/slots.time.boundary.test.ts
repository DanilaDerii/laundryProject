import { describe, it, expect } from "vitest";
import {
  isAlignedToSlot,
  roundDownToSlot,
  nextOpenSlotAfter,
  isWithinBusinessHours,
  isBusinessDay,
} from "@lib/slots/time";
import { OPEN_HOUR, CLOSE_HOUR, CLOSED_WEEKDAY, SLOT_MINUTES } from "@lib/slots/constants";

/** Helper: pick an open (non-closed) date near the given base. */
function pickOpenDateNear(base: Date): Date {
  const d = new Date(base.getTime());
  for (let i = 0; i < 7; i++) {
    if (d.getDay() !== CLOSED_WEEKDAY) return d;
    d.setDate(d.getDate() + 1);
  }
  return base; // fallback, shouldn't happen
}

/** Build a local Date (your code uses local, not UTC). */
function dLocal(y: number, m1: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m1 - 1, d, h, min, 0, 0);
}

describe("slots/time boundary behavior (local time)", () => {
  it("08:59 is outside/unaligned; 09:00 is aligned & within hours (open boundary)", () => {
    const base = pickOpenDateNear(dLocal(2025, 9, 8));

    const beforeOpen = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      OPEN_HOUR, 59, 0, 0
    );
    const atOpen = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      OPEN_HOUR, 0, 0, 0
    );

    expect(isAlignedToSlot(beforeOpen)).toBe(false);
    expect(isWithinBusinessHours(beforeOpen)).toBe(false);

    expect(isAlignedToSlot(atOpen)).toBe(true);
    expect(isWithinBusinessHours(atOpen)).toBe(true);
  });

  it("15:45 is last valid start; at 16:00 nextOpenSlotAfter jumps to next open day at 09:00", () => {
    const base = pickOpenDateNear(dLocal(2025, 9, 8));

    const lastAligned = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      CLOSE_HOUR - 1, 45, 0, 0
    );
    const atClose = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      CLOSE_HOUR, 0, 0, 0
    );

    expect(isAlignedToSlot(lastAligned)).toBe(true);
    expect(isWithinBusinessHours(lastAligned)).toBe(true);

    const next = nextOpenSlotAfter(atClose);
    expect(next).not.toBeNull();

    if (next) {
      expect(next.getHours()).toBe(OPEN_HOUR);
      expect(next.getMinutes()).toBe(0);
      expect(next.getSeconds()).toBe(0);
      expect(next.getMilliseconds()).toBe(0);
      expect(next.getDay()).not.toBe(CLOSED_WEEKDAY);
    }
  });

  it("roundDownToSlot never moves forward; always snaps to a 15-min boundary with 0s/0ms", () => {
    const x = dLocal(2025, 9, 8, 12, 37); // e.g., 12:37 -> 12:30
    const y = roundDownToSlot(x);

    expect([0, 15, 30, 45]).toContain(y.getMinutes());
    expect(y.getSeconds()).toBe(0);
    expect(y.getMilliseconds()).toBe(0);
    expect(y.getTime()).toBeLessThanOrEqual(x.getTime());
    expect((x.getTime() - y.getTime()) / (60 * 1000)).toBeLessThan(SLOT_MINUTES + 0.001);
  });

  it("nextOpenSlotAfter skips the CLOSED_WEEKDAY entirely", () => {
    const probe = dLocal(2025, 9, 8);
    let dayBeforeClosed = probe;
    for (let i = 0; i < 7; i++) {
      const tomorrow = new Date(dayBeforeClosed.getTime());
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDay() === CLOSED_WEEKDAY) break;
      dayBeforeClosed.setDate(dayBeforeClosed.getDate() + 1);
    }

    const atClose = new Date(
      dayBeforeClosed.getFullYear(),
      dayBeforeClosed.getMonth(),
      dayBeforeClosed.getDate(),
      CLOSE_HOUR, 0, 0, 0
    );

    const next = nextOpenSlotAfter(atClose);
    expect(next).not.toBeNull();

    if (next) {
      expect(isBusinessDay(next)).toBe(true);
      expect(next.getDay()).not.toBe(CLOSED_WEEKDAY);
      expect(next.getHours()).toBe(OPEN_HOUR);
      expect(next.getMinutes()).toBe(0);
    }
  });
});

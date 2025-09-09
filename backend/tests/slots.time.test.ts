import { describe, it, expect } from "vitest";
import { roundDownToSlot, isAlignedToSlot, nextOpenSlotAfter } from "../lib/slots/time";
import { CLOSED_WEEKDAY, OPEN_HOUR, CLOSE_HOUR } from "../lib/slots/constants";

// Helper: make a local Date (avoids DST/UTC surprises)
function d(y: number, m: number, day: number, h: number, min: number) {
  return new Date(y, m - 1, day, h, min, 0, 0);
}

describe("slots/time", () => {
  it("roundDownToSlot: 09:07 → 09:00; 09:15 stays", () => {
    const a = roundDownToSlot(d(2025, 9, 8, 9, 7));
    expect(a.getHours()).toBe(9);
    expect(a.getMinutes()).toBe(0);

    const b = roundDownToSlot(d(2025, 9, 8, 9, 15));
    expect(b.getHours()).toBe(9);
    expect(b.getMinutes()).toBe(15);
  });

  it("isAlignedToSlot: true at :00/:15/:30/:45; false otherwise", () => {
    expect(isAlignedToSlot(d(2025, 9, 8, 10, 0))).toBe(true);
    expect(isAlignedToSlot(d(2025, 9, 8, 10, 15))).toBe(true);
    expect(isAlignedToSlot(d(2025, 9, 8, 10, 30))).toBe(true);
    expect(isAlignedToSlot(d(2025, 9, 8, 10, 45))).toBe(true);
    expect(isAlignedToSlot(d(2025, 9, 8, 10, 46))).toBe(false);
  });

  it("nextOpenSlotAfter: after close jumps to next day at open", () => {
    const afterClose = d(2025, 9, 8, CLOSE_HOUR, 5); // 5 mins past close
    const next = nextOpenSlotAfter(afterClose)!; // assert non-null

    expect(next.getDate()).toBe(d(2025, 9, 9, OPEN_HOUR, 0).getDate());
    expect(next.getHours()).toBe(OPEN_HOUR);
    expect(next.getMinutes()).toBe(0);
  });

  it("nextOpenSlotAfter: skips closed weekday to the next open day at 09:00", () => {
    // 2025-09-10 is a Wednesday (CLOSED_WEEKDAY likely 3 = Wed)
    const closedDayMorning = d(2025, 9, 10, 10, 0);
    const next = nextOpenSlotAfter(closedDayMorning)!; // assert non-null

    expect(next.getHours()).toBe(OPEN_HOUR);
    expect(next.getMinutes()).toBe(0);
    expect(next.getDate()).toBe(11); // Thursday the 11th
  });
});

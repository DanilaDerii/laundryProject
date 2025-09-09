import { describe, it, expect } from "vitest";
import { validateSlot, listAvailableSlotsForDate } from "@lib/slots/validate";
import type { Order } from "@lib/types";
import { OPEN_HOUR, CLOSED_WEEKDAY } from "@lib/slots/constants";

// Build local ISO your code expects: YYYY-MM-DDTHH:MM (no seconds, no Z)
function iso(y: number, m1: number, d: number, h: number, min = 0) {
  const mm = String(m1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const mi = String(min).padStart(2, "0");
  return `${y}-${mm}-${dd}T${hh}:${mi}`;
}

// Find a date with a specific weekday (0..6), near a base
function someDateWithWeekday(targetWd: number) {
  const d = new Date(2025, 8, 8, 12, 0, 0, 0); // 2025-09-08 12:00
  for (let i = 0; i < 14; i++) {
    if (d.getDay() === targetWd) return new Date(d);
    d.setDate(d.getDate() + 1);
  }
  return new Date(2025, 8, 10, 12, 0, 0, 0);
}

// Find a date that is NOT the closed weekday
function someOpenDate() {
  const d = new Date(2025, 8, 8, 12, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    if (d.getDay() !== CLOSED_WEEKDAY) return new Date(d);
    d.setDate(d.getDate() + 1);
  }
  return new Date(2025, 8, 11, 12, 0, 0, 0);
}

describe("Robustness: bad inputs, closed day, misalignment, off-hours, and a small race", () => {
  it("rejects invalid date/time strings with a clear reason", () => {
    const orders: Order[] = [];
    // Some strings are *guaranteed* invalid; others might normalize in JS Date.
    const samples = [
      "", "not-a-date",
      "2025-09-10T09:00:xx",   // bad seconds
      "2025-09-10T09:00ZBAD",  // bad zone suffix
      "2025-09-10T",           // missing time
      "2025-09",               // incomplete date
      "T09:00"                 // missing date
    ];

    for (const s of samples) {
      const parsed = new Date(s);
      const r = validateSlot(orders, s);
      expect(r.ok).toBe(false);

      // Only assert the exact message when Date parsing truly failed.
      if (Number.isNaN(parsed.getTime())) {
        if (!r.ok) expect(r.reason).toBe("Invalid date/time format.");
      }
    }
  });

  it("rejects closed weekday with 'Closed on Wednesdays.' and gives a suggestion", () => {
    const orders: Order[] = [];
    const wed = someDateWithWeekday(CLOSED_WEEKDAY);
    const req = iso(wed.getFullYear(), wed.getMonth() + 1, wed.getDate(), OPEN_HOUR, 0);
    const r = validateSlot(orders, req);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("Closed on Wednesdays.");
      expect(r.suggestion).toMatch(/^20\d{2}-\d{2}-\d{2}T\d{2}:(00|15|30|45)$/);
    }
  });

  it("rejects misaligned times with a snapped suggestion (15-min grid)", () => {
    const orders: Order[] = [];
    const open = someOpenDate();
    const req = iso(open.getFullYear(), open.getMonth() + 1, open.getDate(), OPEN_HOUR, 7); // 09:07 -> 09:00
    const r = validateSlot(orders, req);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("Slots must align to 15-minute boundaries.");
      expect(r.suggestion).toBe(iso(open.getFullYear(), open.getMonth() + 1, open.getDate(), OPEN_HOUR, 0));
    }
  });

  it("rejects outside business hours with a next-open suggestion", () => {
    const orders: Order[] = [];
    const open = someOpenDate();
    const r = validateSlot(orders, iso(open.getFullYear(), open.getMonth() + 1, open.getDate(), 6, 0)); // 06:00
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("Outside business hours (09:00–16:00).");
      expect(r.suggestion).toMatch(/^20\d{2}-\d{2}-\d{2}T\d{2}:(00|15|30|45)$/);
    }
  });

  it("race-ish: two requests for the same slot — first wins; second gets 'Slot already taken.' + suggestion", () => {
    const orders: Order[] = [];
    const open = someOpenDate();
    const wanted = iso(open.getFullYear(), open.getMonth() + 1, open.getDate(), OPEN_HOUR, 0);

    const r1 = validateSlot(orders, wanted);
    expect(r1.ok).toBe(true);

    if (r1.ok) {
      orders.push({
        id: "1",
        customerId: "u1",
        customerName: "Alice",
        phone: "+66-0000-0000",
        address: "123 Test",
        pickupSlot: r1.normalizedSlot,
        deliverySlot: iso(open.getFullYear(), open.getMonth() + 1, open.getDate(), OPEN_HOUR + 3, 0),
        tier: "SMALL",
        price: 200,
        paid: true,
        status: "PLACED",
        createdAt: wanted,
        updatedAt: wanted,
      });
    }

    const r2 = validateSlot(orders, wanted);
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.reason).toBe("Slot already taken.");
      expect(r2.suggestion).toBeDefined();
      expect(r2.suggestion).not.toBe(wanted);

      const yyyyMmDd = wanted.slice(0, 10);
      if (r2.suggestion?.startsWith(yyyyMmDd)) {
        const avail = listAvailableSlotsForDate(orders, yyyyMmDd);
        expect(avail).toContain(r2.suggestion);
      }
    }
  });
});

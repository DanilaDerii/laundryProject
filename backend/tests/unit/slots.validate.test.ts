import { describe, it, expect } from "vitest";
import { validateSlot, listAvailableSlotsForDate } from "@lib/slots/validate";
import { OPEN_HOUR } from "@lib/slots/constants";
import type { Order } from "@lib/types";

// tiny helper to build ISO local like "YYYY-MM-DDTHH:MM" via Date -> toISOString slice
function isoLocal(y: number, m: number, d: number, h: number, min: number) {
  const x = new Date(y, m - 1, d, h, min, 0, 0);
  // Keep it simple in tests: ISO with timezone Z is fine; validateSlot accepts string and parses Date
  return x.toISOString();
}

describe("slots/validate.validateSlot", () => {
  it("rejects closed day (Wednesday) with suggestion to next open day at 09:00", () => {
    // 2025-09-10 is a Wednesday
    const req = isoLocal(2025, 9, 10, 10, 0);
    const res = validateSlot([], req);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected closed-day failure");
    expect(res.reason).toBe("Closed on Wednesdays.");
    expect(res.suggestion).toBeTruthy();
    const sug = new Date(res.suggestion!);
    expect(sug.getHours()).toBe(OPEN_HOUR);
    expect(sug.getMinutes()).toBe(0);
    // should not be Wednesday (3)
    expect(sug.getDay()).not.toBe(3);
  });

  it("rejects misaligned minutes during hours with snapped suggestion", () => {
    const req = isoLocal(2025, 9, 8, 10, 7); // Tuesday, within hours but off the 15-min grid
    const res = validateSlot([], req);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected misalignment failure");
    expect(res.reason).toBe("Slots must align to 15-minute boundaries.");
    const sug = new Date(res.suggestion!);
    expect(sug.getHours()).toBe(10);
    expect(sug.getMinutes()).toBe(0); // snapped to :00
  });

  it("rejects conflict and suggests the next free slot", () => {
    // Seed one existing order at 09:00 on an open day
    const conflictAt = new Date(2025, 8, 8, 9, 0, 0, 0); // 2025-09-08 09:00
    const orders: Order[] = [
      {
        id: "o1",
        customerId: "c1",
        customerName: "Test",
        phone: "",
        address: "",
        tier: "MEDIUM",
        weightKg: 3,
        pickupSlot: conflictAt.toISOString(),
        deliverySlot: new Date(2025, 8, 8, 15, 0).toISOString(),
        price: 300,
        paid: true,
        status: "PLACED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any, // cast to keep the test focused on time fields
    ];

    const res = validateSlot(orders, conflictAt.toISOString());
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected conflict failure");
    expect(res.reason).toBe("Slot already taken.");
    expect(res.suggestion).toBeTruthy();
    const sug = new Date(res.suggestion!);
    // Usually the next 15-min slot if it’s free
    expect(sug.getHours()).toBe(9);
    expect(sug.getMinutes()).toBe(15);
  });

  it("accepts a clean, aligned slot", () => {
    const good = isoLocal(2025, 9, 8, 11, 30); // Tuesday 11:30, aligned, no conflicts
    const res = validateSlot([], good);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    // normalizedSlot should land exactly on the boundary we requested
    const norm = new Date(res.normalizedSlot);
    expect(norm.getHours()).toBe(11);
    expect(norm.getMinutes()).toBe(30);
  });
});

describe("slots/validate.listAvailableSlotsForDate", () => {
  it("lists all open slots for an open day and excludes conflicts", () => {
    // 2025-09-08 is a Monday
    const day = "2025-09-08";
    const nine = new Date(2025, 8, 8, 9, 0).toISOString();

    const orders: Order[] = [
      {
        id: "o2",
        customerId: "c1",
        customerName: "Test",
        phone: "",
        address: "",
        tier: "SMALL",
        weightKg: 1,
        pickupSlot: nine,
        deliverySlot: new Date(2025, 8, 8, 15, 0).toISOString(),
        price: 200,
        paid: true,
        status: "PLACED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
    ];

    const slots = listAvailableSlotsForDate(orders, day);
    // Business window 09:00–16:00 exclusive → 7 hours → 28 slots; one conflict removes 1
    expect(slots.length).toBe(27);
    // Ensure 09:00 is not present, but 09:15 is
    expect(slots.some(s => new Date(s).getHours() === 9 && new Date(s).getMinutes() === 0)).toBe(false);
    expect(slots.some(s => new Date(s).getHours() === 9 && new Date(s).getMinutes() === 15)).toBe(true);
  });
});

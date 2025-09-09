import { describe, it, expect } from "vitest";
import { hasSlotConflict, nextFreeSlot } from "@lib/slots/occupancy";
import type { Order } from "@lib/types";

// helper to make ISO quickly
function iso(y: number, m: number, d: number, h: number, min: number) {
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString();
}

describe("slots/occupancy", () => {
  it("hasSlotConflict: false when empty; true when exact time is taken", () => {
    const when = new Date(2025, 8, 8, 9, 0, 0, 0); // 2025-09-08 09:00
    const orders: Order[] = [];

    expect(hasSlotConflict(orders, when)).toBe(false);

    orders.push({
      id: "o1",
      customerId: "c1",
      customerName: "Test",
      phone: "",
      address: "",
      tier: "SMALL",
      weightKg: 1,
      pickupSlot: iso(2025, 9, 8, 9, 0),
      deliverySlot: iso(2025, 9, 8, 15, 0),
      price: 200,
      paid: true,
      status: "PLACED",
      createdAt: iso(2025, 9, 1, 9, 0),
      updatedAt: iso(2025, 9, 1, 9, 0),
    } as any);

    expect(hasSlotConflict(orders, when)).toBe(true);
  });

  it("nextFreeSlot: moves to the next 15-min slot if current is taken", () => {
    const orders: Order[] = [
      {
        id: "o1",
        customerId: "c1",
        customerName: "Test",
        phone: "",
        address: "",
        tier: "MEDIUM",
        weightKg: 2,
        pickupSlot: iso(2025, 9, 8, 9, 0),
        deliverySlot: iso(2025, 9, 8, 15, 0),
        price: 300,
        paid: true,
        status: "PLACED",
        createdAt: iso(2025, 9, 1, 9, 0),
        updatedAt: iso(2025, 9, 1, 9, 0),
      } as any,
    ];

    const current = new Date(2025, 8, 8, 9, 0, 0, 0); // 09:00
    const next = nextFreeSlot(orders, current)!; // expect non-null
    expect(new Date(next).getHours()).toBe(9);
    expect(new Date(next).getMinutes()).toBe(15);
  });

  it("nextFreeSlot: skips over multiple consecutive conflicts", () => {
    const orders: Order[] = [
      { // 09:00 taken
        id: "o1", customerId: "c1", customerName: "T", phone: "", address: "",
        tier: "SMALL", weightKg: 1,
        pickupSlot: iso(2025, 9, 8, 9, 0),
        deliverySlot: iso(2025, 9, 8, 15, 0),
        price: 200, paid: true, status: "PLACED",
        createdAt: iso(2025, 9, 1, 9, 0), updatedAt: iso(2025, 9, 1, 9, 0),
      } as any,
      { // 09:15 taken
        id: "o2", customerId: "c2", customerName: "U", phone: "", address: "",
        tier: "SMALL", weightKg: 1,
        pickupSlot: iso(2025, 9, 8, 9, 15),
        deliverySlot: iso(2025, 9, 8, 15, 0),
        price: 200, paid: true, status: "PLACED",
        createdAt: iso(2025, 9, 1, 9, 0), updatedAt: iso(2025, 9, 1, 9, 0),
      } as any,
    ];

    const current = new Date(2025, 8, 8, 9, 0, 0, 0);
    const next = nextFreeSlot(orders, current)!;
    expect(new Date(next).getHours()).toBe(9);
    expect(new Date(next).getMinutes()).toBe(30);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../lib/store";

function makeOrder() {
  const user = db.createUser({ name: "Alice", email: "a@test", passwordHash: "x", isMember: false });
  return db.createOrder({
    customerId: user.id,
    customerName: user.name,
    phone: "123",
    address: "Addr",
    tier: "SMALL",
    weightKg: 1,
    pickupSlot: new Date(2025, 8, 8, 9, 0).toISOString(),
    deliverySlot: new Date(2025, 8, 8, 15, 0).toISOString(),
    price: 200,
    paid: true,
    status: "PLACED",
  });
}

describe("store status transitions", () => {
  beforeEach(() => {
    db.resetForTests();
  });

  it("advances through the legal sequence to COMPLETED", () => {
    const o = makeOrder();
    const steps = ["PICKED_UP", "WASHING", "OUT_FOR_DELIVERY", "COMPLETED"] as const;

    let current = o;
    for (const step of steps) {
      const advanced = db.advanceOrderStatus(current.id, step);
      expect(advanced).toBeDefined();
      expect(advanced?.status).toBe(step);
      current = advanced!;
    }
  });

  it("allows PLACED → FAILED_PICKUP, but nothing else after", () => {
    const o = makeOrder();

    const failed = db.advanceOrderStatus(o.id, "FAILED_PICKUP");
    expect(failed?.status).toBe("FAILED_PICKUP");

    // Trying to move again should fail
    const after = db.advanceOrderStatus(o.id, "WASHING");
    expect(after).toBeUndefined();
  });

  it("rejects skipping steps (e.g., PLACED → WASHING)", () => {
    const o = makeOrder();

    const bad = db.advanceOrderStatus(o.id, "WASHING");
    expect(bad).toBeUndefined();
    expect(db.getOrder(o.id)?.status).toBe("PLACED");
  });
});

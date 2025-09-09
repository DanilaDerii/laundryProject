import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@lib/store";

describe("store CRUD", () => {
  beforeEach(() => {
    db.resetForTests();
  });

  it("creates and lists users with auto-incrementing IDs", () => {
    const u1 = db.createUser({ name: "Alice", email: "a@test", passwordHash: "x", isMember: false });
    const u2 = db.createUser({ name: "Bob", email: "b@test", passwordHash: "y", isMember: true });

    expect(u1.id).toBe("1");
    expect(u2.id).toBe("2");

    const all = db.listUsers();
    expect(all.length).toBe(2);
    expect(db.findUserByEmail("b@test")?.name).toBe("Bob");
  });

  it("creates and lists orders with timestamps + IDs", () => {
    const user = db.createUser({ name: "Alice", email: "a@test", passwordHash: "x", isMember: false });

    const o1 = db.createOrder({
      customerId: user.id,
      customerName: user.name,
      phone: "123",
      address: "Addr",
      tier: "SMALL",
      weightKg: 2,
      pickupSlot: new Date(2025, 8, 8, 9, 0).toISOString(),
      deliverySlot: new Date(2025, 8, 8, 15, 0).toISOString(),
      price: 200,
      paid: true,
      status: "PLACED",
    });

    expect(o1.id).toBe("1");
    expect(o1.createdAt).toBeTruthy();
    expect(o1.updatedAt).toBeTruthy();

    const all = db.listOrders();
    expect(all.length).toBe(1);
    expect(db.getOrder("1")?.customerName).toBe("Alice");
  });

  it("updates and deletes an order", () => {
    const user = db.createUser({ name: "Alice", email: "a@test", passwordHash: "x", isMember: false });

    const o1 = db.createOrder({
      customerId: user.id,
      customerName: user.name,
      phone: "123",
      address: "Addr",
      tier: "SMALL",
      weightKg: 2,
      pickupSlot: new Date(2025, 8, 8, 9, 0).toISOString(),
      deliverySlot: new Date(2025, 8, 8, 15, 0).toISOString(),
      price: 200,
      paid: true,
      status: "PLACED",
    });

    // update
    const updated = db.updateOrder(o1.id, { address: "New Addr" });
    expect(updated?.address).toBe("New Addr");

    // delete
    const del = db.deleteOrder(o1.id);
    expect(del).toBe(true);
    expect(db.getOrder(o1.id)).toBeUndefined();
  });
});

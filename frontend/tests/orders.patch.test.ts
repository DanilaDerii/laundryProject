import { describe, it, expect, beforeEach } from "vitest";
import { PATCH as patchOrder } from "../src/app/api/orders/[id]/route";
import { db } from "backend/lib/store";

function mkOrder() {
  const u = db.createUser({ name: "User", email: "u@test", passwordHash: "x", isMember: false });
  return db.createOrder({
    customerId: u.id,
    customerName: u.name,
    phone: "111",
    address: "Addr",
    tier: "SMALL",
    weightKg: 1,
    pickupSlot: "2025-09-08T09:00",   // local ISO short (matches server format)
    deliverySlot: "2025-09-08T15:00",
    price: 200,
    paid: true,
    status: "PLACED",
  });
}

describe("/api/orders/[id] PATCH", () => {
  beforeEach(() => db.resetForTests());

  it("advances PLACED → PICKED_UP → WASHING", async () => {
    const o = mkOrder();

    // → PICKED_UP
    let req = new Request(`http://local/api/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next: "PICKED_UP" }),
    });
    let res = await patchOrder(req, { params: { id: o.id } });
    expect(res.status).toBe(200);
    let body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.order.status).toBe("PICKED_UP");

    // → WASHING
    req = new Request(`http://local/api/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next: "WASHING" }),
    });
    res = await patchOrder(req, { params: { id: o.id } });
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.order.status).toBe("WASHING");
  });

  it("rejects illegal transition (PLACED → WASHING)", async () => {
    const o = mkOrder();

    const req = new Request(`http://local/api/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next: "WASHING" }), // skipping PICKED_UP
    });
    const res = await patchOrder(req, { params: { id: o.id } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(String(body.error)).toContain("Illegal transition");
  });
});

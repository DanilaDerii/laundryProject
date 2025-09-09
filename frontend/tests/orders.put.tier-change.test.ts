import { describe, it, expect, beforeEach } from "vitest";
import { PUT as putOrder } from "../src/app/api/orders/[id]/route";
import { POST as paymentPOST } from "../src/app/api/payment/route";
import { db } from "backend/lib/store";

// Server uses local ISO short "YYYY-MM-DDTHH:MM"
const isoLocalShort = (y: number, m: number, d: number, h: number, min: number) =>
  `${String(y)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

describe("/api/orders/[id] PUT (tier change requires payment)", () => {
  beforeEach(() => db.resetForTests());

  it("rejects tier change without paymentToken (402)", async () => {
    // Create user + order with FUTURE pickup (to allow edits)
    const u = db.createUser({ name: "U", email: "u@test", passwordHash: "x", isMember: true }); // member
    const futurePickup = isoLocalShort(2099, 1, 1, 9, 0);
    const o = db.createOrder({
      customerId: u.id,
      customerName: u.name,
      phone: "111",
      address: "Addr",
      tier: "SMALL",          // 200 base → 140 member
      weightKg: 1,
      pickupSlot: futurePickup,
      deliverySlot: isoLocalShort(2099, 1, 1, 15, 0),
      price: 140,
      paid: true,
      status: "PLACED",
    });

    // Try to change to MEDIUM without token
    const req = new Request(`http://local/api/orders/${o.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "MEDIUM" }), // missing paymentToken
    });
    const res = await putOrder(req, { params: { id: o.id } });
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.ok).toBe(false);
    expect(String(body.error)).toContain("Tier change requires paymentToken");
  });

  it("accepts tier change with correct paymentToken and updates price", async () => {
    // User + order in FUTURE
    const u = db.createUser({ name: "U", email: "u@test", passwordHash: "x", isMember: true }); // member
    const futurePickup = isoLocalShort(2099, 1, 2, 9, 0);
    const o = db.createOrder({
      customerId: u.id,
      customerName: u.name,
      phone: "111",
      address: "Addr",
      tier: "SMALL",         // 140 member
      weightKg: 1,
      pickupSlot: futurePickup,
      deliverySlot: isoLocalShort(2099, 1, 2, 15, 0),
      price: 140,
      paid: true,
      status: "PLACED",
    });

    // Need payment token for NEW tier price: LARGE (400 * 0.7) = 280
    const payReq = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: u.id, amount: 280 }),
    });
    const payRes = await paymentPOST(payReq);
    expect(payRes.status).toBe(201);
    const { token } = await payRes.json();

    // Submit PUT with tier change + paymentToken
    const req = new Request(`http://local/api/orders/${o.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "LARGE", paymentToken: token }),
    });
    const res = await putOrder(req, { params: { id: o.id } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.order.tier).toBe("LARGE");
    expect(body.order.price).toBe(280);
    expect(body.order.paid).toBe(true);
  });
});

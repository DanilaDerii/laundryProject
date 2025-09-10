import { describe, it, expect, beforeEach } from "vitest";
import { POST as paymentPOST } from "../src/app/api/payment/route";
import { POST as ordersPOST } from "../src/app/api/orders/route";
import { db } from "backend/lib/store";

function isoLocalShort(y: number, m: number, d: number, h: number, min: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
}

describe("/api/orders POST (slot conflict)", () => {
  beforeEach(() => db.resetForTests());

  it("rejects when another order already occupies the same pickup slot", async () => {
    // Non-member → MEDIUM price = 300
    const user = db.createUser({ name: "U", email: "u@test", passwordHash: "x", isMember: false });

    // 1) token for first order
    const payReq1 = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 300 }),
    });
    const payRes1 = await paymentPOST(payReq1);
    expect(payRes1.status).toBe(201);
    const { token: t1 } = await payRes1.json();

    // Safe business window: Mon 2025-09-08, 09:00 → 15:45
    const pickup = isoLocalShort(2025, 9, 8, 9, 0);
    const delivery = isoLocalShort(2025, 9, 8, 15, 45);

    // 2) First order should succeed (weight ↔ MEDIUM consistent: 10 kg)
    const orderReq1 = new Request("http://local/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        phone: "111",
        address: "Addr 1",
        pickupSlot: pickup,
        deliverySlot: delivery,
        tier: "MEDIUM",
        weightKg: 10,       // MEDIUM (5 < w <= 15)
        paymentToken: t1,
      }),
    });
    const orderRes1 = await ordersPOST(orderReq1);
    const body1 = await orderRes1.json();
    expect(orderRes1.status).toBe(201);
    expect(body1.ok).toBe(true);

    // 3) second token for second order
    const payReq2 = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 300 }),
    });
    const payRes2 = await paymentPOST(payReq2);
    expect(payRes2.status).toBe(201);
    const { token: t2 } = await payRes2.json();

    // 4) Try to book the SAME pickup slot → should fail with conflict (400)
    const orderReq2 = new Request("http://local/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        phone: "222",
        address: "Addr 2",
        pickupSlot: pickup, // same slot causes conflict
        deliverySlot: delivery,
        tier: "MEDIUM",
        weightKg: 10,
        paymentToken: t2,
      }),
    });
    const orderRes2 = await ordersPOST(orderReq2);
    const body2 = await orderRes2.json();

    expect(orderRes2.status).toBe(400);
    expect(body2).toMatchObject({ ok: false });
    // Some handlers return {reason:"Slot already taken.", suggestion:"..."}
    if ("reason" in body2) expect(body2.reason).toBe("Slot already taken.");
  });
});

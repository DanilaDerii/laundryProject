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
    // user + token
    const user = db.createUser({ name: "U", email: "u@test", passwordHash: "x", isMember: false }); // non-member → MEDIUM 300
    const payReq1 = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 300 }),
    });
    const payRes1 = await paymentPOST(payReq1);
    expect(payRes1.status).toBe(201);
    const { token: t1 } = await payRes1.json();

    const pickup = isoLocalShort(2025, 9, 8, 9, 0);
    const delivery = isoLocalShort(2025, 9, 8, 15, 0);

    // First order succeeds
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
        weightKg: 3,
        paymentToken: t1,
      }),
    });
    const orderRes1 = await ordersPOST(orderReq1);
    expect(orderRes1.status).toBe(201);

    // Second token for a second order (valid token)…
    const payReq2 = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 300 }),
    });
    const payRes2 = await paymentPOST(payReq2);
    expect(payRes2.status).toBe(201);
    const { token: t2 } = await payRes2.json();

    // …but tries to book the SAME slot → should fail 400 with reason "Slot already taken."
    const orderReq2 = new Request("http://local/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        phone: "111",
        address: "Addr 1",
        pickupSlot: pickup, // same slot
        deliverySlot: delivery,
        tier: "MEDIUM",
        weightKg: 3,
        paymentToken: t2,
      }),
    });
    const orderRes2 = await ordersPOST(orderReq2);
    const body2 = await orderRes2.json();

    expect(orderRes2.status).toBe(400);
    expect(body2).toMatchObject({ ok: false });
    // Reason may be returned as `reason: "Slot already taken."`
    if ("reason" in body2) expect(body2.reason).toBe("Slot already taken.");
  });
});

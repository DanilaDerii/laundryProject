import { describe, it, expect, beforeEach } from "vitest";
import { POST as paymentPOST } from "../src/app/api/payment/route";
import { POST as ordersPOST } from "../src/app/api/orders/route";
import { db } from "backend/lib/store";

function isoLocalShort(y: number, m: number, d: number, h: number, min: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
}

describe("/api/orders POST (reused token)", () => {
  beforeEach(() => db.resetForTests());

  it("rejects second use of the same payment token with 402", async () => {
    const user = db.createUser({
      name: "Test User",
      email: "t@test",
      passwordHash: "hash",
      isMember: true, // MEDIUM → 210
    });

    // 1) get token
    const payReq = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 210 }),
    });
    const payRes = await paymentPOST(payReq);
    expect(payRes.status).toBe(201);
    const { token } = await payRes.json();

    // 2) first order (valid)
    const pickup1 = isoLocalShort(2025, 9, 8, 9, 0);
    const delivery = isoLocalShort(2025, 9, 8, 15, 0);
    const orderReq1 = new Request("http://local/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        phone: "111",
        address: "Addr 1",
        pickupSlot: pickup1,
        deliverySlot: delivery,
        tier: "MEDIUM",
        weightKg: 3,
        paymentToken: token,
      }),
    });
    const orderRes1 = await ordersPOST(orderReq1);
    expect(orderRes1.status).toBe(201);

    // 3) second order attempts to reuse the same token → should fail 402
    const pickup2 = isoLocalShort(2025, 9, 8, 9, 15);
    const orderReq2 = new Request("http://local/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        phone: "111",
        address: "Addr 1",
        pickupSlot: pickup2,
        deliverySlot: delivery,
        tier: "MEDIUM",
        weightKg: 3,
        paymentToken: token, // reused
      }),
    });
    const orderRes2 = await ordersPOST(orderReq2);
    const body2 = await orderRes2.json();

    expect(orderRes2.status).toBe(402);
    expect(body2).toMatchObject({
      ok: false,
      error: expect.stringContaining("Payment required or mismatch"),
    });
  });
});

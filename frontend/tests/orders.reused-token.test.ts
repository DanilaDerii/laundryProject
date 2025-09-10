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
    // Member => MEDIUM price 300 * 0.7 = 210
    const user = db.createUser({
      name: "Test User",
      email: "t@test",
      passwordHash: "hash",
      isMember: true,
    });

    // 1) Issue a token for the exact server price (210)
    const payReq = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 210 }),
    });
    const payRes = await paymentPOST(payReq);
    expect(payRes.status).toBe(201);
    const { token } = await payRes.json();

    // 2) First order (valid) — non-Wed, within hours, aligned, weight↔tier consistent
    const pickup1 = isoLocalShort(2025, 9, 8, 9, 0);     // Mon 09:00
    const delivery = isoLocalShort(2025, 9, 8, 15, 45);  // 15:45 < 16:00 close
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
        weightKg: 10, // MEDIUM (5 <=> 15)
        paymentToken: token,
      }),
    });
    const orderRes1 = await ordersPOST(orderReq1);
    const body1 = await orderRes1.json();
    expect(orderRes1.status).toBe(201);
    expect(body1.ok).toBe(true);

    // 3) Second order reusing the same token → should fail 402
    const pickup2 = isoLocalShort(2025, 9, 8, 9, 15); // any other valid slot
    const orderReq2 = new Request("http://local/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        phone: "222",
        address: "Addr 2",
        pickupSlot: pickup2,
        deliverySlot: delivery,
        tier: "MEDIUM",
        weightKg: 10,
        paymentToken: token, // REUSED
      }),
    });
    const orderRes2 = await ordersPOST(orderReq2);
    const body2 = await orderRes2.json();

    expect(orderRes2.status).toBe(402);
    expect(body2.ok).toBe(false);
    expect(String(body2.error)).toContain("Payment required or mismatch");
  });
});

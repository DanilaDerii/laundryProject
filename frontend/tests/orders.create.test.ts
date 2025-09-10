import { describe, it, expect, beforeEach } from "vitest";
import { POST as paymentPOST } from "../src/app/api/payment/route";
import { POST as ordersPOST } from "../src/app/api/orders/route";
import { db } from "backend/lib/store";

// Helper: "YYYY-MM-DDTHH:MM"
function isoLocalShort(y: number, m: number, d: number, h: number, min: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
}

describe("/api/orders POST (happy path)", () => {
  beforeEach(() => db.resetForTests());

  it("creates an order when payment token and slots are valid", async () => {
    // Member user → MEDIUM price 300 * 0.7 = 210
    const user = db.createUser({
      name: "Test User",
      email: "t@test",
      passwordHash: "hash",
      isMember: true,
    });

    // 1) Payment for exact server price
    const payReq = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 210 }),
    });
    const payRes = await paymentPOST(payReq);
    expect(payRes.status).toBe(201);
    const { token } = await payRes.json();

    // 2) Order create — safe business window (Mon), aligned, weight↔tier consistent
    const pickup = isoLocalShort(2025, 9, 8, 9, 0);     // 09:00
    const delivery = isoLocalShort(2025, 9, 8, 15, 45); // 15:45 (< 16:00)
    const orderReq = new Request("http://local/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        phone: "111",
        address: "Addr 1",
        pickupSlot: pickup,
        deliverySlot: delivery,
        tier: "MEDIUM",
        weightKg: 10, // MEDIUM per 5/15 thresholds
        paymentToken: token,
      }),
    });

    const orderRes = await ordersPOST(orderReq);
    const body = await orderRes.json();

    expect(orderRes.status).toBe(201);
    expect(body.ok).toBe(true);

    const o = body.order;
    expect(o.customerId).toBe(user.id);
    expect(o.customerName).toBe("Test User");
    expect(o.tier).toBe("MEDIUM");
    expect(o.price).toBe(210);
    expect(o.paid).toBe(true);
    expect(o.status).toBe("PLACED");

    // Slots: compare instants (robust to string formatting/UTC normalization)
    expect(new Date(o.pickupSlot).getTime()).toBe(new Date(pickup).getTime());
    expect(new Date(o.deliverySlot).getTime()).toBe(new Date(delivery).getTime());

    expect(typeof o.id).toBe("string");
    expect(typeof o.createdAt).toBe("string");
    expect(typeof o.updatedAt).toBe("string");
  });
});

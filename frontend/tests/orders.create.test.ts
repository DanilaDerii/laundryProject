import { describe, it, expect, beforeEach } from "vitest";
import { POST as paymentPOST } from "../src/app/api/payment/route";
import { POST as ordersPOST } from "../src/app/api/orders/route";
import { db } from "backend/lib/store";

// Build the same format the server returns via toIsoLocal: "YYYY-MM-DDTHH:MM"
function isoLocalShort(y: number, m: number, d: number, h: number, min: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
}

describe("/api/orders POST (happy path)", () => {
  beforeEach(() => {
    db.resetForTests();
  });

  it("creates an order when payment token and slot are valid", async () => {
    // Member user → MEDIUM price 300 * 0.7 = 210
    const user = db.createUser({
      name: "Test User",
      email: "t@test",
      passwordHash: "hash",
      isMember: true,
    });

    // 1) Payment
    const payReq = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 210 }),
    });
    const payRes = await paymentPOST(payReq);
    expect(payRes.status).toBe(201);
    const { token } = await payRes.json();

    // 2) Order create (use local-ISO-short to match server normalization)
    const pickup = isoLocalShort(2025, 9, 8, 9, 0);
    const delivery = isoLocalShort(2025, 9, 8, 15, 0);

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
        weightKg: 3,
        paymentToken: token,
      }),
    });

    const orderRes = await ordersPOST(orderReq);
    const body = await orderRes.json();

    expect(orderRes.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.order.customerId).toBe(user.id);
    expect(body.order.customerName).toBe("Test User");
    expect(body.order.tier).toBe("MEDIUM");
    expect(body.order.price).toBe(210);
    expect(body.order.paid).toBe(true);
    expect(body.order.status).toBe("PLACED");

    // Match server's local-ISO-short normalization (no Z, HH:MM only)
    expect(body.order.pickupSlot).toBe(pickup);
    expect(body.order.deliverySlot).toBe(delivery);

    expect(typeof body.order.id).toBe("string");
    expect(typeof body.order.createdAt).toBe("string");
    expect(typeof body.order.updatedAt).toBe("string");
  });
});

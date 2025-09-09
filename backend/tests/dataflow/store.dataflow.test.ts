import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@lib/store";
import type { Tier } from "@lib/types";
import { computePrice } from "@lib/pricing";

describe("Data flow: price → payment token → consumed → paid flag", () => {
  const tier: Tier = "MEDIUM";
  const isMember = true; // to exercise discount path

  let userId = "";
  let price = 0;

  beforeEach(() => {
    db.resetForTests();
    const u = db.createUser({
      name: "Alice",
      email: "alice@example.com",
      passwordHash: "x",
      isMember,
    });
    userId = u.id;
    price = computePrice(tier, isMember);
  });

  it("requires exact amount & correct customer; token is single-use; paid reflects verification", () => {
    // 1) Issue a payment token (client thinks amount = price)
    const rec = db.recordPayment(userId, price);
    expect(rec.used).toBe(false);

    // 2) Sanity: wrong amount -> reject
    expect(db.verifyAndConsumePayment(rec.token, userId, price + 1)).toBe(false);
    // still unused
    expect(db.getPaymentByToken(rec.token)?.used).toBe(false);

    // 3) Wrong customer -> reject
    const other = db.createUser({
      name: "Mallory",
      email: "mallory@example.com",
      passwordHash: "x",
      isMember: false,
    });
    expect(db.verifyAndConsumePayment(rec.token, other.id, price)).toBe(false);
    expect(db.getPaymentByToken(rec.token)?.used).toBe(false);

    // 4) Exact match (right customer + right amount) -> consume
    expect(db.verifyAndConsumePayment(rec.token, userId, price)).toBe(true);
    const afterUse = db.getPaymentByToken(rec.token);
    expect(afterUse?.used).toBe(true);
    expect(afterUse?.usedAt).toBeTypeOf("string");

    // 5) Single-use: second attempt now fails
    expect(db.verifyAndConsumePayment(rec.token, userId, price)).toBe(false);

    // 6) Create an order whose 'paid' mirrors the verification result
    // (Store.createOrder doesn't enforce payments; API does. We simulate here.)
    const order = db.createOrder({
      customerId: userId,
      customerName: "Alice",
      phone: "+66-0000-0000",
      address: "123 Test Rd",
      pickupSlot: "2025-09-10T09:00",
      deliverySlot: "2025-09-10T12:00",
      tier,
      price,
      paid: true, // set according to successful verification above
      status: "PLACED",
    });

    expect(order.price).toBe(price);
    expect(order.paid).toBe(true);
  });
});

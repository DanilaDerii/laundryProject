import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@lib/store";

describe("store payments", () => {
  beforeEach(() => {
    db.resetForTests();
  });

  it("records a payment and retrieves it by token", () => {
    const rec = db.recordPayment("c1", 300);
    expect(rec.token).toMatch(/^pay_/);
    expect(rec.used).toBe(false);

    const found = db.getPaymentByToken(rec.token);
    expect(found).toBeDefined();
    expect(found?.customerId).toBe("c1");
    expect(found?.amount).toBe(300);
  });

  it("verifies and consumes a valid payment once", () => {
    const rec = db.recordPayment("c1", 200);

    const firstTry = db.verifyAndConsumePayment(rec.token, "c1", 200);
    expect(firstTry).toBe(true);

    // After first use, should be marked used
    const again = db.verifyAndConsumePayment(rec.token, "c1", 200);
    expect(again).toBe(false);

    const fetched = db.getPaymentByToken(rec.token);
    expect(fetched?.used).toBe(true);
    expect(fetched?.usedAt).toBeTruthy();
  });

  it("rejects payment if customer or amount do not match", () => {
    const rec = db.recordPayment("c1", 200);

    const wrongCustomer = db.verifyAndConsumePayment(rec.token, "c2", 200);
    expect(wrongCustomer).toBe(false);

    const wrongAmount = db.verifyAndConsumePayment(rec.token, "c1", 999);
    expect(wrongAmount).toBe(false);

    // Should still be unused at this point
    const fetched = db.getPaymentByToken(rec.token);
    expect(fetched?.used).toBe(false);
  });
});

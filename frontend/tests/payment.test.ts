import { describe, it, expect, beforeEach } from "vitest";
import { POST as paymentPOST } from "../src/app/api/payment/route";
import { db } from "backend/lib/store";

describe("/api/payment", () => {
  beforeEach(() => {
    db.resetForTests();
  });

  it("returns a one-time token and amount for a valid customer + amount", async () => {
    const user = db.createUser({
      name: "Test User",
      email: "t@test",
      passwordHash: "hash",
      isMember: true, // MEDIUM 300 * 0.7 = 210
    });

    const req = new Request("http://local/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: user.id, amount: 210 }),
    });

    const res = await paymentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201); // created
    expect(body).toMatchObject({ ok: true, amount: 210 });
    expect(typeof body.token).toBe("string");
    expect(body.token.startsWith("pay_")).toBe(true);
  });
});

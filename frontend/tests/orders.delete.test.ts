import { describe, it, expect, beforeEach } from "vitest";
import { DELETE as deleteOrder } from "../src/app/api/orders/[id]/route";
import { db } from "backend/lib/store";

// server checks "now" vs pickupSlot, so pick far future/past
const isoLocalShort = (y: number, m: number, d: number, h: number, min: number) =>
  `${String(y)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

function makeOrder(pickup: string) {
  const u = db.createUser({ name: "U", email: "u@test", passwordHash: "x", isMember: false });
  return db.createOrder({
    customerId: u.id,
    customerName: u.name,
    phone: "111",
    address: "Addr",
    tier: "SMALL",
    weightKg: 1,
    pickupSlot: pickup,
    deliverySlot: isoLocalShort(2099, 1, 1, 15, 0),
    price: 200,
    paid: true,
    status: "PLACED",
  });
}

describe("/api/orders/[id] DELETE", () => {
  beforeEach(() => db.resetForTests());

  it("allows cancel before pickup start (future pickup)", async () => {
    const o = makeOrder(isoLocalShort(2099, 1, 1, 9, 0));

    const req = new Request(`http://local/api/orders/${o.id}`, { method: "DELETE" });
    const res = await deleteOrder(req, { params: { id: o.id } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(db.getOrder(o.id)).toBeUndefined();
  });

  it("blocks cancel after pickup start (past pickup)", async () => {
    const o = makeOrder(isoLocalShort(2000, 1, 1, 9, 0)); // long past

    const req = new Request(`http://local/api/orders/${o.id}`, { method: "DELETE" });
    const res = await deleteOrder(req, { params: { id: o.id } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(String(body.error)).toContain("Cancellation not allowed");
    expect(db.getOrder(o.id)).toBeDefined();
  });
});

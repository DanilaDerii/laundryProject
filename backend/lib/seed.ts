// backend/lib/seed.ts
// Seeds one demo user and one demo order for testing

import { db } from "./store";
import type { Tier } from "./types";

// ---- Pricing rules ----
export const TIER_RATES: Record<Tier, number> = {
  SMALL: 200,
  MEDIUM: 300,
  LARGE: 400,
};

function computePrice(tier: Tier, isMember: boolean): number {
  const base = TIER_RATES[tier];
  return isMember ? Math.round(base * 0.7) : base;
}

// ---- Seed only if empty ----
(function seed() {
  if (db.listUsers().length || db.listOrders().length) return;

  const demoUser = db.createUser({
    name: "Demo Customer",
    email: "demo@example.com",
    passwordHash: "demo:hash", // placeholder
    isMember: true,
  });

  // simple helper for slot times
  function slotAtOffsetMinutes(offset: number): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() + offset, 0, 0);
    return d.toISOString();
  }

  const pickup = slotAtOffsetMinutes(60);       // +1h
  const delivery = slotAtOffsetMinutes(60 * 6); // +6h
  const tier: Tier = "MEDIUM";

  db.createOrder({
    customerId: demoUser.id,
    customerName: demoUser.name,
    phone: "+66-0000-0000",
    address: "123 Test Rd, Bangkok",
    pickupSlot: pickup,
    deliverySlot: delivery,
    weightKg: undefined,
    tier,
    price: computePrice(tier, demoUser.isMember),
    paid: true,
    status: "PLACED",
  });
})();

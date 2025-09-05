// backend/lib/seed.ts
// Idempotent seeding using your existing store API.

import { db as defaultDb } from "./store";
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

// Helper: ISO time offset from now (minutes)
function slotAtOffsetMinutes(offset: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offset, 0, 0);
  return d.toISOString();
}

/**
 * Seed one demo user and one demo order if missing.
 * Safe to call multiple times.
 */
export function seed(db = defaultDb) {
  try {
    const users = db.listUsers?.() ?? [];
    const orders = db.listOrders?.() ?? [];

    // Ensure demo user exists
    const email = "demo@example.com";
    let demo = users.find((u: any) => u.email === email);
    if (!demo) {
      demo = db.createUser({
        name: "Demo Customer",
        email,
        passwordHash: "demo:hash", // placeholder
        isMember: true,
      });
    }

    // Ensure at least one order exists
    if (orders.length === 0) {
      const pickup = slotAtOffsetMinutes(60);       // +1h
      const delivery = slotAtOffsetMinutes(60 * 6); // +6h
      const tier: Tier = "MEDIUM";

      db.createOrder({
        customerId: demo.id,
        customerName: demo.name,
        phone: "+66-0000-0000",
        address: "123 Test Rd, Bangkok",
        pickupSlot: pickup,
        deliverySlot: delivery,
        weightKg: undefined,
        tier,
        price: computePrice(tier, demo.isMember),
        paid: true,
        status: "PLACED",
      });
    }
  } catch {
    // swallow seeding errors in dev
  }
}

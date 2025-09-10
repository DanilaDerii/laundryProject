// backend/lib/seed.ts
// Idempotent seeding using your existing store API.

import { db as defaultDb } from "./store";
import type { Tier, ISODateTime } from "./types";
import { computePrice } from "./pricing";

// Helper: ISO time offset from now (minutes), zero seconds/ms for stability
function slotAtOffsetMinutes(offset: number): ISODateTime {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offset);
  d.setSeconds(0, 0);
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
        passwordHash: "demo:hash", // placeholder only
        isMember: true,            // <- membership lives on User
      });
    }

    // Ensure at least one order exists
    if (orders.length === 0) {
      const pickup = slotAtOffsetMinutes(60);       // +1h
      const delivery = slotAtOffsetMinutes(60 * 6); // +6h
      const tier: Tier = "MEDIUM";

      db.createOrder({
        customerId: demo.id,
        customerName: demo.name, // backend enforces consistency later
        phone: "+66-0000-0000",
        address: "123 Test Rd, Bangkok",
        pickupSlot: pickup,
        deliverySlot: delivery,
        weightKg: undefined,
        tier,
        price: computePrice(tier, demo.isMember),
        paid: true,              // seed an already-paid order
        status: "PLACED",
      });
    }
  } catch {
    // swallow seeding errors in dev
  }
}

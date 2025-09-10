// backend/lib/pricing.ts
import type { Tier } from "./types";

// Base rates for each tier
export const TIER_RATES: Record<Tier, number> = {
  SMALL: 200,
  MEDIUM: 300,
  LARGE: 400,
};

// ---- Surcharges / Discounts helpers (A) ----
export type PriceOptions = {
  express?: boolean;     // +50 THB if true
  distanceKm?: number;   // +0 / +20 / +40 bands (<=5 / <=15 / >15)
  promoCode?: string;    // "PROMO10" => -10 THB flat
};

export function computeSurcharges(opts: PriceOptions = {}): number {
  let s = 0;
  if (opts.express) s += 50;
  if (typeof opts.distanceKm === "number") {
    if (opts.distanceKm > 15) s += 40;
    else if (opts.distanceKm > 5) s += 20;
  }
  return s;
}

export function computeDiscounts(opts: PriceOptions = {}): number {
  let d = 0;
  if (opts.promoCode && opts.promoCode.toUpperCase() === "PROMO10") d += 10;
  return d;
}

// Compute price with membership discount (30%) and optional surcharges/promo.
// Backward-compatible: callers can still do computePrice(tier, isMember)
export function computePrice(
  tier: Tier,
  isMember: boolean,
  opts: PriceOptions = {}
): number {
  const base = TIER_RATES[tier];
  const memberBase = isMember ? Math.round(base * 0.7) : base;
  const surcharges = computeSurcharges(opts);
  const promoDiscounts = computeDiscounts(opts);
  return Math.max(0, memberBase + surcharges - promoDiscounts);
}

// Derive tier from weight using proposal thresholds (≤5, ≤15, >15)
export function tierForWeight(weightKg: number): Tier {
  if (weightKg <= 5) return "SMALL";
  if (weightKg <= 15) return "MEDIUM";
  return "LARGE";
}

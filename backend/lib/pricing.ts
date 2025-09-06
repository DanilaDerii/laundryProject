// backend/lib/pricing.ts
import type { Tier } from "./types";

// Base rates for each tier
export const TIER_RATES: Record<Tier, number> = {
  SMALL: 200,
  MEDIUM: 300,
  LARGE: 400,
};

// Compute price, applying membership discount (30%)
export function computePrice(tier: Tier, isMember: boolean): number {
  const base = TIER_RATES[tier];
  return isMember ? Math.round(base * 0.7) : base;
}

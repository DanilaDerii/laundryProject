import { describe, it, expect } from "vitest";
import { computePrice } from "@lib/pricing";

describe("pricing", () => {
  it("charges base price for non-members, no surcharges/discounts", () => {
    expect(computePrice("SMALL", false)).toBe(200);
    expect(computePrice("MEDIUM", false)).toBe(300);
    expect(computePrice("LARGE", false)).toBe(400);
  });

  it("applies 30% discount for members", () => {
    expect(computePrice("SMALL", true)).toBe(140); // 200 * 0.7
    expect(computePrice("MEDIUM", true)).toBe(210); // 300 * 0.7
    expect(computePrice("LARGE", true)).toBe(280); // 400 * 0.7
  });

  it("adds express surcharge", () => {
    expect(computePrice("MEDIUM", true, { express: true })).toBe(260); // 210 + 50
  });

  it("adds distance surcharge at >5km and >15km", () => {
    expect(computePrice("MEDIUM", true, { distanceKm: 8 })).toBe(230);  // 210 + 20
    expect(computePrice("MEDIUM", true, { distanceKm: 20 })).toBe(250); // 210 + 40
  });

  it("applies promo code discount", () => {
    expect(computePrice("MEDIUM", true, { promoCode: "PROMO10" })).toBe(200); // 210 - 10
  });

  it("combines surcharges and promo", () => {
    const price = computePrice("MEDIUM", true, {
      express: true,
      distanceKm: 20,
      promoCode: "PROMO10",
    });
    expect(price).toBe(290); // 210 + 50 + 40 - 10
  });
});

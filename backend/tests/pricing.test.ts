import { describe, it, expect } from "vitest";
import { computePrice } from "../lib/pricing";

// Group of tests
describe("pricing", () => {
  it("charges base price for non-members", () => {
    expect(computePrice("SMALL", false)).toBe(200);
    expect(computePrice("MEDIUM", false)).toBe(300);
    expect(computePrice("LARGE", false)).toBe(400);
  });

  it("applies 30% discount for members", () => {
    expect(computePrice("SMALL", true)).toBe(140);
    expect(computePrice("MEDIUM", true)).toBe(210);
    expect(computePrice("LARGE", true)).toBe(280);
  });
});

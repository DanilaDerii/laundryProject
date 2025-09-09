import { describe, it, expect } from "vitest";
import { GET } from "../src/app/api/health/route";

describe("/api/health", () => {
  it("returns ok: true (and optional ts)", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json).toMatchObject({ ok: true });
    if ("ts" in json) expect(typeof json.ts).toBe("number");
  });
});

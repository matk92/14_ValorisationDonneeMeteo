import { describe, it, expect } from "vitest";

describe("example", () => {
  it("fails on purpose to verify CI catches broken tests", () => {
    // This assertion is intentionally wrong: 1 !== 2
    expect(1).toBe(2);
  });
});
import { describe, expect, it } from "vitest";
import { pythonRound, pythonSum, roundTo } from "../src/round";

// Expected values are Python's documented round() behavior: half to even.
describe("pythonRound", () => {
  it("rounds .5 ties to the even neighbor", () => {
    expect(pythonRound(0.5)).toBe(0);
    expect(pythonRound(1.5)).toBe(2);
    expect(pythonRound(2.5)).toBe(2);
    expect(pythonRound(3.5)).toBe(4);
    expect(pythonRound(4.5)).toBe(4);
  });

  it("matches Math.round away from ties", () => {
    expect(pythonRound(2.4)).toBe(2);
    expect(pythonRound(2.6)).toBe(3);
    expect(pythonRound(7)).toBe(7);
  });

  it("handles negatives the way Python does", () => {
    expect(pythonRound(-2.5)).toBe(-2);
    expect(pythonRound(-3.5)).toBe(-4);
    expect(pythonRound(-2.4)).toBe(-2);
    expect(pythonRound(-2.6)).toBe(-3);
  });

  it("agrees with Python on the interval products the scheduler hits", () => {
    // 2 * 1.25 = 2.5 — the partial-growth tie the design calls out.
    expect(pythonRound(2 * 1.25)).toBe(2);
    // 10 * 2.5 ease
    expect(pythonRound(10 * 2.5)).toBe(25);
  });
});

describe("pythonSum", () => {
  it("matches CPython 3.12's compensated float sum", () => {
    // Naive left-to-right reduce gives 2.6500000000000004 here.
    expect(pythonSum([0.4, 0.45, 0.4, 0.35, 0.3, 0.3, 0.25, 0.2])).toBe(2.65);
    expect(pythonSum([])).toBe(0);
  });
});

describe("roundTo", () => {
  it("serializes ease to 3 decimals like round(x, 3)", () => {
    expect(roundTo(2.4499999999999997, 3)).toBe(2.45);
    expect(roundTo(2.5999999999999996, 3)).toBe(2.6);
    expect(roundTo(1.3, 3)).toBe(1.3);
  });
});

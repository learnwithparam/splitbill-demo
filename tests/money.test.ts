import { describe, expect, test } from "bun:test";
import { formatCents, parseCents, splitCents, sumCents } from "../src/money/cents.ts";

describe("formatCents", () => {
  test("formats whole and fractional cents", () => {
    expect(formatCents(1000)).toBe("10.00");
    expect(formatCents(1005)).toBe("10.05");
    expect(formatCents(5)).toBe("0.05");
  });

  test("formats negative cents with a leading minus", () => {
    expect(formatCents(-250)).toBe("-2.50");
  });
});

describe("parseCents", () => {
  test("parses decimal strings into integer cents", () => {
    expect(parseCents("10.00")).toBe(1000);
    expect(parseCents("10.5")).toBe(1050);
    expect(parseCents("3")).toBe(300);
  });

  test("throws on invalid input", () => {
    expect(() => parseCents("abc")).toThrow();
  });
});

describe("splitCents", () => {
  test("splits an amount evenly among members", () => {
    const shares = splitCents(900, ["a", "b", "c"]);
    expect(shares).toEqual({ a: 300, b: 300, c: 300 });
    expect(sumCents(Object.values(shares))).toBe(900);
  });

  test("splits an amount evenly between two members", () => {
    const shares = splitCents(2000, ["a", "b"]);
    expect(sumCents(Object.values(shares))).toBe(2000);
  });

  test("gives leftover cents to the first members", () => {
    expect(splitCents(1000, ["a", "b", "c"])).toEqual({ a: 334, b: 333, c: 333 });
  });

  test("shares always sum to the total for uneven splits", () => {
    const cases: Array<[number, string[]]> = [
      [1000, ["a", "b", "c"]],
      [101, ["a", "b", "c", "d", "e"]],
      [1, ["a", "b", "c"]],
      [2, ["a", "b", "c"]],
    ];
    for (const [total, members] of cases) {
      const values = Object.values(splitCents(total, members));
      expect(sumCents(values)).toBe(total);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
      expect(values.every(Number.isInteger)).toBe(true);
    }
  });

  test("throws when splitting among zero members", () => {
    expect(() => splitCents(1000, [])).toThrow("cannot split among zero members");
  });
});

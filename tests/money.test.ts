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

  test("gives the leftover cent to the first member", () => {
    const shares = splitCents(1000, ["a", "b", "c"]);
    expect(shares).toEqual({ a: 334, b: 333, c: 333 });
    expect(sumCents(Object.values(shares))).toBe(1000);
  });

  test("shares always sum to the total", () => {
    expect(splitCents(1003, ["a", "b", "c", "d"])).toEqual({ a: 251, b: 251, c: 251, d: 250 });

    const cases: [number, string[]][] = [
      [1, ["a", "b"]],
      [2, ["a", "b", "c"]],
      [1000, ["a", "b", "c"]],
      [1001, ["a", "b", "c"]],
      [1003, ["a", "b", "c", "d"]],
      [9999, ["a", "b", "c", "d", "e", "f", "g"]],
    ];
    for (const [total, members] of cases) {
      expect(sumCents(Object.values(splitCents(total, members)))).toBe(total);
    }
  });
});

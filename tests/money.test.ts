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

  test("gives the remainder cent to the first member (1000 / 3)", () => {
    const shares = splitCents(1000, ["a", "b", "c"]);
    expect(shares).toEqual({ a: 334, b: 333, c: 333 });
    expect(sumCents(Object.values(shares))).toBe(1000);
  });

  test("distributes multi-cent remainders in input order and sums to the total", () => {
    const fiveWay = splitCents(101, ["a", "b", "c", "d", "e"]);
    expect(fiveWay).toEqual({ a: 21, b: 20, c: 20, d: 20, e: 20 });
    expect(sumCents(Object.values(fiveWay))).toBe(101);

    const threeWay = splitCents(1001, ["a", "b", "c"]);
    expect(threeWay).toEqual({ a: 334, b: 334, c: 333 });
    expect(sumCents(Object.values(threeWay))).toBe(1001);
  });

  test("throws on zero members", () => {
    expect(() => splitCents(1000, [])).toThrow();
  });
});

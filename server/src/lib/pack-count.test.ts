// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Pack-count suggestions (INT-MF-0004): the acceptance-criteria
// ABOUTME: examples, same-family conversion, rounding up, and every route to
// ABOUTME: manual review.
import { describe, expect, it } from "vitest";
import { parseProductSize, suggestPacks } from "./pack-count.js";

const q = (quantity: number | null, unit: string | null) => ({ quantity, unit });

describe("parseProductSize", () => {
  it("reads the common Kroger size formats", () => {
    expect(parseProductSize("3 lb")).toEqual({ amount: 3, unit: "lb" });
    expect(parseProductSize("12 fl oz")).toEqual({ amount: 12, unit: "fl oz" });
    expect(parseProductSize("14.5 oz")).toEqual({ amount: 14.5, unit: "oz" });
    expect(parseProductSize("1/2 gal")).toEqual({ amount: 0.5, unit: "gallon" });
    expect(parseProductSize("1 1/2 lb")).toEqual({ amount: 1.5, unit: "lb" });
    expect(parseProductSize("16OZ")).toEqual({ amount: 16, unit: "oz" });
    expect(parseProductSize("2 x 8 oz")).toEqual({ amount: 16, unit: "oz" });
  });

  it("reads counts as unitless", () => {
    expect(parseProductSize("6 ct")).toEqual({ amount: 6, unit: null });
    expect(parseProductSize("1 each")).toEqual({ amount: 1, unit: null });
  });

  it("returns null for sizes it can't read", () => {
    expect(parseProductSize(null)).toBeNull();
    expect(parseProductSize("")).toBeNull();
    expect(parseProductSize("family size")).toBeNull();
    expect(parseProductSize("0 oz")).toBeNull();
  });
});

describe("suggestPacks", () => {
  it("3.5 lb needed with a 3 lb pack suggests 2", () => {
    expect(suggestPacks([q(3.5, "lb")], "3 lb")).toEqual({
      status: "suggested",
      packs: 2,
      needed: "3.5 lb",
      perPack: "3 lb",
    });
  });

  it("28 oz needed with a 14.5 oz can suggests 2", () => {
    expect(suggestPacks([q(28, "oz")], "14.5 oz")).toMatchObject({ status: "suggested", packs: 2 });
  });

  it("converts within weight and shows the need in the pack's unit", () => {
    expect(suggestPacks([q(24, "oz")], "1 lb")).toEqual({
      status: "suggested",
      packs: 2,
      needed: "1.5 lb",
      perPack: "1 lb",
    });
  });

  it("converts within volume", () => {
    expect(suggestPacks([q(2, "cup")], "12 fl oz")).toMatchObject({ status: "suggested", packs: 2, needed: "16 fl oz" });
    expect(suggestPacks([q(3, "tbsp")], "2 fl oz")).toMatchObject({ status: "suggested", packs: 1 });
  });

  it("divides counts by counts", () => {
    expect(suggestPacks([q(8, null)], "6 ct")).toMatchObject({ status: "suggested", packs: 2, needed: "8", perPack: "6" });
    expect(suggestPacks([q(3, "piece")], "1 each")).toMatchObject({ status: "suggested", packs: 3 });
  });

  it("always rounds up, and an exact fit isn't pushed over by float noise", () => {
    expect(suggestPacks([q(3.01, "lb")], "3 lb")).toMatchObject({ packs: 2 });
    expect(suggestPacks([q(48, "oz")], "3 lb")).toMatchObject({ packs: 1 });
    expect(suggestPacks([q(0.1, "lb")], "3 lb")).toMatchObject({ packs: 1 });
  });

  it("sends volume against weight to manual review (3 cups of cheese, 8 oz bag)", () => {
    expect(suggestPacks([q(3, "cup")], "8 oz")).toEqual({
      status: "manual",
      reason:
        "Recipe needs 3 cup, pack is 8 oz. Can't convert volume to weight automatically. Set the quantity yourself.",
    });
  });

  it("sends weight against volume to manual review", () => {
    expect(suggestPacks([q(1, "lb")], "16 fl oz")).toMatchObject({
      status: "manual",
      reason: expect.stringContaining("Can't convert weight to volume automatically."),
    });
  });

  it("sends counts against packs sold by weight or volume to manual review (3 onions, 3 lb bag)", () => {
    expect(suggestPacks([q(3, null)], "3 lb")).toMatchObject({
      status: "manual",
      reason: expect.stringContaining("Can't convert a count to weight automatically."),
    });
    expect(suggestPacks([q(2, null)], "64 fl oz")).toMatchObject({ status: "manual" });
  });

  it("sends cloves against bulbs to manual review", () => {
    expect(suggestPacks([q(4, "clove")], "1 bulb")).toMatchObject({
      status: "manual",
      reason: expect.stringContaining("Can't convert clove to bulb automatically."),
    });
  });

  it("matches the same named unit on both sides", () => {
    expect(suggestPacks([q(3, "bunch")], "1 bunch")).toMatchObject({ status: "suggested", packs: 3 });
  });

  it("sends product sizes that can't be read to manual review", () => {
    expect(suggestPacks([q(2, "lb")], "family size")).toMatchObject({
      status: "manual",
      reason: 'Recipe needs 2 lb. Can\'t read the pack size "family size". Set the quantity yourself.',
    });
    expect(suggestPacks([q(2, "lb")], null)).toMatchObject({
      status: "manual",
      reason: expect.stringContaining("Fry’s doesn’t list a pack size."),
    });
  });

  it("sends a recipe line with no amount to manual review instead of guessing", () => {
    expect(suggestPacks([q(null, null)], "1 lb")).toMatchObject({
      status: "manual",
      reason: expect.stringContaining("The recipe doesn't give an amount"),
    });
    expect(suggestPacks([], "1 lb")).toMatchObject({ status: "manual" });
  });

  it("sends mixed unit groups to manual review when any group can't convert", () => {
    expect(suggestPacks([q(1, "lb"), q(2, "cup")], "1 lb")).toMatchObject({
      status: "manual",
      reason: expect.stringContaining("Recipe needs 1 lb + 2 cup"),
    });
  });

  it("adds count groups that use different count words", () => {
    expect(suggestPacks([q(2, null), q(3, "piece")], "6 ct")).toMatchObject({ status: "suggested", packs: 1, needed: "5" });
  });
});

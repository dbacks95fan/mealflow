// ABOUTME: Evidence for INT-MF-0002: reads the design tokens straight from
// ABOUTME: index.css and checks every text and control color pair against WCAG 2.x AA in light and dark modes.
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../index.css"), "utf8");

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--mf-[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const lightBlock = css.match(/^:root\s*\{([\s\S]*?)^\}/m)?.[1] ?? "";
const darkBlock = css.match(/prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([\s\S]*?)\}/)?.[1] ?? "";
const light = declarations(lightBlock);
const dark = { ...light, ...declarations(darkBlock) };

function resolveColor(tokens: Record<string, string>, name: string, depth = 0): string {
  const raw = tokens[name];
  if (!raw) throw new Error(`Token ${name} is not defined`);
  const ref = raw.match(/^var\((--mf-[\w-]+)\)$/);
  if (ref) {
    if (depth > 10) throw new Error(`Token ${name} has a circular reference`);
    return resolveColor(tokens, ref[1], depth + 1);
  }
  if (!/^#[0-9a-f]{6}$/i.test(raw)) throw new Error(`Token ${name} is not a 6-digit hex color: ${raw}`);
  return raw;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5; // WCAG 1.4.3, normal text
const NON_TEXT = 3; // WCAG 1.4.11, UI component states

// [foreground, background, required ratio]
const PAIRS: Array<[string, string, number]> = [
  ...["--mf-bg", "--mf-surface", "--mf-surface-2"].flatMap((bg): Array<[string, string, number]> => [
    ["--mf-text", bg, TEXT],
    ["--mf-muted", bg, TEXT],
    ["--mf-accent", bg, TEXT],
    ["--mf-primary-text", bg, TEXT],
    ["--mf-control-off", bg, NON_TEXT],
    ["--mf-control-on", bg, NON_TEXT],
  ]),
  ["--mf-on-primary", "--mf-primary", TEXT],
  ["--mf-on-primary", "--mf-primary-hover", TEXT],
  ["--mf-on-selected", "--mf-selected", TEXT],
  ["--mf-tag-text", "--mf-tag-bg", TEXT],
  ["--mf-info-text", "--mf-info-bg", TEXT],
  ["--mf-warn-text", "--mf-warn-bg", TEXT],
  ["--mf-warn-text", "--mf-surface", TEXT], // "Needs manual review" in the product list  ["--mf-error-text", "--mf-error-bg", TEXT],
  ["--mf-error-text", "--mf-surface", TEXT],
  ["--mf-text", "--mf-error-bg", TEXT],
  ["--mf-primary-text", "--mf-error-bg", TEXT],
  ["--mf-focus", "--mf-bg", NON_TEXT],
  ["--mf-focus", "--mf-surface", NON_TEXT],
];

describe("design tokens", () => {
  it("parses both the light and dark token sets", () => {
    expect(Object.keys(light).length).toBeGreaterThan(20);
    expect(Object.keys(declarations(darkBlock)).length).toBeGreaterThan(5);
  });

  it("keeps the Diamondbacks palette", () => {
    expect(light["--mf-red"]).toBe("#a71930");
    expect(light["--mf-sand"]).toBe("#e3d4ad");
    expect(light["--mf-teal"]).toBe("#30ced8");
    expect(light["--mf-ink"]).toBe("#1a1a1a");
  });

  it("defines the shared scales", () => {
    for (const t of ["--mf-text-sm", "--mf-text-2xl", "--mf-space-1", "--mf-space-8", "--mf-radius-lg", "--mf-touch"]) {
      expect(light[t], t).toBeDefined();
    }
    expect(light["--mf-touch"]).toBe("44px");
  });

  for (const [mode, tokens] of [["light", light], ["dark", dark]] as const) {
    describe(`${mode} mode`, () => {
      it.each(PAIRS)("%s on %s meets %s:1", (fg, bg, min) => {
        const ratio = contrast(resolveColor(tokens, fg), resolveColor(tokens, bg));
        expect(ratio, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
      });
    });
  }
});

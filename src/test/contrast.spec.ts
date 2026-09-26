import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The contrast gate. Every pair declared in the semantic token file's
 * `$extensions['com.bighat.contrast']` block is resolved from the built
 * artefact in both themes and held to its WCAG threshold, so an illegible
 * pairing fails `npm test` rather than shipping.
 */
const ROOT = resolve(import.meta.dirname, '../..');

type Contrast = {
  thresholds: Record<string, number>;
  pairs: Array<[foreground: string, background: string, requirement: string]>;
};

const semantic = JSON.parse(readFileSync(resolve(ROOT, 'tokens/semantic.tokens.json'), 'utf8'));
const contrast = semantic.$extensions['com.bighat.contrast'] as Contrast;
const tokens = JSON.parse(readFileSync(resolve(ROOT, 'dist/tokens.flat.json'), 'utf8')).tokens as Record<
  string,
  { light: string; dark: string }
>;

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Contrast pairs must resolve to opaque hex colours, got ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const s = parseInt(match[1].slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('contrast pairs', () => {
  for (const theme of ['light', 'dark'] as const) {
    describe(theme, () => {
      for (const [fg, bg, requirement] of contrast.pairs) {
        const min = contrast.thresholds[requirement];
        it(`${fg} on ${bg} meets ${requirement} (${min}:1)`, () => {
          expect(tokens[fg], `${fg} is not a built token`).toBeDefined();
          expect(tokens[bg], `${bg} is not a built token`).toBeDefined();
          expect(min, `unknown requirement ${requirement}`).toBeDefined();
          const measured = ratio(tokens[fg][theme], tokens[bg][theme]);
          expect(measured, `${fg} on ${bg} (${theme}) is ${measured.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
        });
      }
    });
  }
});

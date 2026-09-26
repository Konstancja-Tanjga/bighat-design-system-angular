/**
 * Rewrites the mechanical half of DRIFT-REPORT.md.
 *
 * Only touches declarations where the literal already equals a semantic token's
 * value, so nothing renders differently afterwards — the diff is large and the
 * screenshot is identical. That is the whole safety argument, and it is why
 * this is a separate script from the off-scale decisions, which change pixels
 * and need a human.
 *
 *   node scripts/codemod-tokens.mjs <src> --dry     list every edit
 *   node scripts/codemod-tokens.mjs <src>           apply
 *
 * Deliberately not handled, because each needs a judgement:
 *   off-scale values   12px, 18px, 700, 6px — snap or add a role
 *   no-role values     32px, 48px — name the role first, then re-run
 *   easing keywords    `ease` is not cubic-bezier(0.2,0,0,1); mapping them is
 *                      a design decision about how the system moves
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [target, ...flags] = process.argv.slice(2);
const SRC = resolve(target ?? '../ui-react/src');
const DRY = flags.includes('--dry');

const { tokens } = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../dist/tokens.flat.json'), 'utf8'),
);

const cssVar = (path) =>
  `--bh-${path.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().split('.').join('-')}`;

/**
 * value → var name, for one token group. First declaration wins, so the order
 * of the group in semantic.tokens.json decides which role a shared value maps
 * to: textSize.body and textSize.dense both resolve to distinct values, but if
 * two roles ever collide the earlier one is the more general and the right pick.
 */
function lookup(prefix) {
  const map = new Map();
  for (const [path, token] of Object.entries(tokens)) {
    if (!path.startsWith(`${prefix}.`)) continue;
    if (!map.has(token.light)) map.set(token.light, cssVar(path));
  }
  return map;
}

const properties = [
  { match: /font-size/, values: lookup('textSize') },
  { match: /font-weight/, values: lookup('textWeight') },
  { match: /z-index/, values: lookup('layer') },
  {
    match: /padding|padding-\w+|margin|margin-\w+|gap|row-gap|column-gap/,
    values: new Map([...lookup('gap'), ...lookup('padding')]),
    shorthand: true,
    negatable: true,
  },
  {
    match: /border-radius|border-\w+-radius/,
    values: lookup('radius'),
    shorthand: true,
  },
  {
    match: /inset|inset-inline|inset-block|top|right|bottom|left/,
    values: new Map([...lookup('gap'), ...lookup('padding')]),
    shorthand: true,
    negatable: true,
  },
  {
    match: /transition|transition-duration|animation|animation-duration/,
    values: lookup('duration'),
    shorthand: true,
  },
];

function stylesheets(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(path);
    if (entry.name === 'tokens.css') return [];
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

let edits = 0;
let touched = 0;

for (const file of stylesheets(SRC)) {
  const original = readFileSync(file, 'utf8');
  const lines = original.split('\n');
  const changes = [];

  const next = lines.map((line, index) => {
    if (line.includes('!important')) return line; // reduced-motion override
    const declaration = line.match(/^(\s*)([a-z-]+)(\s*:\s*)([^;]+);(.*)$/);
    if (!declaration) return line;
    const [, indent, property, colon, value, trailing] = declaration;

    const rule = properties.find((p) => new RegExp(`^(?:${p.match.source})$`).test(property));
    if (!rule) return line;

    const rewritten = value
      .split(/(\s+)/)
      .map((part) => {
        if (!part.trim() || part.startsWith('var(') || part.includes('calc(')) return part;
        if (rule.values.has(part)) return `var(${rule.values.get(part)})`;
        if (rule.negatable && part.startsWith('-') && rule.values.has(part.slice(1))) {
          return `calc(-1 * var(${rule.values.get(part.slice(1))}))`;
        }
        return part;
      })
      .join('');

    if (rewritten === value) return line;
    if (!rule.shorthand && rewritten.split(/\s+/).length > 1 && value.split(/\s+/).length === 1) {
      return line;
    }

    changes.push(`  ${index + 1}: ${property}: ${value}  →  ${rewritten}`);
    edits += 1;
    return `${indent}${property}${colon}${rewritten};${trailing}`;
  });

  if (!changes.length) continue;
  touched += 1;
  console.log(`${file.slice(SRC.length + 1)}`);
  console.log(changes.join('\n'));
  if (!DRY) writeFileSync(file, next.join('\n'));
}

console.log(
  `\n${DRY ? 'Would rewrite' : 'Rewrote'} ${edits} declaration${edits === 1 ? '' : 's'} in ` +
    `${touched} file${touched === 1 ? '' : 's'}.` +
    (DRY ? '' : '\nRun the visual tests: nothing here should change a pixel.'),
);

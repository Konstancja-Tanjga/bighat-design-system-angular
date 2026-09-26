/**
 * The same rules as src/drift.test.ts, run as a report instead of a gate.
 *
 * Two failures wear one coat here, and they cost very different amounts to fix:
 *
 *   off-scale   the value is not on the scale at all. Someone has to decide:
 *               snap it to the nearest role, or argue the system needs a new
 *               one and write that argument in DS-GAPS.md.
 *   unlinked    the value is already correct, but written as a literal, so a
 *               theme switch or a rebrand will miss it. Mechanical —
 *               scripts/codemod-tokens.mjs rewrites these.
 *   negated     a token value with a minus sign. Legal intent, illegal form:
 *               use calc(-1 * var(--bh-…)).
 *
 * Reporting them as one number is how they accumulate: the list looks too long
 * to start on when four fifths of it is a find-and-replace.
 *
 *   node scripts/audit-drift.mjs <path-to-component-src> [> DRIFT-REPORT.md]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SRC = resolve(process.argv[2] ?? 'src/styles');
const { tokens } = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../dist/tokens.flat.json'), 'utf8'),
);

const group = (prefix) =>
  new Set(
    Object.entries(tokens)
      .filter(([path]) => path.startsWith(`${prefix}.`))
      .flatMap(([, v]) => [v.light, v.dark]),
  );

/** path → value, for suggesting the var() name in the report. */
const named = (prefix) =>
  Object.entries(tokens)
    .filter(([path]) => path.startsWith(`${prefix}.`))
    .map(([path, v]) => [v.light, `--bh-${path.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().split('.').join('-')}`]);

function stylesheets(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(path);
    if (entry.name === 'tokens.css') return [];
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

function declarations(css, property) {
  return css.split('\n').flatMap((text, index) => {
    const match = text.match(new RegExp(`^\\s*(?:${property})\\s*:\\s*([^;]+);`));
    if (!match) return [];
    const value = match[1].trim();
    if (['inherit', 'unset', 'initial', 'revert'].includes(value)) return [];
    return [{ line: index + 1, value }];
  });
}

/** 1.4s and 1400ms are the same number; compare in one unit. */
function scalar(value) {
  const match = String(value).match(/^(-?[\d.]+)(px|ms|s|)$/);
  if (!match) return null;
  const n = Number.parseFloat(match[1]);
  return match[2] === 's' ? n * 1000 : n;
}

function nearest(value, allowed) {
  const n = scalar(value);
  if (n === null) return null;
  const ranked = [...allowed]
    .map((a) => ({ a, d: Math.abs((scalar(a) ?? Infinity) - Math.abs(n)) }))
    .filter((c) => Number.isFinite(c.d))
    .sort((x, y) => x.d - y.d);
  return ranked[0]?.a ?? null;
}

const GLOBAL_EXEMPT = new Set(['0', '0px', 'auto', 'none', '100%', 'inherit']);

/**
 * Values that exist on a *primitive* scale but have no semantic role pointing
 * at them. Distinct from off-scale on purpose: 32px is a legal step on the 4px
 * scale, so the fix is not "snap it to 24px" — it is "the semantic layer is
 * missing a role, name it or justify not having one". Snapping here would
 * silently change the design.
 */
const primitiveScale = (() => {
  const prim = JSON.parse(
    readFileSync(resolve(import.meta.dirname, '../tokens/primitive.tokens.json'), 'utf8'),
  );
  const collect = (node) =>
    Object.entries(node)
      .filter(([k]) => !k.startsWith('$'))
      .map(([, t]) => (t.$value?.unit ? `${t.$value.value}${t.$value.unit}` : String(t.$value)));
  return {
    spacing: new Set(collect(prim.space)),
    'font-size': new Set(collect(prim.fontSize)),
    'font-weight': new Set(collect(prim.fontWeight)),
    duration: new Set(collect(prim.duration)),
  };
})();

function classify(value, rule) {
  if (value.startsWith('var(') || value.startsWith('calc(') || value.endsWith(')')) return null;
  if (GLOBAL_EXEMPT.has(value)) return null;
  if ((rule.exempt ?? new Set()).has(value)) return null;
  const abs = value.startsWith('-') ? value.slice(1) : value;
  if (rule.allowed.has(value)) return 'unlinked';
  if (rule.allowed.has(abs)) return 'negated';
  if (primitiveScale[rule.name]?.has(abs)) return 'no-role';
  return 'off-scale';
}

const rules = [
  {
    name: 'font-size',
    token: '--bh-text-size-*',
    allowed: group('textSize'),
    find: (css) => declarations(css, 'font-size'),
  },
  {
    name: 'font-weight',
    token: '--bh-text-weight-*',
    allowed: group('textWeight'),
    find: (css) => declarations(css, 'font-weight'),
    exempt: new Set(['normal', 'bold']),
  },
  {
    name: 'spacing',
    token: '--bh-gap-* / --bh-padding-*',
    allowed: new Set([...group('gap'), ...group('padding')]),
    /**
     * 1px is legal for optical correction against a 1px border - a
     * `margin-top: 1px` nudging a label against a bordered control is not a
     * spacing decision, and snapping it to 2px would misalign the thing it
     * exists to align. The one place the drift report was wrong about what it
     * had found. Documented here rather than in a second exemption list, so
     * the next person to hit it finds the reason.
     */
    exempt: new Set(['1px', '-1px']),
    find: (css) =>
      declarations(css, 'padding|padding-\\w+|margin|margin-\\w+|gap|row-gap|column-gap').flatMap(
        (d) =>
          d.value.includes('calc(')
            ? []
            : d.value.split(/\s+/).map((part) => ({ line: d.line, value: part })),
      ),
  },
  {
    /**
     * Added after a 4px border-radius and an 18px box width survived every
     * other gate. The six original rules covered the properties where drift is
     * *obvious* - type, spacing, motion, layering - and missed the ones where a
     * literal encodes a relationship: a corner radius, a control's own size, an
     * inset that centres something.
     *
     * Those are worse, not better: `left: 3px; top: 7px` centring a bar in an
     * 18px box has to be recomputed every time the box changes, and nothing
     * tells you it did.
     */
    name: 'border-radius',
    token: '--bh-radius-*',
    allowed: group('radius'),
    find: (css) =>
      declarations(css, 'border-radius|border-\\w+-radius').flatMap((d) =>
        d.value.includes('calc(')
          ? []
          : // `0 3px 3px 0` is four independent corners, and treating it as one
            // value reported a legal shorthand as an unmappable literal.
            d.value.split(/\s+/).map((part) => ({ line: d.line, value: part })),
      ),
    exempt: new Set(['50%', '9999px']),
  },
  {
    name: 'inset',
    token: '--bh-gap-* / a percentage',
    allowed: new Set([...group('gap'), ...group('padding')]),
    find: (css) =>
      declarations(css, 'inset|inset-inline|inset-block|top|right|bottom|left').flatMap((d) =>
        d.value.includes('calc(')
          ? []
          : d.value.split(/\s+/).map((part) => ({ line: d.line, value: part })),
      ),
    exempt: new Set(['50%', '100%', '-100%', '1px', '-1px']),
    note: 'A literal inset usually encodes a relationship to something else\u2019s size. Prefer centring (top: 50% + translate) or a gap token over a number that was correct once.',
  },
  {
    name: 'duration',
    token: '--bh-duration-*',
    allowed: group('duration'),
    find: (css) =>
      css.split('\n').flatMap((text, i) =>
        text.includes('!important')
          ? []
          : (text.match(/(?<![\w-])\d+(?:\.\d+)?m?s(?![\w-])/g) ?? []).map((value) => ({
              line: i + 1,
              value,
            })),
      ),
  },
  {
    name: 'easing',
    token: '--bh-easing-*',
    allowed: group('easing'),
    find: (css) =>
      css.split('\n').flatMap((text, i) =>
        (
          text.match(
            /(?<![\w-])(ease(?:-in|-out|-in-out)?|linear|cubic-bezier\([^)]*\))(?![\w-])/g,
          ) ?? []
        ).map((value) => ({ line: i + 1, value })),
      ),
  },
  {
    name: 'z-index',
    token: '--bh-layer-*',
    allowed: group('layer'),
    find: (css) =>
      declarations(css, 'z-index').filter((d) => {
        const n = Number.parseInt(d.value, 10);
        return !(Number.isFinite(n) && Math.abs(n) <= 4);
      }),
    note: 'Values from -4 to 4 are exempt: sibling ordering inside one component is a local claim, and naming it globally would be worse.',
  },
];

const files = stylesheets(SRC);
const out = [];
const ORDER = ['off-scale', 'no-role', 'negated', 'unlinked'];
const totals = { 'off-scale': 0, 'no-role': 0, negated: 0, unlinked: 0 };

for (const rule of rules) {
  const hits = [];
  for (const file of files) {
    for (const d of rule.find(readFileSync(file, 'utf8'))) {
      const severity = classify(d.value, rule);
      if (severity) hits.push({ file: file.slice(SRC.length + 1), ...d, severity });
    }
  }

  const byValue = new Map();
  for (const hit of hits) {
    const key = `${hit.severity}|${hit.value}`;
    if (!byValue.has(key)) byValue.set(key, { ...hit, where: [] });
    byValue.get(key).where.push(`${hit.file}:${hit.line}`);
  }
  for (const hit of hits) totals[hit.severity] += 1;

  const counts = ORDER
    .map((s) => [s, hits.filter((h) => h.severity === s).length])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`)
    .join(', ');

  out.push(`## ${rule.name} — ${hits.length ? counts : 'clean'}`);
  out.push('');
  out.push(`Target: \`${rule.token}\`. Declared values: ${[...rule.allowed].sort().join(', ')}.`);
  if (rule.note) {
    out.push('');
    out.push(rule.note);
  }
  out.push('');

  if (!hits.length) {
    out.push('Nothing to do.');
    out.push('');
    continue;
  }

  out.push('| value | severity | count | action | where |');
  out.push('| --- | --- | --- | --- | --- |');
  const rows = [...byValue.values()].sort(
    (a, b) =>
      ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity) || b.where.length - a.where.length,
  );
  for (const row of rows) {
    const near = nearest(row.value, rule.allowed);
    const varName = named(rule.name === 'spacing' ? 'gap' : rule.name.replace('font-size', 'textSize').replace('font-weight', 'textWeight').replace('z-index', 'layer')).find(
      ([v]) => v === (near ?? row.value),
    );
    const action =
      row.severity === 'unlinked'
        ? `codemod → \`var(${varName?.[1] ?? '…'})\``
        : row.severity === 'negated'
          ? `\`calc(-1 * var(${varName?.[1] ?? '…'}))\``
          : row.severity === 'no-role'
            ? 'on the primitive scale, no semantic role — **name the role**'
            : near
              ? `decide: snap to \`${near}\`, or add a role and say why in DS-GAPS.md`
              : `decide: map to a declared ${rule.name} value`;
    const sites =
      row.where.length > 5
        ? `${row.where.slice(0, 5).join(', ')} +${row.where.length - 5} more`
        : row.where.join(', ');
    out.push(`| \`${row.value}\` | ${row.severity} | ${row.where.length} | ${action} | ${sites} |`);
  }
  out.push('');
}

const head = [
  '# Token drift report',
  '',
  `Generated by \`packages/tokens/scripts/audit-drift.mjs\` against ${files.length} stylesheets in \`${relative(process.cwd(), SRC) || '.'}\`.`,
  '',
  `**${totals['off-scale']} off-scale** — the value is not on any scale. Each needs a decision.  `,
  `**${totals['no-role']} no-role** — on the primitive scale, but no semantic token names it.  `,
  `**${totals.negated} negated** — a token value with a minus sign; needs \`calc(-1 * var(…))\`.  `,
  `**${totals.unlinked} unlinked** — already the right value, written as a literal. \`scripts/codemod-tokens.mjs\` rewrites these.`,
  '',
  'None of these are bugs today; the UI renders correctly. They are the places a theme ' +
    'switch, a density change or a rebrand would miss, and where the system currently ' +
    'claims a guarantee it cannot keep.',
  '',
];

console.log([...head, ...out].join('\n'));

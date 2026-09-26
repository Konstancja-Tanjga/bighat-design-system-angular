/**
 * Emits every token artefact from the DTCG source.
 *
 *   tokens/primitive.tokens.json  ─┐
 *   tokens/semantic.tokens.json   ─┼─▶  dist/tokens.css      (the runtime API)
 *   tokens/theme.dark.tokens.json ─┘    dist/tokens.scss     (Angular consumers)
 *                                       dist/tokens.ts       (types + cssVar)
 *                                       dist/tokens.flat.json(Figma / Style Dictionary)
 *
 * Hand-rolled rather than Style Dictionary on purpose: the source is DTCG
 * 2025.10, and Style Dictionary's 2025.10 support is still landing in v5. This
 * script is ~200 lines and keeps the package's zero-dependency promise. When
 * SD v5 ships full 2025.10 support, delete this and keep the JSON — that is the
 * whole point of standardising the source format.
 *
 *   node scripts/build-tokens.mjs           write
 *   node scripts/build-tokens.mjs --check   fail if committed output has drifted
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PREFIX = '--bh';

const read = (name) => JSON.parse(readFileSync(resolve(ROOT, 'tokens', name), 'utf8'));
const primitives = read('primitive.tokens.json');
const semantic = read('semantic.tokens.json');
const dark = read('theme.dark.tokens.json');

/* ── reference resolution ─────────────────────────────────────────────────── */

const isToken = (node) =>
  node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, '$value');

/** Walks a tree, calling visit(path, token) for every token. Skips $-keys. */
function walk(node, visit, path = []) {
  if (isToken(node)) return visit(path, node);
  if (!node || typeof node !== 'object') return;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    walk(child, visit, [...path, key]);
  }
}

function at(tree, path) {
  return path.reduce((node, key) => (node == null ? node : node[key]), tree);
}

const REFERENCE = /^\{([^}]+)\}$/;

/** Resolves {a.b.c} against the primitive tree, inheriting $type. */
function resolve$(token, path) {
  const match = typeof token.$value === 'string' && token.$value.match(REFERENCE);
  if (!match) return token;

  const target = at(primitives, match[1].split('.'));
  if (!isToken(target)) {
    throw new Error(
      `${path.join('.')} references {${match[1]}}, which is not a token in primitive.tokens.json`,
    );
  }
  const resolved = resolve$(target, match[1].split('.'));
  return { ...resolved, ...token, $type: token.$type ?? resolved.$type, $value: resolved.$value };
}

/* ── DTCG value → CSS ─────────────────────────────────────────────────────── */

const dim = (v) => (v.value === 0 ? '0' : `${v.value}${v.unit}`);

function rgba({ components, alpha = 1, hex }) {
  if (alpha === 1) return hex;
  const [r, g, b] = components.map((c) => Math.round(c * 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toCss(token, path) {
  switch (token.$type) {
    case 'color':
      return rgba(token.$value);
    case 'dimension':
      return dim(token.$value);
    case 'duration':
      return `${token.$value.value}${token.$value.unit}`;
    case 'cubicBezier':
      return `cubic-bezier(${token.$value.join(', ')})`;
    case 'fontWeight':
    case 'number':
      return String(token.$value);
    case 'fontFamily':
      return token.$value.map((f) => (/\s/.test(f) ? `'${f}'` : f)).join(', ');
    case 'shadow': {
      const s = token.$value;
      return `${dim(s.offsetX)} ${dim(s.offsetY)} ${dim(s.blur)} ${rgba(s.color)}`;
    }
    default:
      throw new Error(`${path.join('.')} has unsupported $type "${token.$type}"`);
  }
}

/** text.onAccent → --bh-text-on-accent, space.0-5 → --bh-space-0-5 */
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const varName = (path) => `${PREFIX}-${path.map(kebab).join('-')}`;

/* ── flatten ──────────────────────────────────────────────────────────────── */

function declarations(tree) {
  const out = [];
  walk(tree, (path, token) => {
    const resolved = resolve$(token, path);
    out.push([varName(path), toCss(resolved, path), path.join('.'), resolved]);
  });
  return out;
}

const base = declarations(semantic);
const darkOverrides = declarations(dark);

// A dark override that isn't a role in the base layer is a typo, not a feature.
for (const [name, , path] of darkOverrides) {
  if (!base.some(([n]) => n === name)) {
    throw new Error(`theme.dark declares ${path}, which the semantic layer does not define`);
  }
}

const merged = base.map(([name, value, path, token]) => {
  const override = darkOverrides.find(([n]) => n === name);
  return { name, path, token, light: value, dark: override ? override[1] : value };
});

/* ── emit: CSS ────────────────────────────────────────────────────────────── */

const block = (pick, indent = '  ') =>
  merged.map((t) => `${indent}${t.name}: ${pick(t)};`).join('\n');

/**
 * Renames from 3.x, kept live for the whole of the 4.x line and removed in 5.0.
 * A token that changes name without a bridge is a silent breakage in every
 * consumer stylesheet, which is exactly what MIGRATION.md exists to prevent.
 */
const legacyAliases = [['--bh-font-family', '--bh-font-family-sans']];

const legacyBlock = legacyAliases
  .map(([from, to]) => `  ${from}: var(${to}); /* deprecated in 4.0, removed in 5.0 */`)
  .join('\n');

const css = `/* Generated by scripts/build-tokens.mjs from tokens/*.tokens.json — do not edit by hand. */

:root {
${block((t) => t.light)}
  color-scheme: light;

${legacyBlock}
}

:root[data-theme='dark'] {
${block((t) => t.dark)}
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${block((t) => t.dark, '    ')}
    color-scheme: dark;
  }
}
`;

/* ── emit: SCSS ───────────────────────────────────────────────────────────── */

const scss = `// Generated by scripts/build-tokens.mjs — do not edit by hand.
//
// For Angular consumers who want compile-time access to a token value. The
// runtime API is still the custom property: prefer bh.var('text.muted') over
// bh.$text-muted, because the SCSS variable cannot follow a theme switch.

@use 'sass:map';

$tokens: (
${merged.map((t) => `  '${t.path}': ${t.light},`).join('\n')}
);

@function var($path) {
  @if not map.has-key($tokens, $path) {
    @error 'Unknown token: #{$path}';
  }
  @return var(--bh-#{str-replace($path, '.', '-')});
}
`;

/* ── emit: TS ─────────────────────────────────────────────────────────────── */

const paths = merged.map((t) => `  | '${t.path}'`).join('\n');
const ts = `/* Generated by scripts/build-tokens.mjs — do not edit by hand. */

/** Every semantic token the system exposes. Primitives are deliberately absent. */
export type TokenPath =
${paths};

/**
 * Reference a semantic token from component CSS-in-JS or a style attribute.
 * \`cssVar('text.muted')\` → \`var(--bh-text-muted)\`.
 *
 * Typed against TokenPath, so a token that does not exist is a compile error
 * rather than a silently invalid custom property.
 */
export function cssVar(path: TokenPath): string {
  return \`var(--bh-\${path.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().split('.').join('-')})\`;
}

/** Raw resolved values, light theme. For tests and documentation, not for components. */
export const tokens = {
${merged.map((t) => `  '${t.path}': { light: '${t.light}', dark: '${t.dark}' },`).join('\n')}
} as const satisfies Record<TokenPath, { light: string; dark: string }>;

export const contrast = ${JSON.stringify(semantic.$extensions['com.bighat.contrast'], null, 2)} as const;
`;

/* ── emit: flat JSON ──────────────────────────────────────────────────────── */

const flat = JSON.stringify(
  {
    $schema: 'https://tr.designtokens.org/format/2025.10/',
    generated: 'scripts/build-tokens.mjs',
    tokens: Object.fromEntries(
      merged.map((t) => [
        t.path,
        { type: t.token.$type, light: t.light, dark: t.dark, description: t.token.$description },
      ]),
    ),
  },
  null,
  2,
);

/* ── write or check ───────────────────────────────────────────────────────── */

const outputs = [
  ['dist/tokens.css', css],
  ['dist/tokens.scss', scss],
  ['dist/tokens.ts', ts],
  ['dist/tokens.flat.json', flat + '\n'],
];

const check = process.argv.includes('--check');
let drifted = false;

for (const [file, content] of outputs) {
  const target = resolve(ROOT, file);
  if (check) {
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (current !== content) {
      console.error(`${file} is out of date — run \`npm run tokens\` and commit the result.`);
      drifted = true;
    }
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

if (check) {
  if (drifted) process.exit(1);
  console.log(`All ${outputs.length} token artefacts are in sync.`);
} else {
  console.log(`Wrote ${outputs.length} artefacts, ${merged.length} semantic tokens.`);
}

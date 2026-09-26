/**
 * Audits each library against the WAI-ARIA Authoring Practices, separately.
 *
 * Two reports, not one, because the two libraries fail differently and a
 * merged report hides exactly the failures that matter:
 *
 *   React    ARIA attributes pass through as written, so the risks are
 *            semantic — a role on a div, aria-hidden over something focusable,
 *            a label that is only a placeholder.
 *   Angular  the risks are additionally *mechanical*. `[aria-expanded]="x"` and
 *            `[attr.aria-expanded]="x"` are not the same thing outside the
 *            handful of aria inputs Angular special-cases; a DOM property set
 *            as an attribute is silently ignored; and a bound `role` on a live
 *            region may never register.
 *
 * What this checks, in order of how much it is worth:
 *
 *   1. pattern conformance   the contract's role implies an APG pattern, and
 *                            that pattern has required keys and required
 *                            attributes. Missing ones are reported against the
 *                            contract, so they are fixed once for both.
 *   2. source-level defects  per framework, read from the implementation.
 *   3. WCAG coverage         which criteria each component claims, and which
 *                            its pattern says it is on the hook for.
 *
 * It does not replace axe. axe finds what is wrong in a rendered tree; this
 * finds what is missing from the design — a keyboard interaction nobody
 * implemented has no rendered evidence for axe to catch.
 *
 *   node scripts/audit-aria.mjs react   ../ui-react/src   > ARIA-REACT.md
 *   node scripts/audit-aria.mjs angular ../ui-angular/src > ARIA-ANGULAR.md
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** One framework per repo now, so it is not an argument. */
const framework = 'angular';
const SRC = resolve(process.argv[2] ?? 'src');
const SPECS = resolve(import.meta.dirname, '../spec/components');

/* ── the APG patterns, as requirements ────────────────────────────────────── */

/**
 * Keys and attributes each pattern requires. Sourced from the WAI-ARIA
 * Authoring Practices pattern pages; `optional` keys are listed by the APG as
 * "may" rather than "must" and are reported separately so a missing must and a
 * missing may never appear as the same finding.
 *
 * `wcag` is the criteria the pattern makes a component responsible for — not
 * every criterion in the standard, only the ones this widget can fail on its
 * own.
 */
const PATTERNS = {
  button: {
    keys: ['Enter', 'Space'],
    attributes: [],
    name: 'required',
    wcag: ['2.1.1', '2.4.7', '4.1.2'],
  },
  checkbox: {
    keys: ['Space'],
    attributes: ['aria-checked'],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '2.4.7', '4.1.2'],
    notes: 'A tri-state checkbox sets aria-checked="mixed" — and indeterminate is a DOM property, not an attribute.',
  },
  switch: {
    keys: ['Space'],
    optional: ['Enter'],
    attributes: ['aria-checked'],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '4.1.2'],
  },
  radio: {
    keys: ['Arrow keys', 'Space'],
    attributes: ['aria-checked'],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '2.4.3', '4.1.2'],
    notes: 'One tab stop for the whole group: roving tabindex or a native radio group.',
  },
  radiogroup: {
    keys: ['Arrow keys', 'Space'],
    attributes: [],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '2.4.3'],
  },
  dialog: {
    keys: ['Escape', 'Tab', 'Shift+Tab'],
    attributes: ['aria-modal'],
    name: 'required',
    wcag: ['2.1.2', '2.4.3', '4.1.2'],
    notes: 'aria-modal is implicit on a native <dialog> opened with showModal(). Focus must return to the opener.',
  },
  combobox: {
    keys: ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'],
    optional: ['Home', 'End', 'Alt+ArrowDown'],
    attributes: ['aria-expanded', 'aria-controls'],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '2.4.3', '4.1.2'],
  },
  listbox: {
    keys: ['ArrowDown', 'ArrowUp', 'Home', 'End'],
    attributes: [],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '4.1.2'],
  },
  menu: {
    keys: ['Enter', 'Escape', 'ArrowDown', 'ArrowUp'],
    optional: ['Home', 'End', 'Tab'],
    attributes: [],
    name: 'required',
    wcag: ['2.1.1', '2.1.2', '2.4.3', '4.1.2'],
  },
  tablist: {
    keys: ['Arrow keys', 'Home', 'End'],
    attributes: [],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '2.4.3', '4.1.2'],
    notes: 'Each tab needs aria-selected and aria-controls; each panel needs aria-labelledby.',
  },
  tab: {
    keys: ['Arrow keys'],
    attributes: ['aria-selected', 'aria-controls'],
    name: 'required',
    wcag: ['1.3.1', '4.1.2'],
  },
  slider: {
    keys: ['ArrowLeft', 'ArrowRight', 'Home', 'End'],
    optional: ['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown'],
    attributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '2.4.7', '4.1.2'],
  },
  progressbar: {
    keys: [],
    attributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    name: 'required',
    wcag: ['1.3.1', '4.1.2'],
    notes: 'Indeterminate omits aria-valuenow entirely rather than setting it to 0.',
  },
  toolbar: {
    keys: ['Arrow keys', 'Home', 'End'],
    attributes: [],
    name: 'required',
    wcag: ['2.1.1', '2.4.3'],
    notes: 'One tab stop for the whole toolbar.',
  },
  tooltip: {
    keys: ['Escape'],
    attributes: [],
    name: 'not-applicable',
    wcag: ['1.4.13', '2.1.1'],
    notes: 'WCAG 1.4.13: dismissable, hoverable, persistent. A tooltip that vanishes on pointer-out fails it.',
  },
  table: {
    keys: [],
    attributes: [],
    name: 'optional',
    wcag: ['1.3.1'],
    notes: 'A table with interactive cells is a grid, and a grid has arrow-key navigation.',
  },
  grid: {
    keys: ['Arrow keys', 'Home', 'End'],
    attributes: [],
    name: 'required',
    wcag: ['1.3.1', '2.1.1', '2.4.3'],
  },
  alert: { keys: [], attributes: [], name: 'not-applicable', wcag: ['4.1.3'] },
  status: { keys: [], attributes: [], name: 'not-applicable', wcag: ['4.1.3'] },
  list: { keys: [], attributes: [], name: 'not-applicable', wcag: ['1.3.1'] },
  listitem: { keys: [], attributes: [], name: 'not-applicable', wcag: ['1.3.1'] },
  navigation: { keys: [], attributes: [], name: 'optional', wcag: ['1.3.1', '2.4.1'] },
  separator: { keys: [], attributes: [], name: 'not-applicable', wcag: ['1.3.1'] },
  group: { keys: [], attributes: [], name: 'optional', wcag: ['1.3.1'] },
  img: { keys: [], attributes: [], name: 'required', wcag: ['1.1.1'] },
  link: { keys: ['Enter'], attributes: [], name: 'required', wcag: ['2.1.1', '2.4.4'] },
  textbox: {
    keys: [],
    attributes: [],
    name: 'required',
    wcag: ['1.3.1', '3.3.2', '4.1.2'],
    notes: 'A placeholder is not a name (WCAG 2.5.3 needs the visible label to match).',
  },
  searchbox: { keys: [], attributes: [], name: 'required', wcag: ['1.3.1', '3.3.2'] },
};

/**
 * Attributes the platform sets for you, keyed by the element that sets them.
 *
 * Reporting these as missing is worse than not reporting them: it teaches the
 * reader to write an attribute the browser already manages, and a hand-written
 * aria-modal on a <dialog> opened with showModal() is one more thing that can
 * disagree with reality. The APG requires the *state*, not the attribute.
 */
const IMPLICIT_ATTRIBUTES = {
  dialog: ['aria-modal'],
  progress: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  'input[type=range]': ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  'input[type=checkbox]': ['aria-checked'],
  'input[type=radio]': ['aria-checked'],
  select: ['aria-expanded', 'aria-controls'],
};

/**
 * Where a native element's implicit role names an APG *custom widget* pattern
 * that does not apply to it.
 *
 * A `<select>` has the implicit role `combobox`, but the APG combobox pattern
 * describes a custom widget: it requires Escape, ArrowDown to open, and
 * aria-expanded management, all of which the platform does for a native select
 * and none of which it exposes for a component to implement. Auditing one
 * against the other reports a conforming component as failing, which is the
 * fastest way to get an audit ignored.
 *
 * The APG says this itself: use the native element where it fits, and reach for
 * the pattern when it does not. `Combobox` in this system is the component for
 * when it does not, and it is audited against the full pattern.
 */
const NATIVE_OVERRIDES = {
  select: {
    pattern: 'select (native)',
    keys: [],
    attributes: [],
    name: 'required',
    wcag: ['1.3.1', '3.3.2', '4.1.2'],
    notes:
      'Native <select>. Keyboard interaction, the popup and expanded state are the platform’s; the component is responsible for the accessible name and the error association only.',
  },
};

/** The contract's role string → a pattern key. Roles carry qualifiers. */
function patternFor(role) {
  if (!role) return null;
  const bare = role
    .replace(/\(.*\)/g, '')
    .replace(/\bimplicit\b|\bfrom\b|<[^>]*>/g, '')
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .find((s) => PATTERNS[s]);
  return bare ? [bare, PATTERNS[bare]] : null;
}

/* ── source-level defects, per framework ──────────────────────────────────── */

const REACT_DEFECTS = [
  {
    id: 'role-on-generic',
    test: /<div[^>]*\brole="(button|checkbox|link|switch|tab)"/,
    severity: 'error',
    say: 'a generic element carries an interactive role. It gets no keyboard behaviour, no focusability and no form participation for free — the native element does.',
  },
  {
    id: 'aria-hidden-focusable',
    test: /aria-hidden="true"[^>]*(?:tabIndex|onClick)|(?:tabIndex|onClick)[^>]*aria-hidden="true"/,
    severity: 'error',
    say: 'aria-hidden on something focusable or clickable. A screen reader user can tab to it and hear nothing (WCAG 4.1.2).',
  },
  {
    id: 'outline-none',
    test: /outline:\s*(none|0)/,
    severity: 'error',
    say: 'a focus outline is removed (WCAG 2.4.7).',
  },
  {
    id: 'positive-tabindex',
    test: /tabIndex=\{?["']?[1-9]/,
    severity: 'error',
    say: 'a positive tabIndex. It reorders the whole page tab sequence, not just this component (WCAG 2.4.3).',
  },
  {
    id: 'placeholder-as-label',
    test: /placeholder=[^>]*\n?(?![\s\S]{0,400}(?:aria-label|htmlFor|<label))/,
    severity: 'warning',
    say: 'a placeholder with no visible label nearby. Worth confirming by hand — the regex sees 400 characters.',
  },
];

const ANGULAR_DEFECTS = [
  {
    id: 'bound-aria-without-attr',
    // Angular special-cases a small set of aria inputs; everything else needs attr.
    test: /\[aria-(?!pressed|checked|expanded|selected|disabled|hidden|label|labelledby|describedby|current|live|busy|valuenow|valuemin|valuemax|controls|haspopup|modal|invalid|required|readonly|sort|activedescendant|autocomplete)[a-z-]+\]=/,
    severity: 'error',
    say: 'a bound aria-* attribute outside the set Angular special-cases. Use [attr.aria-…], or it is set as a property the DOM ignores.',
  },
  {
    id: 'bound-role',
    test: /\[role\]=/,
    severity: 'warning',
    say: 'a bound role. Use [attr.role] — and on a live region, prefer separate elements per politeness: several screen readers only register a region when the node is inserted.',
  },
  {
    id: 'attr-dom-property',
    test: /\[attr\.(indeterminate|checked|value|selectedIndex|open)\]=/,
    severity: 'error',
    say: 'a DOM property bound as an attribute. The browser ignores it, so the control looks right and announces wrong. Set it in an effect() on the element.',
  },
  {
    id: 'role-on-generic',
    test: /<div[^>]*\brole="(button|checkbox|link|switch|tab)"/,
    severity: 'error',
    say: 'a generic element carries an interactive role. Use the native element.',
  },
  {
    id: 'outline-none',
    test: /outline:\s*(none|0)/,
    severity: 'error',
    say: 'a focus outline is removed (WCAG 2.4.7).',
  },
  {
    id: 'positive-tabindex',
    test: /tabindex="[1-9]/i,
    severity: 'error',
    say: 'a positive tabindex (WCAG 2.4.3).',
  },
  {
    id: 'missing-encapsulation-none',
    test: /@Component\(\{(?![\s\S]*?ViewEncapsulation\.None)[\s\S]*?\}\)/,
    severity: 'warning',
    say: 'a component without ViewEncapsulation.None. Its emulated-encapsulation attributes will stop the shared stylesheet applying, and the component will render unstyled rather than wrong — which is at least loud.',
  },
];

/* ── read the implementations ─────────────────────────────────────────────── */

function walk(dir, test) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p, test) : test(e.name) ? [p] : [];
  });
}

const sources = new Map();
const isReact = framework === 'react';
const files = walk(SRC, (n) =>
  isReact ? /^[A-Z]\w+\.tsx$/.test(n) : /\.(component|directive)\.ts$/.test(n),
);

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const name = isReact
    ? file.split('/').pop().replace('.tsx', '')
    : (source.match(/export class Bh(\w+)/)?.[1] ?? null);
  if (name) sources.set(name, { file: file.slice(SRC.length + 1), source });
}

const specs = readdirSync(SPECS)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(resolve(SPECS, f), 'utf8')));

/* ── audit ────────────────────────────────────────────────────────────────── */

const rows = [];
const defects = [];
const unpatterned = [];
let audited = 0;

for (const spec of specs) {
  const implementation = sources.get(spec.name);
  const declared = spec.implementations?.version;
  if (!declared || !implementation) continue;
  audited += 1;

  const native = (spec.anatomy ?? [])
    .map(({ element }) => NATIVE_OVERRIDES[element])
    .find(Boolean);
  const match = native ? [native.pattern, native] : patternFor(spec.aria?.role);
  if (!match) {
    unpatterned.push([spec.name, spec.aria?.role ?? 'no role recorded']);
    continue;
  }
  const [patternName, pattern] = match;

  const keys = Object.keys(spec.keyboard ?? {});
  const normalised = new Set(
    keys.flatMap((k) =>
      k === 'Arrow keys' ? ['Arrow keys', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'] : [k],
    ),
  );
  const missingKeys = pattern.keys.filter(
    (k) => !normalised.has(k) && !(k === 'Arrow keys' && normalised.has('ArrowDown')),
  );
  const missingOptional = (pattern.optional ?? []).filter((k) => !normalised.has(k));

  const attributes = Object.keys(spec.aria?.attributes ?? {});
  const implicit = new Set(
    (spec.anatomy ?? []).flatMap(({ element }) => IMPLICIT_ATTRIBUTES[element] ?? []),
  );
  const missingAttributes = pattern.attributes.filter(
    (a) =>
      !attributes.includes(a) &&
      !implicit.has(a) &&
      !spec.aria?.role?.includes('implicit'),
  );

  const claimedWcag = new Set(spec.aria?.wcag ?? []);
  const missingWcag = pattern.wcag.filter((c) => !claimedWcag.has(c));

  const nameMissing =
    pattern.name === 'required' && !spec.aria?.labelling ? 'labelling not specified' : null;

  const status =
    missingKeys.length || missingAttributes.length || nameMissing ? 'fail' : missingWcag.length || missingOptional.length ? 'partial' : 'pass';

  rows.push({
    name: spec.name,
    pattern: patternName,
    status,
    missingKeys,
    missingOptional,
    missingAttributes,
    missingWcag,
    nameMissing,
    notes: pattern.notes,
  });

  const rules = isReact ? REACT_DEFECTS : ANGULAR_DEFECTS;
  for (const rule of rules) {
    if (!rule.test.test(implementation.source)) continue;
    defects.push({ component: spec.name, file: implementation.file, ...rule });
  }
}

/* ── report ───────────────────────────────────────────────────────────────── */

const label = isReact ? 'React' : 'Angular';
const pkg = isReact ? '@bighatpoland/ui' : '@bighatpoland/ui-angular';
const out = [];

const counts = {
  pass: rows.filter((r) => r.status === 'pass').length,
  partial: rows.filter((r) => r.status === 'partial').length,
  fail: rows.filter((r) => r.status === 'fail').length,
};

out.push(`# ARIA conformance — ${label}`);
out.push('');
out.push(`\`${pkg}\`, audited against the WAI-ARIA Authoring Practices.`);
out.push('');
out.push(
  `**${audited} implemented component${audited === 1 ? '' : 's'}.** ` +
    `${counts.pass} conform, ${counts.partial} partial, ${counts.fail} fail. ` +
    `${defects.filter((d) => d.severity === 'error').length} source-level errors, ` +
    `${defects.filter((d) => d.severity === 'warning').length} warnings.`,
);
out.push('');
out.push(
  'This is not an axe run. axe checks a rendered tree and finds what is wrong in it; ' +
    'this checks the contract against the pattern it claims, and finds what was never ' +
    'built — a required keyboard interaction that nobody implemented leaves no rendered ' +
    'evidence for axe to catch.',
);
out.push('');

out.push('## Pattern conformance');
out.push('');
out.push('| component | APG pattern | status | missing |');
out.push('| --- | --- | --- | --- |');
for (const row of rows.sort((a, b) => a.name.localeCompare(b.name))) {
  const missing = [
    row.missingKeys.length ? `keys: ${row.missingKeys.join(', ')}` : null,
    row.missingAttributes.length ? `attributes: ${row.missingAttributes.join(', ')}` : null,
    row.nameMissing,
    row.missingWcag.length ? `WCAG: ${row.missingWcag.join(', ')}` : null,
    row.missingOptional.length ? `optional keys: ${row.missingOptional.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const icon = { pass: 'pass', partial: 'partial', fail: '**fail**' }[row.status];
  out.push(`| ${row.name} | \`${row.pattern}\` | ${icon} | ${missing || '—'} |`);
}
out.push('');

if (rows.some((r) => r.notes)) {
  out.push('### Pattern notes');
  out.push('');
  for (const row of rows.filter((r) => r.notes)) {
    out.push(`- **${row.name}** (\`${row.pattern}\`) — ${row.notes}`);
  }
  out.push('');
}

out.push(`## Source-level findings — ${label}-specific`);
out.push('');
if (!defects.length) {
  out.push(`No ${label}-specific defects found by the ${(isReact ? REACT_DEFECTS : ANGULAR_DEFECTS).length} rules in this audit.`);
  out.push('');
  out.push(
    isReact
      ? 'The React rules look for semantic mistakes: an interactive role on a generic ' +
          'element, aria-hidden over something focusable, a removed focus outline, a positive ' +
          'tabIndex, a placeholder standing in for a label.'
      : 'The Angular rules look for mechanical mistakes as well as semantic ones — a bound ' +
          'aria-* outside the set Angular special-cases, a bound role on a live region, a DOM ' +
          'property set as an attribute, a component missing ViewEncapsulation.None. Those four ' +
          'have no React equivalent, and they are the reason this report is separate rather ' +
          'than a column in a shared one.',
  );
} else {
  out.push('| component | file | severity | finding |');
  out.push('| --- | --- | --- | --- |');
  for (const d of defects) {
    out.push(`| ${d.component} | \`${d.file}\` | ${d.severity} | ${d.say} |`);
  }
}
out.push('');

if (unpatterned.length) {
  out.push('## No APG pattern matched');
  out.push('');
  out.push(
    'Either the component genuinely has no pattern — a layout frame, a decorative ' +
      'element — or its recorded role is not one the APG defines, which is itself a finding.',
  );
  out.push('');
  for (const [name, role] of unpatterned) out.push(`- **${name}** — \`${role}\``);
  out.push('');
}

out.push('## What this audit cannot tell you');
out.push('');
out.push(
  '- **Colour contrast.** Gated separately, in `packages/tokens`: 26 declared pairs across two themes, asserted in CI.',
);
out.push(
  '- **Whether the keyboard behaviour is *correct*.** It checks that a key is handled and documented, not that pressing it does the right thing. That is what the shared suites in `packages/spec/src/suites.ts` are for, and they run against both libraries from one file.',
);
out.push(
  '- **Screen reader output.** No static audit substitutes for NVDA, JAWS and VoiceOver. The announcement policies in each contract are testable claims, and nobody has tested them.',
);
out.push(
  '- **Reflow and zoom.** WCAG 1.4.10 at 400%. The container-query architecture should make this pass, which is a hypothesis rather than a result.',
);

console.log(out.join('\n'));

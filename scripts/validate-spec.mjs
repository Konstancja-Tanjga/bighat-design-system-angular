/**
 * Gate on the spec itself. Runs in CI before either library builds.
 *
 * Three classes of failure, in the order they matter:
 *
 *   1. framework leakage — a contract that can only be read by a React
 *      developer is not a contract, it is documentation of one implementation.
 *      `ReactNode`, `MouseEvent<HTMLButtonElement>` and `forwardRef` are all
 *      banned outside the `react:` field, which exists for exactly this.
 *   2. vocabulary — a prop named `tone` whose values are not a subset of the
 *      system's tone scale. This is what let three different `tone` unions
 *      ship in 3.2.0 without anyone noticing.
 *   3. completeness — a contract missing anatomy, keyboard or aria. Not an
 *      error while porting: reported as a countdown, and only fails the build
 *      for components claiming `status: parity`, because parity with an
 *      unspecified contract is not a claim anyone can check.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve(import.meta.dirname, '../spec/components');
const VOCAB = {
  tone: ['neutral', 'info', 'success', 'warning', 'critical'],
  variant: ['primary', 'secondary', 'ghost'],
  size: ['sm', 'md', 'lg'],
  density: ['comfortable', 'compact'],
  scope: ['inline', 'section', 'page'],
};
const LEAKS = /\b(ReactNode|ReactElement|JSX\.Element|forwardRef|MouseEvent<|ChangeEvent<|useState|useEffect|HTMLAttributes)\b/;

const errors = [];
const incomplete = [];
const specs = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(resolve(DIR, f), 'utf8'))]);

for (const [file, spec] of specs) {
  const fail = (message) => errors.push(`${file}: ${message}`);

  /* 1. framework leakage — everywhere except the fields that exist to hold it */
  const scan = (node, path = []) => {
    if (typeof node === 'string') {
      if (path.at(-1) === 'angular') return;
      if (LEAKS.test(node)) fail(`${path.join('.')} leaks a framework type: "${node}"`);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) scan(child, [...path, key]);
    }
  };
  scan(spec);

  /* 2. vocabulary */
  for (const [propName, prop] of Object.entries(spec.props ?? {})) {
    const allowed = VOCAB[prop.kind];
    if (!allowed || !prop.values) continue;
    const stray = prop.values.filter((v) => !allowed.includes(v));
    if (stray.length) {
      fail(
        `props.${propName} is kind "${prop.kind}" but declares ${stray.map((s) => `"${s}"`).join(', ')}. ` +
          `The ${prop.kind} scale is ${allowed.join(' | ')}. Widen the scale in vocabulary.ts ` +
          `with an argument, or narrow the component.`,
      );
    }
    if (prop.kind === 'tone' && prop.values.includes('default')) {
      fail(`props.${propName} uses "default"; the tone scale starts at "neutral".`);
    }
  }

  /* 3. completeness */
  const gaps = [];
  const gapsFromSlots = [];
  /**
   * Slots must say what goes in them and how Angular expresses them — but only
   * once a component claims an implementation. Demanding it of all 41 up front
   * turns the countdown into a wall of 40 identical errors, which is how a gate
   * gets switched off.
   */
  const claimed = spec.implementations?.status === 'implemented';
  const slotGaps = Object.entries(spec.props ?? {})
    .filter(([, prop]) => prop.kind === 'slot')
    .filter(([, prop]) => !prop.content || prop.content === 'TODO' || !prop.angular)
    .map(([propName]) => propName);
  if (slotGaps.length) {
    if (claimed) fail(`slots not fully specified: ${slotGaps.join(', ')}`);
    else gapsFromSlots.push(...slotGaps);
  }


  if (!spec.anatomy?.length || spec.anatomy.some((a) => a.element === 'TODO')) gaps.push('anatomy');
  // A non-interactive component has no keyboard map to write and one state.
  if (spec.interactive !== false && !Object.keys(spec.keyboard ?? {}).length) gaps.push('keyboard');
  if (Object.values(spec.keyboard ?? {}).includes('TODO')) {
    const keys = Object.entries(spec.keyboard).filter(([, v]) => v === 'TODO').map(([k]) => k);
    gaps.push(`keyboard intent (${keys.join('/')})`);
  }
  if (!spec.aria?.role || spec.aria.role === 'TODO') gaps.push('aria.role');
  // The three fields the source cannot contain. Tracked separately because
  // they are the ones an Angular implementer will otherwise have to guess.
  const intent = ['labelling', 'focus', 'announcements'].filter((f) => !spec.aria?.[f]);
  if (spec.aria?.role && spec.aria.role !== 'TODO' && intent.length) {
    gaps.push(`aria intent (${intent.join('/')})`);
  }
  if (!spec.aria?.wcag?.length) gaps.push('aria.wcag');
  if (spec.interactive !== false && (spec.states ?? []).length < 2) gaps.push('states');
  if (spec.interactive === undefined) gaps.push('interactive');
  if (!spec.tokensUsed?.length) gaps.push('tokensUsed');
  if (gapsFromSlots.length) gaps.push(`slots (${gapsFromSlots.length})`);

  if (gaps.length) {
    incomplete.push([spec.name, gaps]);
    if (spec.implementations?.status === 'implemented') {
      fail(`ships in this library but the contract is missing ${gaps.join(', ')}`);
    }
  }


}

const complete = specs.length - incomplete.length;
console.log(`${specs.length} contracts. ${complete} complete, ${incomplete.length} in progress.\n`);

if (incomplete.length) {
  console.log('In progress:');
  for (const [name, gaps] of incomplete.slice(0, 50)) {
    console.log(`  ${name.padEnd(18)} needs ${gaps.join(', ')}`);
  }
  console.log('');
}

if (errors.length) {
  console.error(`${errors.length} error${errors.length === 1 ? '' : 's'}:\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log('No vocabulary violations, no framework leakage.');

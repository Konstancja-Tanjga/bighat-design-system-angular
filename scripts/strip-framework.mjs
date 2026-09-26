/**
 * Removes the other framework from this repo's contracts.
 *
 * The contracts were written to serve two libraries from one file, with
 * `react:` and `angular:` fields side by side and an `implementations` block
 * naming both. In two independent repos that is no longer honest: this repo
 * cannot verify a claim about the Angular library, cannot fail when it drifts,
 * and should not appear to speak for it.
 *
 * So the fields go, and `implementations` collapses to this library's version.
 * What is lost with them is the cross-repo parity check, and that loss is real
 * rather than tidied away — it is written up in docs/00-About.mdx under what
 * the split cost.
 *
 *   node scripts/strip-framework.mjs react
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const keep = process.argv[2];
const drop = keep === 'react' ? 'angular' : 'react';
const DIR = resolve(import.meta.dirname, '../spec/components');

let changed = 0;
const orphaned = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const path = resolve(DIR, file);
  const spec = JSON.parse(readFileSync(path, 'utf8'));

  for (const [name, prop] of Object.entries(spec.props ?? {})) {
    if (prop[drop]) delete prop[drop];
    // A prop whose only expression was the other framework's now has none.
    if (!prop[keep] && prop.kind === 'slot') orphaned.push(`${spec.name}.${name}`);
  }

  const version = spec.implementations?.[keep] ?? null;
  const other = spec.implementations?.[drop];
  spec.implementations = {
    version,
    status: version ? (spec.implementations.status === 'spec-only' ? 'implemented' : spec.implementations.status) : 'spec-only',
    ...(spec.implementations?.unimplemented?.[keep]?.length
      ? { unimplemented: spec.implementations.unimplemented[keep] }
      : {}),
    // Kept as prose, not as a claim: a note that a sibling implementation
    // exists is useful context; a version number this repo cannot check is not.
    ...(other ? { alsoImplementedIn: drop } : {}),
  };
  if (spec.implementations.status === 'diverged') {
    spec.implementations.status = version ? 'implemented' : 'spec-only';
    delete spec.divergence;
  }
  delete spec.implementations.divergence;
  delete spec.implementations.symbols;
  delete spec.implementations.allowedStoryDivergence;

  writeFileSync(path, JSON.stringify(spec, null, 2) + '\n');
  changed += 1;
}

console.log(`Stripped ${drop} from ${changed} contracts.`);
if (orphaned.length) {
  console.log(
    `\n${orphaned.length} slot${orphaned.length === 1 ? '' : 's'} had no ${keep} expression ` +
      `recorded, only the ${drop} one:\n  ${orphaned.join('\n  ')}`,
  );
}
console.log(
  `\nGone with the fields: the cross-repo parity check. This repo can no longer\n` +
    `assert anything about the ${drop} library, and nothing will fail when the two\n` +
    `disagree. That is the cost of the split, and it is written up in\n` +
    `docs/00-About.mdx rather than left to be discovered.`,
);

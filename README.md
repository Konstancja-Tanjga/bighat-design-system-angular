# [Big Hat — Angular](https://konstancja-tanjga.github.io/bighat-design-system-angular/)

**[Open the Storybook →](https://konstancja-tanjga.github.io/bighat-design-system-angular/)**

An Angular design system built from the same component contracts as its React
sibling, and built to answer the question that follows the first one: not "can
you port a design system", but *what is actually different, and what did you
refuse to change*.

Eight components, chosen because between them they exercise every hard case —
a directive on the consumer's own element, Signal Forms controls, a live region
that cannot have a bound role, the platform's `<dialog>`, a native `<select>`,
a `TemplateRef` instead of a render prop, and an injectable service instead of
a hook. After these, the rest is repetition.

Every component conforms to its WAI-ARIA APG pattern, checked on every build by
an audit whose rules are Angular-specific — a bound `aria-*` outside the set
Angular special-cases, a bound `role` on a live region, a DOM property set as
an attribute. None of those have a React equivalent.

Sibling: **[Big Hat — React](https://github.com/konstancja-tanjga/bighat-design-system)**, 41 components.

## Install

```bash
npm i @bighatpoland/ui-angular
```

```ts
// main.ts
import '@bighatpoland/ui-angular/styles.css';
```

```html
<button bhButton variant="primary">Save changes</button>
<bh-checkbox [formField]="f.terms">I accept the terms</bh-checkbox>
<bh-toast-host />
```

Every component is standalone. There is no module to import, and
`BhToastService` is `providedIn: 'root'`.

## What is in here

| path | what |
| --- | --- |
| `tokens/*.tokens.json` | the DTCG 2025.10 source, its own copy |
| `src/lib/` | 8 components, one directory each |
| `src/styles/` | 8 stylesheets — this library implements 8 components and does not pretend to more |
| `spec/components/` | 8 contracts, shared in origin with the React repository |
| `agent/` | `SKILL.md` plus `angular.md`, so an agent writing Angular is not handed React examples |
| `docs/` | the Storybook's own pages |

## The gates

```bash
npm run verify
```

Same five as the React repository — token sync, contract validity, token
drift across eight value classes, ARIA conformance, and generated pages
matching the build.

## Licence

MIT.

---
name: bighat-design-system
description: Build UI with the Big Hat design system. Load this before writing any component, screen or style that will use it — it encodes the rules the libraries cannot enforce at the type level. Then load the file for your framework: react.md or angular.md.
---

# Building with the Big Hat design system

A design system's rules live in three places: the types, the linter, and the
heads of the people who wrote it. This file moves the third category somewhere
an agent can read it.

Everything below is a rule that a correct-looking, type-checking, lint-passing
piece of code can still break. **Every rule here is framework-neutral** — it is
true of the React library and the Angular library equally, and it is stated
without a code example for exactly that reason. The examples live in the
framework file, and reading only this file will leave you writing pseudocode.

**Load one of these next, and do not skip it:**

- [`react.md`](./react.md) — `@bighatpoland/ui`
- [`angular.md`](./angular.md) — `@bighatpoland/ui-angular`

The 3.x version of this file was a single document full of `.tsx`. An agent
asked to write Angular read it, followed it, and produced React-shaped Angular:
wrapper components where a directive belonged, `ControlValueAccessor` where the
library had moved on, and `[ngClass]` where the class list is owned by the
library. Splitting the file is the fix for a failure that actually happened.

Reviewing or handing over a prototype rather than building one? Read
[`HANDOFF.md`](./HANDOFF.md) — it routes the request and defines the verdicts.

## 1. Never use a primitive token

The system exports two token layers and only one of them is an API.

Primitives (`color.blue.500`, `space.4`) say what a value *is*. Semantics
(`action.primary.hover`, `text.muted`, `border.focus`) say what it *means*.
Product code and generated code may reference semantics only.

If no semantic token fits what you are building, that is a signal the system is
missing a role — not a licence to reach one layer down. **Say so and stop.**
Write it in `DS-GAPS.md` with what you reached for, what you would have to
hand-roll, and what the hand-rolled version does worse.

## 2. Spacing, type, motion and layering come from the scale or not at all

Every gap, padding, margin, font size, font weight, duration, easing and
z-index resolves to a token. There are no exceptions and no eyeballed values.

`padding: 13px` is always wrong, including when it looks better. The scale is
4px-based, and a value off the scale is a value that will drift.

This is enforced, not requested: `packages/tokens/src/drift.test.ts` walks
every stylesheet and fails the build on a literal. If you find yourself wanting
one, the answer is rule 1.

Two documented exemptions, both with reasons in the gate: container-query
thresholds, which CSS cannot read from a custom property, and `1px` for optical
correction against a 1px border.

## 3. Empty, loading and error are `StateBlock` — always

Do not write a bespoke "No results found". Do not render nothing while loading.
Do not put an error in a red paragraph.

The three states each have an announcement policy that is easy to get wrong in
a way nobody notices: loading is polite, error is assertive, and empty gets no
live region at all because it is the rendered result of a successful request.
Making this a component rather than a guideline is the whole point — the
pattern is enforced by import, not by whether someone read the docs.

Inside a table, pass the same object to the table's `state` input instead: the
block has to render across every column, which the table controls.

## 4. Colour is never the only carrier of meaning

WCAG 1.4.1. A status whose meaning lives in its hue is invisible to anyone who
cannot see the difference.

`Badge` requires its label and has no colour prop. There is no icon-only button
variant. If you are about to communicate state with a dot, a tint or a border
colour alone, add the word.

## 5. Never remove a focus outline

Not with `outline: none`, not with a `:focus` reset, not "because the design
does not show one". Every interactive element in the system carries
`bh-focusable`, and the ring is contrast-tested against both themes.

## 6. Labels are required. A placeholder is not a label

Every form control takes a required, visible label. A placeholder disappears on
focus, is not a voice-control target (WCAG 2.5.3), and fails at exactly the
moment the user needs it.

The React library keeps a `hideLabel` escape hatch for the one legitimate case;
the Angular library deliberately does not offer it. Do not reach for it in
either.

## 7. Prefer composition over a new prop

Before adding a prop, check whether the thing you want is a smaller component
placed inside a larger one. A component that has grown a `showFooterDivider`
prop is a component that should have taken a slot.

## 8. Build screens from `AppShell`, not from divs

The shell owns the layout landmarks, the skip link, and the container queries
that make everything inside it respond to its box rather than the viewport. A
hand-rolled `<div>` grid loses all three, and loses them silently.

## 9. Any drag interaction needs a pointer-free equivalent

WCAG 2.5.7. `Board` supports keyboard reordering; if you build a drag
affordance the system does not have, it needs one too, and it needs to be
discoverable rather than merely present.

## 10. `Skeleton` only when the shape is known

A skeleton that does not match what arrives is worse than a spinner: it
promises a layout and then reflows. Use `StateBlock state="loading"` when the
shape is unknown.

## 11. A responsive table declares its form

`scroll` keeps the grid, `stack` becomes cards, `priority` drops columns by
declared priority. Pick one deliberately. The default is `scroll` because it
never loses data, not because it is best.

## 12. Templates are a starting point, not a dependency

Copy from `Templates/`, do not import it. They are examples with opinions, and
those opinions are not versioned.

## 13. Deprecations

Announced in one major, removed in the next, warned in development throughout.
Never use a deprecated form in new code, even though it still works:

| do not write | write | removed in |
| --- | --- | --- |
| `variant="danger"` | `tone="critical"` | removed in 3.0 |
| `tone="default"` | `tone="neutral"` | 5.0 |
| `StateBlock density` | `scope` | 5.0 |
| `--bh-font-family` | `--bh-font-family-sans` | 5.0 |

## Before you invent a component

Read `DS-GAPS.md`. It records what the system does not cover, found by building
against it rather than by reviewing it. If what you need is in there, it is not
there for a reason — and the entry says what the reason was.

The bar for a new component: a product would otherwise build a worse version of
it. Not that the library looks incomplete without it.

## The contracts are the specification

`packages/spec/components/<name>.json` — one file per component, with its
purpose, what it is *not* for, anatomy, states, keyboard map, ARIA contract and
the tokens it consumes. It is framework-neutral and it is the source both
libraries are built from.

When this file and a contract disagree, the contract is right. When a contract
and an implementation disagree, that is a bug — report it rather than matching
the implementation.

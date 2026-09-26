# @bighatpoland/ui-angular — Angular idioms

Read [`SKILL.md`](./SKILL.md) first. Everything there is true here.

**If you have read the React file, unlearn its examples.** The rules are the
same; almost none of the code is. The 3.x skill file was React-only and agents
following it produced React-shaped Angular — that is what this file exists to
prevent.

## Setup, once per application

```ts
// main.ts
import '@bighatpoland/css';
```

```html
<!-- app root template -->
<bh-toast-host />
```

`BhToastService` is `providedIn: 'root'`; inject it anywhere, including in an
interceptor or a route guard. There is no module to import — every component
is standalone.

## Button is a directive, not a component

```html
<button bhButton variant="secondary" tone="critical" [loading]="saving()">
  <bh-icon bhIconStart name="trash" />
  Delete workspace
</button>
```

**Not** `<bh-button>`. The element stays the consumer's, so `type`, `form`,
`formaction`, `[routerLink]` and a typed `(click)` all keep working without a
pass-through prop. A wrapper accumulates the entire native API one bug report
at a time.

## Never bind `class` or `[ngClass]` on a library component

The class list is owned by the library and computed from the inputs. Adding to
it is the Angular version of reaching for `className`, and rule 1 applies.

## Forms: `FormValueControl`, never `ControlValueAccessor`

```ts
export class BhCheckbox implements FormCheckboxControl {
  readonly value = model(false);   // the entire contract
}
```

```html
<bh-checkbox [formField]="f.terms">I accept the terms</bh-checkbox>
```

Three things to know:

1. No providers array, no `forwardRef`, no `writeValue` / `registerOnChange` /
   `registerOnTouched` / `setDisabledState`.
2. It still works inside an existing reactive or template-driven form — the
   interop runs both ways — so nothing has to migrate first.
3. **Never implement both interfaces on one component.** Pick one.

## Slots are content projection, not props

| React | Angular |
| --- | --- |
| `iconStart={<Icon />}` | `<bh-icon bhIconStart />` |
| `description="…"` on a slot | `<p bhDescription>…</p>` |
| `footer={<Actions />}` | `<div bhFooter>…</div>` |
| `renderRow={fn}` | `<ng-template #bhCell let-row>` |

A `description` that is referenced by `aria-describedby` is a **string input**,
not a slot — it needs a stable id on a single element, and a projected node can
be a fragment, several elements, or none.

## Events drop the `on` prefix

`onClose` → `closed`. `onSortChange` → the `sort` model's own two-way binding;
a separate output would fire twice.

## Two-way bindings replace controlled/uncontrolled pairs

```html
<bh-dialog [(open)]="open" title="Rename workspace">
```

## String unions, never enums

```ts
readonly variant = input<ButtonVariant>('primary');
```

An enum would force `[variant]="Variant.Secondary"` in every template and make
the two libraries disagree about the same value.

## Behaviour: use the platform, then Angular's headless layer

| for | use |
| --- | --- |
| Dialog | native `<dialog>` — focus trap, `inert`, cancellable Escape, top layer, no z-index |
| Menu, Tabs, Accordion, Combobox, Toolbar, RadioGroup | `@angular/aria` |
| Tooltip, Menu positioning | `@angular/cdk` Overlay, FocusTrap, ListKeyManager |

Do not port the React library's hand-rolled behaviour. It was written when
React had no headless layer worth adopting; Angular has one.

Do not reach for `cdk/overlay` for `Dialog` — it re-implements in TypeScript
what the browser now does, and renders into a container the token stylesheet
does not know about.

## `indeterminate` and friends are DOM properties

`[attr.indeterminate]` renders an attribute the browser ignores, and the
control then announces "not checked" while looking mixed. Set it in an
`effect()` on the element. Same for `select.selectedIndex` and
`input.setSelectionRange`.

## Zoneless and OnPush

Keep RxJS out of the public API surface. Everything the library exposes is a
signal, and everything it consumes should work under `provideZonelessChangeDetection()`.

## Storybook

Every `Meta` needs `component:` set, or Compodoc has nothing to attach docs to
and Controls renders empty. Signal inputs need `emitDecoratorMetadata` in
`.storybook/tsconfig.json` or their JSDoc never reaches the panel.

A directive has no template, so every one of its stories needs `render` with a
`template` — `args` alone cannot express one.

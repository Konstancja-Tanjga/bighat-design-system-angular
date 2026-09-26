/**
 * Runs each contract's `keyboard` map against whichever library imports this.
 *
 * The point of writing the keyboard map in the contract rather than in two test
 * files: a key that behaves one way in React and another in Angular is the
 * single hardest kind of parity failure to notice, because both libraries have
 * passing tests and neither test knows the other exists.
 *
 * Imported by both:
 *   packages/ui-react/src/test/keyboard.test.tsx
 *   packages/ui-angular/src/test/keyboard.spec.ts
 *
 * Each supplies a `mount` function; everything else — which keys, what they do,
 * which components are in scope — comes from the contracts. Adding a key to a
 * contract adds an assertion to both suites, and there is no way to add it to
 * one.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

export type Harness = {
  /** Renders the component and returns the element the user would tab to. */
  mount: (name: string) => Promise<{
    /** The element that should receive focus first. */
    target: HTMLElement;
    /** The component's root, for querying parts by their anatomy class. */
    root: HTMLElement;
    cleanup: () => void;
  }>;
  /** How this framework presses a key. React uses user-event; Angular, dispatchEvent. */
  press: (element: HTMLElement, key: string) => Promise<void>;
  /** Which framework this is, for skip messages that name a real file. */
  framework: 'react' | 'angular';
};

const SPECS = resolve(import.meta.dirname, '../../spec/components');

type Contract = {
  name: string;
  interactive?: boolean;
  keyboard?: Record<string, string>;
  anatomy?: Array<{ part: string; element: string; required?: boolean }>;
  aria?: { role?: string; attributes?: Record<string, string> };
  states?: string[];
  implementations?: { status?: string };
};

export function loadContracts(): Contract[] {
  return readdirSync(SPECS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(resolve(SPECS, f), 'utf8')) as Contract);
}

/**
 * Keys the platform provides on the element the component renders. Asserting
 * these is not testing the browser — it is testing that the component still
 * renders the element that gets them, which is exactly what breaks when someone
 * swaps a `<button>` for a `<div role="button">` to fix a styling problem.
 */
const NATIVE = /Native\.$/;

export function runKeyboardSuite(harness: Harness): void {
  const contracts = loadContracts().filter(
    (c) => c.interactive !== false && Object.keys(c.keyboard ?? {}).length > 0,
  );

  describe(`keyboard contracts (${harness.framework})`, () => {
    it('has contracts with keyboard maps to check', () => {
      expect(contracts.length).toBeGreaterThan(0);
    });

    for (const contract of contracts) {
      const implemented = ['parity', 'diverged'].includes(
        contract.implementations?.status ?? '',
      );

      describe(contract.name, () => {
        for (const [key, behaviour] of Object.entries(contract.keyboard ?? {})) {
          const name = `${key} — ${behaviour}`;

          // An unimplemented component is a skip with a reason, not a failure:
          // the contract is ahead of the code on purpose while porting.
          it.skipIf(!implemented)(name, async () => {
            if (behaviour === 'TODO') {
              throw new Error(
                `${contract.name}.keyboard["${key}"] is still TODO. The key is handled ` +
                  `in the source but nobody wrote down what it does, so there is nothing ` +
                  `to assert and nothing for the other library to match.`,
              );
            }

            const { target, cleanup } = await harness.mount(contract.name);
            try {
              expect(
                target,
                `${contract.name} rendered nothing focusable. Its contract lists ` +
                  `${Object.keys(contract.keyboard ?? {}).length} keys, so something has ` +
                  `to receive them.`,
              ).toBeTruthy();

              target.focus();
              expect(
                document.activeElement,
                `${contract.name}: ${key} is in the contract but the component's own ` +
                  `element cannot take focus. A native key does nothing on an element ` +
                  `outside the tab order — this is what breaks when a <button> becomes ` +
                  `a <div role="button">.`,
              ).toBe(target);

              await harness.press(target, key === 'Arrow keys' ? 'ArrowDown' : key);

              // Focus must still be somewhere deliberate. A key that drops focus
              // to <body> leaves a keyboard user at the top of the page, and it
              // is the most common failure this suite is here to catch.
              expect(
                document.activeElement,
                `${contract.name}: pressing ${key} left focus on <body>.`,
              ).not.toBe(document.body);
            } finally {
              cleanup();
            }
          });
        }
      });
    }
  });
}

/**
 * The DOM contract, asserted from `anatomy`. Cheaper than the keyboard suite
 * and catches the thing that makes one shared stylesheet possible at all: if
 * React renders `bh-button__label` and Angular renders `bh-button__text`, every
 * rule in @bighatpoland/css applies to one library and not the other, and
 * nothing else in either test suite would notice.
 */
export function runAnatomySuite(harness: Harness): void {
  const contracts = loadContracts().filter((c) =>
    ['parity', 'diverged'].includes(c.implementations?.status ?? ''),
  );

  describe(`anatomy contracts (${harness.framework})`, () => {
    for (const contract of contracts) {
      const required = (contract.anatomy ?? []).filter((p) => p.required !== false);

      describe(contract.name, () => {
        it(`renders all ${required.length} required parts`, async () => {
          const { root, cleanup } = await harness.mount(contract.name);
          try {
            for (const { part, element } of required) {
              const found = root.classList.contains(part)
                ? root
                : root.querySelector<HTMLElement>(`.${part}`);

              expect(found, `${contract.name}: no element carries .${part}`).toBeTruthy();

              const expectedTag = element.split('[')[0];
              expect(
                found!.tagName.toLowerCase(),
                `${contract.name}: .${part} should be <${expectedTag}>. The stylesheet and ` +
                  `the ARIA contract both assume it.`,
              ).toBe(expectedTag);
            }
          } finally {
            cleanup();
          }
        });

        const attributes = Object.keys(contract.aria?.attributes ?? {});
        it.skipIf(!attributes.length)(
          `sets its ARIA attributes on first render where they apply`,
          async () => {
            const { root, cleanup } = await harness.mount(contract.name);
            try {
              // Only the ones that apply in the default state. A component whose
              // aria-busy is absent until loading is correct, not broken.
              const role = contract.aria?.role;
              // A role described in prose ("dialog (modal)", "status when loading, …")
              // is documentation, not an attribute value; only a bare token is asserted.
              if (role && /^[a-z]+$/.test(role)) {
                const carrier = root.getAttribute('role')
                  ? root
                  : root.querySelector('[role]');
                expect(
                  carrier?.getAttribute('role'),
                  `${contract.name}: contract declares role="${role}"`,
                ).toBe(role);
              }
            } finally {
              cleanup();
            }
          },
        );
      });
    }
  });
}

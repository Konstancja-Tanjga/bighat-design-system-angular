import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { runAnatomySuite, runKeyboardSuite, type Harness } from '@bighatpoland/spec/src/suites';

import { BhButton } from '../lib/button/button.directive';
import { BhCheckbox } from '../lib/checkbox/checkbox.component';
import { BhDialog } from '../lib/dialog/dialog.component';
import { BhStateBlock } from '../lib/state-block/state-block.component';

/**
 * The Angular half of the shared suite. Same contracts, same assertions, same
 * failure messages — which is the entire reason the suite lives in
 * packages/spec and takes a harness rather than being written twice.
 *
 * A host component per example rather than TestBed.createComponent on the
 * component directly: Button is a directive, and three of the four take content
 * projection, so there is nothing to instantiate without a template around it.
 */
const templates: Record<string, string> = {
  Button: `<button bhButton>Save changes</button>`,
  Checkbox: `<bh-checkbox>Email me about billing changes</bh-checkbox>`,
  StateBlock: `<bh-state-block state="empty" title="No invoices yet" />`,
  Dialog: `<bh-dialog [open]="true" title="Rename workspace">
             <input aria-label="Workspace name" />
           </bh-dialog>`,
};

const harness: Harness = {
  framework: 'angular',
  async mount(name) {
    const template = templates[name];
    if (!template) throw new Error(`No Angular example for ${name}. Add one above.`);

    @Component({
      template,
      imports: [BhButton, BhCheckbox, BhDialog, BhStateBlock],
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    // The component's own root, not the test host's div — the anatomy suite
    // asserts classes on it.
    const root = (host.firstElementChild as HTMLElement) ?? host;
    const target =
      root.matches('button, input, select, textarea, a[href], dialog')
        ? root
        : (root.querySelector<HTMLElement>(
            'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
          ) ?? root);

    return { root, target, cleanup: () => fixture.destroy() };
  },
  async press(element, key) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    if (key === 'Enter' || key === 'Space') element.click();
  },
};

runAnatomySuite(harness);
runKeyboardSuite(harness);

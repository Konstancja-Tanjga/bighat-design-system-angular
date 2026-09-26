import { NgTemplateOutlet } from '@angular/common';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { StateBlockScope, StateBlockState } from '../vocabulary';

/**
 * StateBlock, from `packages/spec/components/state-block.json`.
 *
 * The announcement strategy is the entire component, and it is the reason this
 * is a component in both libraries rather than a guideline in one:
 *
 *   loading  polite   role="status"  — transient, must not interrupt reading
 *   error    assertive role="alert"  — the user's action did not happen
 *   empty    silent   no role        — the successful result of a request;
 *                                      announcing it is noise
 *
 * Angular makes one of these easier to get wrong than React does. `role` is
 * bound as an attribute here, and a *changing* role on a live region is
 * unreliable across screen readers: some only register the region when the
 * node is inserted. So the three states render three separate host elements
 * via a switch rather than one element with a bound role — which is more
 * template than React needs, and correct where React's version was only
 * accidentally correct (its `state` change usually remounts the node anyway).
 */
@Component({
  imports: [NgTemplateOutlet],
  selector: 'bh-state-block',
  encapsulation: ViewEncapsulation.None,
  template: `
    @switch (state()) {
      @case ('loading') {
        <div [class]="classes()" role="status" aria-busy="true" [attr.data-state]="state()">
          <span class="bh-stateblock__spinner" aria-hidden="true"></span>
          <ng-container [ngTemplateOutlet]="body" />
        </div>
      }
      @case ('error') {
        <div [class]="classes()" role="alert" [attr.data-state]="state()">
          <ng-content select="[bhIcon]" />
          <ng-container [ngTemplateOutlet]="body" />
        </div>
      }
      @default {
        <div [class]="classes()" [attr.data-state]="state()">
          <ng-content select="[bhIcon]" />
          <ng-container [ngTemplateOutlet]="body" />
        </div>
      }
    }

    <ng-template #body>
      <!-- A <p>, not a heading: this block appears inside table cells, where a
           heading would corrupt the document outline. -->
      <p class="bh-stateblock__title">{{ title() }}</p>
      <ng-content select="[bhDescription]" />
      <div class="bh-stateblock__actions">
        <ng-content select="[bhAction]" />
        <ng-content select="[bhSecondaryAction]" />
      </div>
      <ng-content select="[bhDiagnostics]" />
    </ng-template>
  `,
})
export class BhStateBlock {
  readonly state = input.required<StateBlockState>();

  /** One line, sentence case, no trailing period. */
  readonly title = input.required<string>();

  /** Renamed from `density` in 4.0; density now means row spacing everywhere. */
  readonly scope = input<StateBlockScope>('section');

  protected readonly classes = computed(
    () => `bh-stateblock bh-stateblock--${this.state()} bh-stateblock--${this.scope()}`,
  );
}

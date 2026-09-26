import { NgTemplateOutlet } from '@angular/common';
import { Component, ViewEncapsulation, inject } from '@angular/core';

import { BhButton } from '../button/button.directive';
import { BhToastService } from './toast.service';

/**
 * Renders the queue. Mounted once, at the application root.
 *
 * The announcement split is the whole component, and it mirrors StateBlock's
 * reasoning: `critical` and `warning` are assertive, because something the
 * user did failed or is about to; `info` and `success` are polite, because
 * interrupting someone to confirm that what they asked for happened is noise.
 *
 * Two separate live regions rather than one with a bound politeness. A
 * changing `aria-live` on an existing region is unreliable — several screen
 * readers only register the region when the node is inserted — so the
 * politeness is a property of which region a toast lands in.
 */
@Component({
  imports: [NgTemplateOutlet, BhButton],
  selector: 'bh-toast-host',
  encapsulation: ViewEncapsulation.None,
  template: `
    <!--
      Same DOM as React's ToastProvider: a fixed viewport holding two ordered
      lists, each a live region from first paint. aria-live is static on each
      list and no role is bound, so politeness never changes on a live node.
    -->
    <div class="bh-toast-viewport">
      <ol class="bh-toast-region" aria-live="polite" aria-relevant="additions" data-tone="polite">
        @for (toast of polite(); track toast.id) {
          <ng-container [ngTemplateOutlet]="item" [ngTemplateOutletContext]="{ $implicit: toast }" />
        }
      </ol>

      <ol class="bh-toast-region" aria-live="assertive" aria-relevant="additions" data-tone="assertive">
        @for (toast of assertive(); track toast.id) {
          <ng-container [ngTemplateOutlet]="item" [ngTemplateOutletContext]="{ $implicit: toast }" />
        }
      </ol>
    </div>

    <ng-template #item let-toast>
      <li [class]="'bh-toast bh-toast--' + toast.tone" [attr.data-tone]="toast.tone">
        <div class="bh-toast__content">
          <p class="bh-toast__title">{{ toast.title }}</p>
          @if (toast.description) {
            <p class="bh-toast__description">{{ toast.description }}</p>
          }
        </div>
        <div class="bh-toast__actions">
          @if (toast.action) {
            <button bhButton variant="ghost" size="sm" type="button" (click)="run(toast)">
              {{ toast.action.label }}
            </button>
          }
          <!--
            Always present, even on an auto-dismissing toast: a user who reads
            slowly should not have to wait it out, and a user with a screen
            reader needs a way to clear the region.
          -->
          <button
            bhButton
            variant="ghost"
            size="sm"
            type="button"
            class="bh-toast__close"
            [attr.aria-label]="'Dismiss: ' + toast.title"
            (click)="toasts.dismiss(toast.id)"
          >
            ✕
          </button>
        </div>
      </li>
    </ng-template>
  `,
})
export class BhToastHost {
  protected readonly toasts = inject(BhToastService);

  protected readonly polite = () =>
    this.toasts.toasts().filter((t) => t.tone === 'info' || t.tone === 'success');

  protected readonly assertive = () =>
    this.toasts.toasts().filter((t) => t.tone === 'warning' || t.tone === 'critical');

  protected run(toast: { id: string; action?: { run: () => void } }): void {
    toast.action?.run();
    this.toasts.dismiss(toast.id);
  }
}

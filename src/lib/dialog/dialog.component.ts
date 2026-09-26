import {
  Component,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';

import { BhButton } from '../button/button.directive';
import type { DialogSize } from '../vocabulary';

/**
 * Dialog, from `packages/spec/components/dialog.json`.
 *
 * Built on the native `<dialog>` element, same as the React version, and for
 * the same four reasons: focus is trapped, the rest of the page goes `inert`,
 * Escape is cancellable, and the top layer means there is no z-index in this
 * component at all.
 *
 * Worth stating because the obvious Angular answer is `@angular/cdk/overlay`,
 * and it would be the wrong one here. The CDK gives you a focus trap and a
 * scroll block by re-implementing in TypeScript what the platform now does in
 * the browser, and it renders into a container the token stylesheet then has to
 * be taught about. `<dialog>` needs neither. The CDK is still the right tool
 * for Tooltip and Menu, where the platform has no equivalent — it is a tool,
 * not a house style.
 */
@Component({
  imports: [BhButton],
  selector: 'bh-dialog',
  encapsulation: ViewEncapsulation.None,
  template: `
    <dialog
      #dialog
      [class]="'bh-dialog bh-dialog--' + size()"
      [attr.aria-labelledby]="titleId"
      (cancel)="onCancel($event)"
      (close)="open.set(false)"
    >
      <!--
        The panel carries the padding and the column layout, as in React: the
        dialog element itself is only the glass and its corner, so nothing
        inside can run into the 26px radius.
      -->
      <div class="bh-dialog__panel">
        <header class="bh-dialog__header">
          <h2 class="bh-dialog__title" [id]="titleId">{{ title() }}</h2>
          @if (dismissible()) {
            <button
              bhButton
              variant="ghost"
              size="sm"
              class="bh-dialog__close"
              type="button"
              [attr.aria-label]="closeLabel()"
              (click)="close()"
            >
              ✕
            </button>
          }
        </header>

        <div class="bh-dialog__body">
          <ng-content />
        </div>

        <footer class="bh-dialog__footer">
          <ng-content select="[bhFooter]" />
        </footer>
      </div>
    </dialog>
  `,
})
export class BhDialog {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly size = input<DialogSize>('md');

  /**
   * When false, Escape and the backdrop stop closing it — but the close button
   * stays. Removing every exit is never correct, and `<dialog>` with no way out
   * is a keyboard trap (WCAG 2.1.2).
   */
  readonly dismissible = input(true);
  readonly closeLabel = input('Close');

  readonly closed = output<void>();

  private static nextId = 0;
  protected readonly titleId = `bh-dialog-title-${BhDialog.nextId++}`;

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The opener is captured when `open` becomes true, not read from
   * `document.activeElement` at close time — by then it may be gone, and
   * "focus goes back to where it came from" quietly becomes "focus goes to
   * <body>", which drops a keyboard user at the top of the page.
   */
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      if (this.open()) {
        this.opener = this.host.nativeElement.ownerDocument.activeElement as HTMLElement | null;
        if (!dialog.open) dialog.showModal();
        // First focusable in the body — never the close button, which invites
        // dismissing the dialog by reflex.
        dialog
          .querySelector<HTMLElement>(
            '.bh-dialog__body :is(input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"]))',
          )
          ?.focus();
      } else if (dialog.open) {
        dialog.close();
        this.opener?.focus();
        this.opener = null;
      }
    });
  }

  protected onCancel(event: Event): void {
    if (!this.dismissible()) {
      event.preventDefault();
      return;
    }
    this.close();
  }

  protected close(): void {
    this.open.set(false);
    this.closed.emit();
  }
}

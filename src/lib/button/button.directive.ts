import { Directive, ElementRef, computed, effect, inject, input } from '@angular/core';

import type { ButtonSize, ButtonTone, ButtonVariant } from '../vocabulary';

/**
 * Button, from `packages/spec/components/button.json`.
 *
 * A directive rather than a component, and that is the one place this
 * implementation deliberately does not mirror React.
 *
 * React has to wrap: `<Button>` renders its own `<button>` because JSX has no
 * way to attach behaviour to an element the consumer wrote. Angular does, and
 * wrapping anyway costs real things — the consumer loses `type="submit"`,
 * `form`, `formaction`, `[routerLink]`, `(click)` with a typed event, and the
 * ability to put the button inside a `<form>` and have it work. Every one of
 * those turns into a pass-through prop, and pass-through props are how a
 * wrapper accumulates the entire native API one bug report at a time.
 *
 * ```html
 * <button bhButton variant="secondary" tone="critical" [loading]="saving()">
 *   <bh-icon bhIconStart name="trash" />
 *   Delete workspace
 * </button>
 * ```
 *
 * The consumer's element stays theirs. The directive only owns the class list
 * and the two loading attributes, which is the whole contract.
 *
 * The spec's `children` slot has no expression here on purpose: the label is
 * whatever the consumer put inside their own button. `bhIconStart` and
 * `bhIconEnd` are marker attributes the stylesheet positions; nothing needs to
 * project them, because they are already in the right place in the DOM.
 */
@Directive({
  selector: 'button[bhButton], a[bhButton]',
  host: {
    '[class]': 'classes()',
    // A loading button keeps its place in the tab order — losing focus
    // mid-interaction is worse than a briefly inert control. aria-disabled plus
    // the click guard below is what makes it inert without removing it.
    '[attr.aria-disabled]': 'loading() || null',
    '[attr.aria-busy]': 'loading() || null',
    '(click)': 'guard($event)',
  },
})
export class BhButton {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly variant = input<ButtonVariant>('primary');
  readonly tone = input<ButtonTone>('neutral');
  readonly size = input<ButtonSize>('md');

  /** The action is in flight. Renders a spinner, blocks the click, keeps focus. */
  readonly loading = input(false);

  /** Visually hidden, announced while `loading`. Localised by the consumer. */
  readonly loadingLabel = input('Loading');

  readonly fullWidth = input(false);

  protected readonly classes = computed(() =>
    [
      'bh-button',
      'bh-focusable',
      `bh-button--${this.variant()}`,
      `bh-button--${this.size()}`,
      this.tone() === 'critical' && 'bh-button--critical',
      this.fullWidth() && 'bh-button--full',
      this.loading() && 'bh-button--loading',
    ]
      .filter(Boolean)
      .join(' '),
  );

  /**
   * The spinner and its screen-reader label are two elements React renders as
   * children. A directive has no template, so they are written to the host
   * directly — the alternative is a wrapper component, which is what this
   * design was chosen to avoid.
   *
   * The label is a live-region-free visually-hidden span: the button announces
   * itself as busy via aria-busy, and a second announcement would double up.
   */
  constructor() {
    effect((onCleanup) => {
      const element = this.host.nativeElement;
      if (!this.loading()) return;

      const spinner = document.createElement('span');
      spinner.className = 'bh-button__spinner';
      spinner.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'bh-visually-hidden';
      label.textContent = this.loadingLabel();

      element.prepend(spinner, label);
      onCleanup(() => {
        spinner.remove();
        label.remove();
      });
    });
  }

  protected guard(event: Event): void {
    if (this.loading()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}

import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

/**
 * Checkbox, from `packages/spec/components/checkbox.json`.
 *
 * This is the component where React gave the system no obligation and Angular
 * does. In React a checkbox is an `<input>` with a `checked` prop and the
 * consumer's own form library does the rest — so `Checkbox.tsx` has nothing to
 * say about forms at all. In Angular the component *is* the integration point,
 * and getting it wrong means the control works in stories and fails in a form.
 *
 * Implemented against `FormCheckboxControl` rather than `ControlValueAccessor`:
 *
 *   - the whole contract is one `model()` named `checked`, instead of four
 *     methods, a providers array and a `forwardRef`;
 *   - `[formField]` binds it to Signal Forms;
 *   - and it still drops into an existing reactive or template-driven form,
 *     because the interop runs both ways. So this does not have to wait for
 *     the consuming application to migrate.
 *
 * The two must never both be implemented on one component. If a consumer needs
 * the old interface for a control this library does not provide, they write
 * their own — they do not get a second interface on this one.
 *
 * `encapsulation: None` and no `styles`: every rule this renders lives in
 * `@bighatpoland/css`, the same stylesheet the React library ships. That is the
 * architecture working — two behaviour layers, one appearance.
 */
@Component({
  selector: 'bh-checkbox',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="bh-checkbox-field">
      <div class="bh-checkbox">
        <input
          #input
          type="checkbox"
          class="bh-checkbox__input bh-focusable"
          [id]="inputId()"
          [checked]="checked()"
          [disabled]="disabled()"
          [required]="required()"
          [attr.aria-invalid]="error() ? true : null"
          [attr.aria-describedby]="describedBy() || null"
          (change)="checked.set($any($event.target).checked)"
          (blur)="touched.set(true)"
        />
        <span class="bh-checkbox__box" aria-hidden="true"></span>
        <label class="bh-checkbox__label" [attr.for]="inputId()">
          <ng-content />
          @if (required()) {
            <span class="bh-field__required" aria-hidden="true">*</span>
          }
        </label>
      </div>

      <!--
        Error before description in the DOM as well as in aria-describedby:
        a screen reader user hears the failure before the hint, and a sighted
        user reading top-down gets the same order. Two orderings that disagree
        is a bug nobody sees until they use both.
      -->
      @if (error()) {
        <p class="bh-field__error bh-checkbox__hint" [id]="errorId()">{{ error() }}</p>
      }
      <ng-content select="[bhDescription]" />
    </div>
  `,
})
export class BhCheckbox implements FormCheckboxControl {
  /**
   * The entire FormCheckboxControl contract. Must be named `checked` and must be
   * a `model()` — the `[formField]` directive looks for exactly this.
   */
  readonly checked = model(false);

  readonly disabled = input(false);
  readonly required = input(false);
  readonly error = input<string | undefined>(undefined);

  /**
   * Mixed state: some children checked.
   *
   * `indeterminate` is a DOM *property*, not an attribute, so it cannot be set
   * from the template — `[attr.indeterminate]` renders an attribute the browser
   * ignores, and the control then announces "not checked" while looking mixed.
   * React sets it in an effect on a ref; the Angular equivalent is an `effect()`
   * writing to the element. This is the one line in the file that is a
   * translation of a workaround rather than of a design.
   */
  readonly indeterminate = input(false);

  /** Set by Signal Forms; also settable directly so the component works alone. */
  readonly touched = model(false);

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');

  private static nextId = 0;
  private readonly uid = `bh-checkbox-${BhCheckbox.nextId++}`;

  readonly inputId = input<string>(this.uid);
  protected readonly errorId = computed(() => `${this.inputId()}-error`);
  protected readonly describedBy = computed(() => (this.error() ? this.errorId() : ''));

  constructor() {
    effect(() => {
      this.inputRef().nativeElement.indeterminate = this.indeterminate();
    });
  }

  /** Called by Signal Forms when the form asks the control to take focus. */
  focus(): void {
    this.inputRef().nativeElement.focus();
  }
}

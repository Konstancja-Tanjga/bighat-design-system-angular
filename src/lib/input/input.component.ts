import { Component, ElementRef, ViewEncapsulation, computed, input, model, viewChild } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

/**
 * Input, from `packages/spec/components/input.json`.
 *
 * `FormValueControl<string>` rather than `ControlValueAccessor`: the whole
 * contract is a `model()` named `value`, and the `[formField]` directive binds
 * it. It still works inside an existing reactive or template-driven form.
 *
 * The field wrapper — label, description, error, and the id namespace tying
 * them together with `aria-describedby` — is the part worth copying exactly
 * from React rather than reinventing. Every form control in the system shares
 * it, and it is the single most common thing a component library gets subtly
 * wrong: an error that is visible but not announced, or a description that is
 * announced but not associated.
 */
@Component({
  selector: 'bh-input',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="bh-input-field">
      <label class="bh-field__label" [attr.for]="inputId()">
        {{ label() }}
        @if (required()) {
          <span class="bh-field__required" aria-hidden="true">*</span>
        }
      </label>

      <div class="bh-input__wrapper">
        <ng-content select="[bhPrefix]" />
        <input
          #input
          class="bh-input bh-focusable"
          [id]="inputId()"
          [type]="type()"
          [value]="value()"
          [disabled]="disabled()"
          [required]="required()"
          [readOnly]="readonly()"
          [attr.placeholder]="placeholder()"
          [attr.aria-invalid]="error() ? true : null"
          [attr.aria-describedby]="describedBy() || null"
          (input)="value.set($any($event.target).value)"
          (blur)="touched.set(true)"
        />
        <ng-content select="[bhSuffix]" />
      </div>

      <!--
        Error first, description second — in the DOM and in aria-describedby.
        Two orderings that disagree is a bug nobody sees until they use both a
        screen reader and their eyes.
      -->
      @if (error()) {
        <p class="bh-field__error" [id]="errorId()">{{ error() }}</p>
      }
      @if (description()) {
        <p class="bh-field__description" [id]="descriptionId()">{{ description() }}</p>
      }
    </div>
  `,
})
export class BhInput implements FormValueControl<string> {
  /** The entire FormValueControl contract. Must be named `value`. */
  readonly value = model('');

  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password' | 'search' | 'tel' | 'url'>('text');
  readonly placeholder = input<string | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);
  readonly error = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = model(false);

  private static nextId = 0;
  readonly inputId = input<string>(`bh-input-${BhInput.nextId++}`);

  protected readonly errorId = computed(() => `${this.inputId()}-error`);
  protected readonly descriptionId = computed(() => `${this.inputId()}-description`);
  protected readonly describedBy = computed(() =>
    [this.error() ? this.errorId() : null, this.description() ? this.descriptionId() : null]
      .filter(Boolean)
      .join(' '),
  );

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');

  focus(): void {
    this.inputRef().nativeElement.focus();
  }
}

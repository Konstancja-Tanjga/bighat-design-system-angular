import { Component, ElementRef, ViewEncapsulation, computed, input, model, viewChild } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

/**
 * Select, from `packages/spec/components/select.json`.
 *
 * A native `<select>`, same as React. Worth defending, because the obvious
 * Angular move is a listbox built on `@angular/aria` and it would be worse
 * here: a native select gets the platform's own picker on mobile and in
 * assistive tech, which no custom listbox matches, and it needs no keyboard
 * implementation at all.
 *
 * `Combobox` is the component for when the platform select is genuinely not
 * enough — filtering, async options, multi-select — and that one *is* built on
 * `@angular/aria`. Having both is the design; replacing this one with the
 * other is not an upgrade.
 *
 * Options come as data rather than projected content. Content projection into
 * a native `<select>` cannot work: only `<option>` and `<optgroup>` are valid
 * children, and Angular's projection wrapper would be neither.
 */
export type BhSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
};

@Component({
  selector: 'bh-select',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="bh-select-field">
      <label class="bh-field__label" [attr.for]="selectId()">
        {{ label() }}
        @if (required()) {
          <span class="bh-field__required" aria-hidden="true">*</span>
        }
      </label>

      <div class="bh-select__wrapper">
        <select
          #select
          class="bh-select bh-focusable"
          [id]="selectId()"
          [value]="value()"
          [disabled]="disabled()"
          [required]="required()"
          [attr.aria-invalid]="error() ? true : null"
          [attr.aria-describedby]="describedBy() || null"
          (change)="value.set($any($event.target).value)"
          (blur)="touched.set(true)"
        >
          @if (placeholder()) {
            <option value="" disabled [selected]="!value()">{{ placeholder() }}</option>
          }
          @for (group of grouped(); track group.name) {
            @if (group.name) {
              <optgroup [label]="group.name">
                @for (option of group.options; track option.value) {
                  <option [value]="option.value" [disabled]="option.disabled ?? false">
                    {{ option.label }}
                  </option>
                }
              </optgroup>
            } @else {
              @for (option of group.options; track option.value) {
                <option [value]="option.value" [disabled]="option.disabled ?? false">
                  {{ option.label }}
                </option>
              }
            }
          }
        </select>
        <span class="bh-select__arrow" aria-hidden="true"></span>
      </div>

      @if (error()) {
        <p class="bh-field__error" [id]="errorId()">{{ error() }}</p>
      }
      @if (description()) {
        <p class="bh-field__description" [id]="descriptionId()">{{ description() }}</p>
      }
    </div>
  `,
})
export class BhSelect implements FormValueControl<string> {
  readonly value = model('');

  readonly label = input.required<string>();
  readonly options = input.required<BhSelectOption[]>();
  readonly placeholder = input<string | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);
  readonly error = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly touched = model(false);

  private static nextId = 0;
  readonly selectId = input<string>(`bh-select-${BhSelect.nextId++}`);

  protected readonly errorId = computed(() => `${this.selectId()}-error`);
  protected readonly descriptionId = computed(() => `${this.selectId()}-description`);
  protected readonly describedBy = computed(() =>
    [this.error() ? this.errorId() : null, this.description() ? this.descriptionId() : null]
      .filter(Boolean)
      .join(' '),
  );

  /** Preserves declaration order, and keeps ungrouped options where they were. */
  protected readonly grouped = computed(() => {
    const groups: Array<{ name: string | undefined; options: BhSelectOption[] }> = [];
    for (const option of this.options()) {
      const last = groups.at(-1);
      if (last && last.name === option.group) last.options.push(option);
      else groups.push({ name: option.group, options: [option] });
    }
    return groups;
  });

  private readonly selectRef = viewChild.required<ElementRef<HTMLSelectElement>>('select');

  focus(): void {
    this.selectRef().nativeElement.focus();
  }
}

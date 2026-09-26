import { Component, signal } from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { BhCheckbox } from './checkbox.component';

const meta: Meta<BhCheckbox> = {
  title: 'Components/Checkbox',
  component: BhCheckbox,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<BhCheckbox>;

/**
 * `form()` needs an injection context, which a story's render function does
 * not have — so the form lives in a host component's field initialisers, the
 * same place it would live in an application.
 */
@Component({
  selector: 'bh-checkbox-in-a-signal-form',
  imports: [BhCheckbox, FormField],
  template: `
    <bh-checkbox [formField]="f.terms">I accept the terms</bh-checkbox>
    <p class="bh-field__description">value: {{ model().terms }}</p>`,
})
class CheckboxInASignalForm {
  protected readonly model = signal({ terms: false });
  protected readonly f = form(this.model, (path) => {
    // A validator lives with the form, not with the control.
    validate(path.terms, ({ value }) =>
      value() ? null : { kind: 'required', message: 'Accept the terms' },
    );
  });
}

export const Default: Story = {
  render: () => ({
    template: `<bh-checkbox>Email me about billing changes</bh-checkbox>`,
  }),
};

export const WithDescription: Story = {
  render: () => ({
    template: `
      <bh-checkbox>
        Email me about billing changes
        <p bhDescription class="bh-field__description">
          Invoices and payment failures only. Not product news.
        </p>
      </bh-checkbox>`,
  }),
};

export const Invalid: Story = {
  render: () => ({
    template: `<bh-checkbox error="Accept the terms to continue">I accept the terms</bh-checkbox>`,
  }),
};

/** A DOM property, not an attribute — see the effect() in the component. */
export const Indeterminate: Story = {
  render: () => ({
    template: `<bh-checkbox [indeterminate]="true">Select all invoices</bh-checkbox>`,
  }),
};

/**
 * Not in the React stories, because React has no forms framework for it to
 * integrate with. It exists here because the integration is the part of this
 * component most likely to be broken while every other story still passes.
 *
 * This is a legitimate divergence, and it is recorded as one in the spec's
 * `implementations.divergence` field rather than left for the parity check to
 * flag as a missing React story.
 */
export const InASignalForm: Story = {
  decorators: [moduleMetadata({ imports: [CheckboxInASignalForm] })],
  render: () => ({
    template: `<bh-checkbox-in-a-signal-form />`,
  }),
};

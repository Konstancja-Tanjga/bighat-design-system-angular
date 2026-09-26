import type { Meta, StoryObj } from '@storybook/angular-vite';

import { BhInput } from './input.component';

const meta: Meta<BhInput> = {
  title: 'Components/Input',
  component: BhInput,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'search', 'tel', 'url'] },
  },
};
export default meta;

type Story = StoryObj<BhInput>;

export const Default: Story = {
  args: { label: 'Workspace name' },
  render: (args) => ({ props: args, template: `<bh-input [label]="label" />` }),
};

export const WithDescription: Story = {
  args: { label: 'Invoice reference', description: 'Appears on the PDF and in the payment reference.' },
  render: (args) => ({
    props: args,
    template: `<bh-input [label]="label" [description]="description" />`,
  }),
};

export const Invalid: Story = {
  args: { label: 'Email', type: 'email', error: 'Enter an address we can reach you at' },
  render: (args) => ({
    props: args,
    template: `<bh-input [label]="label" [type]="type" [error]="error" />`,
  }),
};

export const Disabled: Story = {
  args: { label: 'Workspace name', disabled: true },
  render: (args) => ({ props: args, template: `<bh-input [label]="label" [disabled]="disabled" />` }),
};

/**
 * The React story is called HiddenLabel and demonstrates the same thing this
 * one does: there is no way to hide the label. `label` is required and always
 * rendered, and this story exists to document the refusal rather than a
 * feature — a placeholder is not a label (it disappears on focus and is not
 * a voice-control target), and a search field with only an icon is the most
 * common version of that mistake.
 */
export const HiddenLabel: Story = {
  args: { label: 'Search invoices', type: 'search', placeholder: 'INV-2041' },
  render: (args) => ({
    props: args,
    template: `<bh-input [label]="label" [type]="type" [placeholder]="placeholder" />`,
  }),
};

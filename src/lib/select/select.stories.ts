import type { Meta, StoryObj } from '@storybook/angular-vite';

import { BhSelect } from './select.component';

const meta: Meta<BhSelect> = {
  title: 'Components/Select',
  component: BhSelect,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<BhSelect>;

const options = [
  { value: 'pln', label: 'Polish złoty', group: 'Local' },
  { value: 'eur', label: 'Euro', group: 'Local' },
  { value: 'usd', label: 'US dollar', group: 'Other' },
  { value: 'gbp', label: 'Pound sterling', group: 'Other' },
];

export const Default: Story = {
  args: { label: 'Currency', options },
  render: (args) => ({ props: args, template: `<bh-select [label]="label" [options]="options" />` }),
};

export const WithPlaceholder: Story = {
  args: { label: 'Currency', options, placeholder: 'Choose a currency' },
  render: (args) => ({
    props: args,
    template: `<bh-select [label]="label" [options]="options" [placeholder]="placeholder" />`,
  }),
};

export const Invalid: Story = {
  args: { label: 'Currency', options, error: 'Choose the currency the invoice is issued in' },
  render: (args) => ({
    props: args,
    template: `<bh-select [label]="label" [options]="options" [error]="error" />`,
  }),
};

import type { Meta, StoryObj } from '@storybook/angular-vite';

import { BhButton } from './button.directive';

/**
 * Story names are identical to Button.stories.tsx, on purpose.
 * scripts/check-parity.mjs asserts it: a story that exists in one Storybook and
 * not the other is a variant one framework's users cannot see documented.
 *
 * `component` must be set for Compodoc to attach extracted docs — without it
 * the Controls panel renders empty and the library looks undocumented.
 */
const meta: Meta<BhButton> = {
  title: 'Components/Button',
  component: BhButton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost'] },
    tone: { control: 'inline-radio', options: ['neutral', 'critical'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;

type Story = StoryObj<BhButton>;

/**
 * A directive has no template, so every story renders the consumer's own
 * `<button>`. That is the point of the design, and it means `args` alone can
 * never express a story — each one needs `render`. The React stories get their
 * label from `children`; here it is just text in the element.
 */
export const Primary: Story = {
  args: { variant: 'primary', size: 'md' },
  render: (args) => ({
    props: args,
    template: `<button bhButton [variant]="variant" [size]="size">Save changes</button>`,
  }),
};

export const Weights: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:var(--bh-gap-snug); align-items:center">
        <button bhButton variant="primary">Save changes</button>
        <button bhButton variant="secondary">Cancel</button>
        <button bhButton variant="ghost">Learn more</button>
      </div>`,
  }),
};

export const CriticalTone: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:var(--bh-gap-snug); align-items:center">
        <button bhButton variant="primary" tone="critical">Delete workspace</button>
        <button bhButton variant="secondary" tone="critical">Delete workspace</button>
      </div>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:var(--bh-gap-snug); align-items:center">
        <button bhButton size="sm">Small</button>
        <button bhButton size="md">Medium</button>
        <button bhButton size="lg">Large</button>
      </div>`,
  }),
};

/** Stays focusable and keeps its width; the click is guarded, not disabled. */
export const Loading: Story = {
  args: { loading: true, loadingLabel: 'Saving' },
  render: (args) => ({
    props: args,
    template: `<button bhButton [loading]="loading" [loadingLabel]="loadingLabel">Save changes</button>`,
  }),
};

export const Disabled: Story = {
  render: () => ({
    template: `<button bhButton disabled>Save changes</button>`,
  }),
};

export const FullWidth: Story = {
  render: () => ({
    template: `
      <div style="max-width:320px">
        <button bhButton [fullWidth]="true">Save changes</button>
      </div>`,
  }),
};

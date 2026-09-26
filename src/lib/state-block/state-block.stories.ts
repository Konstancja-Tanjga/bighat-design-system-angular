import type { Meta, StoryObj } from '@storybook/angular-vite';

import { BhButton } from '../button/button.directive';
import { BhStateBlock } from './state-block.component';

const meta: Meta<BhStateBlock> = {
  title: 'Components/StateBlock',
  component: BhStateBlock,
  tags: ['autodocs'],
  argTypes: {
    state: { control: 'inline-radio', options: ['empty', 'loading', 'error'] },
    scope: { control: 'inline-radio', options: ['inline', 'section', 'page'] },
  },
};
export default meta;

type Story = StoryObj<BhStateBlock>;

export const Empty: Story = {
  args: { state: 'empty', title: 'No invoices yet' },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports: [BhButton] },
    template: `
      <bh-state-block [state]="state" [title]="title">
        <p bhDescription class="bh-stateblock__description">
          Invoices appear here once you send the first one.
        </p>
        <button bhAction bhButton size="sm">Create invoice</button>
      </bh-state-block>`,
  }),
};

/**
 * The distinction that gets collapsed everywhere: nothing yet needs a create
 * action, nothing matching needs a clear-filters action, and offering the wrong
 * one is worse than offering none.
 */
export const FirstUseVersusFiltered: Story = {
  render: () => ({
    moduleMetadata: { imports: [BhButton] },
    template: `
      <div style="display:grid; gap:var(--bh-gap-loose)">
        <bh-state-block state="empty" title="No invoices yet">
          <button bhAction bhButton size="sm">Create invoice</button>
        </bh-state-block>
        <bh-state-block state="empty" title="No invoices match these filters">
          <button bhAction bhButton size="sm" variant="secondary">Clear filters</button>
        </bh-state-block>
      </div>`,
  }),
};

/** role="status" — polite, must not interrupt whatever the user is reading. */
export const Loading: Story = {
  args: { state: 'loading', title: 'Loading invoices' },
  render: (args) => ({ props: args, template: `<bh-state-block [state]="state" [title]="title" />` }),
};

/** role="alert" — assertive: the user's action did not happen. */
export const ErrorState: Story = {
  render: () => ({
    moduleMetadata: { imports: [BhButton] },
    template: `
      <bh-state-block state="error" title="We could not load your invoices">
        <p bhDescription class="bh-stateblock__description">
          The billing service did not respond. Your data has not changed.
        </p>
        <button bhAction bhButton size="sm">Try again</button>
        <details bhDiagnostics class="bh-stateblock__diagnostics">
          <summary>Details</summary>
          correlation id 8f2c-41ab
        </details>
      </bh-state-block>`,
  }),
};

/**
 * Named `Densities` in the React 3.x stories, when the prop was called
 * `density`. The prop is `scope` from 4.0; the story name stays put so the
 * parity check keeps matching, and the rename is recorded in the spec.
 */
export const Densities: Story = {
  render: () => ({
    template: `
      <div style="display:grid; gap:var(--bh-gap-loose)">
        <bh-state-block state="empty" scope="inline" title="No rows" />
        <bh-state-block state="empty" scope="section" title="No invoices yet" />
      </div>`,
  }),
};

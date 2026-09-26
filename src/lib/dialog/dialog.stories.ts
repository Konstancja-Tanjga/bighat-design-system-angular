import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';

import { BhButton } from '../button/button.directive';
import { BhDialog } from './dialog.component';

const meta: Meta<BhDialog> = {
  title: 'Components/Dialog',
  component: BhDialog,
  tags: ['autodocs'],
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
};
export default meta;

type Story = StoryObj<BhDialog>;

/**
 * Rendered closed by default, same as the React story: a dialog that opens on
 * load cannot be reached by the a11y addon's automated pass, because the
 * snapshot is taken before the top layer exists.
 */
export const Default: Story = {
  render: () => {
    const open = signal(false);
    return {
      props: { open },
      moduleMetadata: { imports: [BhButton] },
      template: `
        <button bhButton variant="secondary" (click)="open.set(true)">Rename workspace</button>
        <bh-dialog [(open)]="open" title="Rename workspace">
          <label class="bh-field__label" for="name">Workspace name</label>
          <input id="name" class="bh-input" value="Nordwind" />
          <div bhFooter style="display:flex; gap:var(--bh-gap-snug); justify-content:flex-end">
            <button bhButton variant="secondary" (click)="open.set(false)">Cancel</button>
            <button bhButton (click)="open.set(false)">Rename</button>
          </div>
        </bh-dialog>`,
    };
  },
};

/** The primary action names the verb and the object. Never "OK". */
export const DestructiveConfirmation: Story = {
  render: () => {
    const open = signal(false);
    return {
      props: { open },
      moduleMetadata: { imports: [BhButton] },
      template: `
        <button bhButton variant="secondary" tone="critical" (click)="open.set(true)">
          Delete workspace
        </button>
        <bh-dialog [(open)]="open" size="sm" title="Delete this workspace?">
          <p>Everything in Nordwind is removed, including 43 invoices. This cannot be undone.</p>
          <div bhFooter style="display:flex; gap:var(--bh-gap-snug); justify-content:flex-end">
            <button bhButton variant="secondary" (click)="open.set(false)">Cancel</button>
            <button bhButton tone="critical" (click)="open.set(false)">Delete workspace</button>
          </div>
        </bh-dialog>`,
    };
  },
};

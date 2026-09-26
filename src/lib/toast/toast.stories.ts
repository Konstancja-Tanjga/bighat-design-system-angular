import { Component, inject } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { BhButton } from '../button/button.directive';
import { BhToastHost } from './toast-host.component';
import { BhToastService } from './toast.service';

const meta: Meta<BhToastHost> = {
  title: 'Components/Toast',
  component: BhToastHost,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<BhToastHost>;

/*
 * inject() needs an injection context, which a story's render function does
 * not have — so each story renders a small host component that injects the
 * service in a field initialiser, as an application component would.
 */
@Component({
  selector: 'bh-toast-playground',
  imports: [BhButton, BhToastHost],
  template: `
      <div style="display:flex; gap:var(--bh-gap-snug); flex-wrap:wrap">
        <button bhButton size="sm" (click)="toasts.notify({ tone: 'success', title: 'Invoice sent', description: 'INV-2041 is on its way.' })">
          Success
        </button>
        <button bhButton size="sm" variant="secondary" (click)="toasts.notify({ tone: 'info', title: 'Export queued' })">
          Info
        </button>
        <button bhButton size="sm" variant="secondary" (click)="toasts.notify({ tone: 'warning', title: 'Two invoices skipped' })">
          Warning
        </button>
        <button bhButton size="sm" variant="secondary" tone="critical" (click)="toasts.notify({ tone: 'critical', title: 'Could not send invoice', description: 'The billing service did not respond.' })">
          Critical
        </button>
      </div>
      <bh-toast-host />`,
})
class ToastPlayground {
  // A service, not a hook — so it is reachable from an interceptor or a
  // route guard, which is where most ERP toasts actually originate.
  protected readonly toasts = inject(BhToastService);
}

@Component({
  selector: 'bh-toast-stack-demo',
  imports: [BhButton, BhToastHost],
  template: `
    <button bhButton size="sm" (click)="fill()">Queue eight</button>
    <bh-toast-host />`,
})
class ToastStackDemo {
  private readonly toasts = inject(BhToastService);

  protected fill(): void {
    for (let i = 0; i < 8; i += 1) {
      this.toasts.notify({ tone: 'info', title: `Notification ${i + 1}`, duration: null });
    }
  }
}

export const Playground: Story = {
  decorators: [moduleMetadata({ imports: [ToastPlayground] })],
  render: () => ({ template: `<bh-toast-playground />` }),
};

/**
 * Info and success land in the polite region, warning and critical in the
 * assertive one — two separate live regions, because a changing aria-live on
 * an existing region is unreliable across screen readers.
 *
 * Critical also has no default duration: auto-dismissing an error is how a
 * user finds out their invoice failed by noticing it an hour later.
 */
export const StackIsCapped: Story = {
  decorators: [moduleMetadata({ imports: [ToastStackDemo] })],
  render: () => ({ template: `<bh-toast-stack-demo />` }),
};

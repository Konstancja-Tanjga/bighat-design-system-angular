import { Injectable, signal } from '@angular/core';

import type { ToastTone } from '../vocabulary';

export type BhToast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** ms, or null to require dismissal. */
  duration?: number | null;
  action?: { label: string; run: () => void };
};

/**
 * Toast, from `packages/spec/components/toast.json`.
 *
 * A service plus a host component, where React has a hook plus a provider.
 * That is the idiomatic split and it is also the better one here: Angular's DI
 * makes the service injectable from anywhere, including a route guard or an
 * interceptor, which is where most toasts in an ERP actually originate. The
 * React version can only be called from inside a component tree.
 *
 * `providedIn: 'root'` on purpose. A toast queue scoped to a module means two
 * queues rendering into two hosts, and the second one appears behind the first.
 */
@Injectable({ providedIn: 'root' })
export class BhToastService {
  private readonly queue = signal<readonly BhToast[]>([]);
  readonly toasts = this.queue.asReadonly();

  private nextId = 0;

  /**
   * Default duration is by tone, not a single number: a success message can go
   * away on its own, a critical one cannot. Auto-dismissing an error is how a
   * user finds out their invoice failed to send by noticing it later.
   */
  private static readonly DEFAULT_DURATION: Record<ToastTone, number | null> = {
    info: 6000,
    success: 4000,
    warning: 8000,
    critical: null,
  };

  notify(toast: Omit<BhToast, 'id'>): string {
    const id = `bh-toast-${this.nextId++}`;
    const duration =
      toast.duration === undefined ? BhToastService.DEFAULT_DURATION[toast.tone] : toast.duration;

    this.queue.update((queue) => [...queue, { ...toast, id, duration }]);

    if (duration !== null) {
      // Not a timer the component owns: a toast whose host unmounts mid-flight
      // would otherwise leak, and the queue is what the host renders from.
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  dismiss(id: string): void {
    this.queue.update((queue) => queue.filter((toast) => toast.id !== id));
  }

  dismissAll(): void {
    this.queue.set([]);
  }
}

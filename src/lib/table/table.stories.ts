import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';

import { BhButton } from '../button/button.directive';
import { BhStateBlock } from '../state-block/state-block.component';
import { BhTable, type BhTableColumn } from './table.component';

type Invoice = { id: string; client: string; due: string; amount: number; status: string };

const meta: Meta<BhTable<Invoice>> = {
  title: 'Components/Table',
  component: BhTable,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<BhTable<Invoice>>;

const rows: Invoice[] = [
  { id: 'INV-2041', client: 'Nordwind sp. z o.o.', due: '12 Sep', amount: 4820, status: 'Pending' },
  { id: 'INV-2040', client: 'Kolej Mazowiecka', due: '5 Sep', amount: 12400, status: 'Paid' },
  { id: 'INV-2039', client: 'Bakalie Nowak', due: '28 Aug', amount: 960, status: 'Overdue' },
];

/** priority 1 never drops as the container narrows; 3 goes first. */
const columns: BhTableColumn<Invoice>[] = [
  { key: 'id', header: 'Invoice', priority: 1, value: (r) => r.id },
  { key: 'client', header: 'Client', priority: 1, sortable: true, value: (r) => r.client },
  { key: 'due', header: 'Due', priority: 3, sortable: true, value: (r) => r.due },
  { key: 'amount', header: 'Amount', priority: 2, align: 'end', sortable: true, value: (r) => r.amount },
  { key: 'status', header: 'Status', priority: 2, value: (r) => r.status },
];

export const Sortable: Story = {
  render: () => ({
    props: { rows, columns, rowKey: (r: Invoice) => r.id, sort: signal(undefined) },
    moduleMetadata: { imports: [BhButton] },
    template: `
      <bh-table
        [rows]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [(sort)]="sort"
        caption="Outstanding invoices"
      />`,
  }),
};

/**
 * The three non-happy states go through the `state` input rather than a
 * projected StateBlock, same as React — they have to render inside a
 * `<td colspan>` the table controls, or they sit outside the row grid.
 */
export const EmptyState: Story = {
  render: () => ({
    props: { rows: [], columns, rowKey: (r: Invoice) => r.id, state: { state: 'empty', title: 'No invoices match these filters' } },
    moduleMetadata: { imports: [BhStateBlock, BhButton] },
    template: `<bh-table [rows]="rows" [columns]="columns" [rowKey]="rowKey" [state]="state" />`,
  }),
};

export const LoadingState: Story = {
  render: () => ({
    props: { rows: [], columns, rowKey: (r: Invoice) => r.id, state: { state: 'loading', title: 'Loading invoices' } },
    moduleMetadata: { imports: [BhStateBlock, BhButton] },
    template: `<bh-table [rows]="rows" [columns]="columns" [rowKey]="rowKey" [state]="state" />`,
  }),
};

export const ErrorState: Story = {
  render: () => ({
    props: { rows: [], columns, rowKey: (r: Invoice) => r.id, state: { state: 'error', title: 'We could not load your invoices' } },
    moduleMetadata: { imports: [BhStateBlock, BhButton] },
    template: `<bh-table [rows]="rows" [columns]="columns" [rowKey]="rowKey" [state]="state" />`,
  }),
};

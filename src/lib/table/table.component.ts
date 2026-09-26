import { NgTemplateOutlet } from '@angular/common';
import { Component, ViewEncapsulation, TemplateRef, computed, contentChild, input, model, output } from '@angular/core';

import { BhButton } from '../button/button.directive';
import { BhStateBlock } from '../state-block/state-block.component';
import type { StateBlockState, TableDensity } from '../vocabulary';

export type BhTableColumn<T> = {
  key: string;
  header: string;
  /** Lower numbers survive longer as the container narrows. 1 never drops. */
  priority?: number;
  align?: 'start' | 'end';
  sortable?: boolean;
  /** Read the cell value. Given rather than inferred, so the type stays honest. */
  value: (row: T) => string | number;
};

export type BhTableSort = { key: string; direction: 'ascending' | 'descending' };

/**
 * Table, from `packages/spec/components/table.json`.
 *
 * The component where the container-query decision earns its keep: the same
 * table sits in `main` at 1200px, in a `SidePanel` at 432px and inside a
 * `Card` at 280px on one screen, so `responsive` is resolved in CSS against
 * the wrapper's width and not in TypeScript against the viewport. Nothing here
 * measures anything.
 *
 * Two Angular-specific choices:
 *
 * `cellTemplate` is a `TemplateRef` rather than a render prop. React passes
 * `renderCell`; Angular's equivalent is a template with `let-row`, and using a
 * function here would lose change detection on the cell contents.
 *
 * `state` takes the StateBlock props rather than a projected StateBlock, same
 * as React — the empty and error states must span every column, which means
 * the table has to render them inside a `<td colspan>` it controls. A
 * projected block would sit outside the table and break the row grid.
 */
@Component({
  imports: [NgTemplateOutlet, BhButton, BhStateBlock],
  selector: 'bh-table',
  encapsulation: ViewEncapsulation.None,
  template: `
    <!--
      The wrapper owns container-type. A component cannot query its own
      container: the query would resolve against the box it is trying to size.
    -->
    <div class="bh-table__wrapper">
      <table
        [class]="classes()"
        [attr.aria-rowcount]="rows().length + 1"
        [attr.aria-busy]="state()?.state === 'loading' || null"
      >
        @if (caption()) {
          <caption class="bh-table__caption">{{ caption() }}</caption>
        }

        <thead class="bh-table__head">
          <tr class="bh-table__row">
            @for (column of columns(); track column.key) {
              <th
                class="bh-table__header"
                scope="col"
                [attr.data-priority]="column.priority ?? 2"
                [attr.data-align]="column.align ?? 'start'"
                [attr.aria-sort]="ariaSort(column.key)"
              >
                @if (column.sortable) {
                  <button
                    bhButton
                    variant="ghost"
                    size="sm"
                    class="bh-table__sort"
                    type="button"
                    (click)="toggleSort(column.key)"
                  >
                    {{ column.header }}
                  </button>
                } @else {
                  {{ column.header }}
                }
              </th>
            }
          </tr>
        </thead>

        <tbody class="bh-table__body">
          @if (state()) {
            <tr class="bh-table__row">
              <td class="bh-table__cell" [attr.colspan]="columns().length">
                <bh-state-block
                  [state]="state()!.state"
                  [title]="state()!.title"
                  scope="inline"
                />
              </td>
            </tr>
          } @else {
            @for (row of rows(); track rowKey()(row)) {
              <tr class="bh-table__row" (click)="rowActivated.emit(row)">
                @for (column of columns(); track column.key) {
                  <td
                    class="bh-table__cell"
                    [attr.data-priority]="column.priority ?? 2"
                    [attr.data-align]="column.align ?? 'start'"
                    [attr.data-label]="column.header"
                  >
                    @if (cell()) {
                      <ng-container
                        [ngTemplateOutlet]="cell()!"
                        [ngTemplateOutletContext]="{ $implicit: row, column }"
                      />
                    } @else {
                      {{ column.value(row) }}
                    }
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class BhTable<T> {
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<BhTableColumn<T>[]>();

  /** Stable identity per row. Required: `track` on an object identity re-renders every row. */
  readonly rowKey = input.required<(row: T) => string | number>();

  readonly caption = input<string | undefined>(undefined);
  readonly density = input<TableDensity>('comfortable');

  /** `scroll` keeps the grid and scrolls; `stack` becomes cards; `priority` drops columns. */
  readonly responsive = input<'scroll' | 'stack' | 'priority'>('scroll');

  readonly sort = model<BhTableSort | undefined>(undefined);
  readonly rowActivated = output<T>();

  /** Empty, loading or error, rendered across every column. */
  readonly state = input<{ state: StateBlockState; title: string } | undefined>(undefined);

  protected readonly cell = contentChild<TemplateRef<{ $implicit: T; column: BhTableColumn<T> }>>('bhCell');

  protected readonly classes = computed(
    () => `bh-table bh-table--${this.density()} bh-table--${this.responsive()}`,
  );

  protected ariaSort(key: string): 'ascending' | 'descending' | 'none' | null {
    const sort = this.sort();
    if (!this.columns().find((c) => c.key === key)?.sortable) return null;
    return sort?.key === key ? sort.direction : 'none';
  }

  protected toggleSort(key: string): void {
    const sort = this.sort();
    this.sort.set(
      sort?.key === key && sort.direction === 'ascending'
        ? { key, direction: 'descending' }
        : { key, direction: 'ascending' },
    );
  }
}

/**
 * Public surface of @bighatpoland/ui-angular.
 *
 * Mirrors src/index.ts in the React package: same names, same order, and every
 * type exported alongside its component. 3.2.0's React package exported named
 * prop types for two components out of 41 — so consumers wrote their own copies
 * of the unions, which is how a design system's vocabulary escapes its control.
 */
export { BhButton } from './lib/button/button.directive';
export { BhInput } from './lib/input/input.component';
export { BhSelect } from './lib/select/select.component';
export { BhTable } from './lib/table/table.component';
export { BhToastHost } from './lib/toast/toast-host.component';
export { BhToastService } from './lib/toast/toast.service';
export { BhCheckbox } from './lib/checkbox/checkbox.component';
export { BhDialog } from './lib/dialog/dialog.component';
export { BhStateBlock } from './lib/state-block/state-block.component';

export type { BhSelectOption } from './lib/select/select.component';
export type { BhTableColumn, BhTableSort } from './lib/table/table.component';
export type { BhToast } from './lib/toast/toast.service';

export type {
  BadgeTone,
  ButtonSize,
  ButtonTone,
  ButtonVariant,
  Density,
  DialogSize,
  ProgressTone,
  Scope,
  Size,
  StateBlockScope,
  StateBlockState,
  TableDensity,
  ToastTone,
  Tone,
  Variant,
} from './lib/vocabulary';

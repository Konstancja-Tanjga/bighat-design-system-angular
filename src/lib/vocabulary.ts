/**
 * The same four axes as `@bighatpoland/ui`'s vocabulary.ts, and deliberately
 * the same file shape.
 *
 * These are string literal unions, not enums. An enum would be more idiomatic
 * in older Angular code and is the wrong choice here: the union is what the
 * React library exports, what `packages/spec` declares, and what a consumer
 * writes in a template (`variant="secondary"`). An enum would force
 * `[variant]="Variant.Secondary"` in every template and make the two libraries
 * disagree about the same value.
 *
 * `scripts/check-parity.mjs` asserts these match the spec's declared values,
 * so this file cannot quietly drift from the React one.
 */

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'critical';
export type Variant = 'primary' | 'secondary' | 'ghost';
export type Size = 'sm' | 'md' | 'lg';
export type Density = 'comfortable' | 'compact';
export type Scope = 'inline' | 'section' | 'page';

export type ButtonTone = Extract<Tone, 'neutral' | 'critical'>;
export type ButtonVariant = Variant;
export type ButtonSize = Size;

export type BadgeTone = Tone;
export type ToastTone = Extract<Tone, 'info' | 'success' | 'warning' | 'critical'>;
export type ProgressTone = Extract<Tone, 'neutral' | 'success' | 'critical'>;

export type DialogSize = Size;
export type StateBlockState = 'empty' | 'loading' | 'error';
export type StateBlockScope = Scope;
export type TableDensity = Density;

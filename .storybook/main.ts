import type { StorybookConfig } from '@storybook/angular-vite';

/**
 * `@storybook/angular-vite`: available for Angular >= 21, same authoring
 * surface as the webpack framework, and it brings the Vitest addon — which
 * matters because the contract-driven keyboard and anatomy suites run under
 * Vitest here exactly as they do in the React repository.
 *
 * `docs/` is globbed before `src/`, so About and Foundations come first in the
 * sidebar. The deployed Storybook is this system's primary artefact, and a
 * reviewer's first screen should be the argument rather than an alphabetical
 * list of controls.
 *
 * `docs/generated/` holds the ARIA conformance and token drift pages, written
 * from the same audits that gate CI, so the published numbers cannot drift
 * from the build's numbers.
 */
const config: StorybookConfig = {
  framework: { name: '@storybook/angular-vite', options: {} },

  stories: [
    '../docs/00-About.mdx',
    '../docs/*.mdx',
    '../docs/generated/*.mdx',
    '../src/**/*.stories.ts',
  ],

  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-themes'],

  docs: { defaultName: 'Docs' },

  /**
   * @storybook/angular-vite extracts Angular metadata in-process (no Compodoc
   * step), so there is no separate script to run. Two facts that are the usual
   * reason an Angular Storybook looks undocumented next to a React one doing
   * less:
   *
   *   1. `component:` must be set on every Meta, or the docgen has nothing to
   *      attach extracted docs to and the Controls panel renders empty.
   *   2. Signal inputs need `emitDecoratorMetadata` and `resolveJsonModule` in
   *      .storybook/tsconfig.json, or the JSDoc above each input() is
   *      extracted but never reaches the panel.
   */
  typescript: { check: true },

  managerHead: (head) => `${head}<title>Big Hat — Angular design system</title>`,
};

export default config;

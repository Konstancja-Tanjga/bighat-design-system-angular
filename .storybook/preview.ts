import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview } from '@storybook/angular-vite';

import '../src/styles/index.css';

const preview: Preview = {
  tags: ['autodocs'],

  parameters: {
    /**
     * `test: 'error'` rather than the default 'todo': every story runs axe and
     * a violation fails the story. The published Storybook therefore cannot
     * contain a story with a known axe violation — which is the difference
     * between an a11y addon that reports and one that gates.
     */
    a11y: { test: 'error' },

    options: {
      storySort: {
        order: [
          'About this system',
          'Foundations',
          'Accessibility',
          'Components',
          'Contributing',
        ],
      },
    },

    docs: { toc: true },
  },

  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;

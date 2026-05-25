import type { Preview } from '@storybook/react-vite';
import '../src/index.css';
import '../src/i18n';
import { withAppProviders } from './decorators/withAppProviders';

const preview: Preview = {
  decorators: [withAppProviders],
  globalTypes: {
    locale: {
      name: 'Sprache',
      description: 'UI language',
      defaultValue: 'de',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'de', title: 'Deutsch' },
          { value: 'en', title: 'English' },
          { value: 'tr', title: 'Turkce' },
          { value: 'it', title: 'Italiano' },
          { value: 'fr', title: 'Francais' },
        ],
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
    a11y: {
      test: 'todo',
    },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Colors', 'Progress'],
          'Components',
          ['UI', 'Layout', 'Tournament'],
          'Patterns',
          ['Management', 'Tournament', 'Presentation'],
        ],
      },
    },
  },
};

export default preview;
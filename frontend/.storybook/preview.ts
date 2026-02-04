import type { Preview } from '@storybook/react'
import { withThemeByClassName } from '@storybook/addon-themes'

// Import the same CSS files the app uses so all design tokens are available
import '../src/styles/globals.css'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: 'hsl(240 10% 3.9%)' },
        { name: 'light', value: 'hsl(0 0% 100%)' },
        { name: 'monet', value: '#FAF8F5' },
      ],
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
        monet: 'monet',
      },
      defaultTheme: 'dark',
    }),
  ],
}

export default preview

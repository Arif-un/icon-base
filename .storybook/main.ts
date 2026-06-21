import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../frontend/src/blocks/icon/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      define: {
        // Replace the SERVER_VARIABLES compile-time constant with the WP global
        SERVER_VARIABLES: 'window.ICON_BASE_',
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), 'frontend/src'),
        },
      },
    })
  },
}

export default config

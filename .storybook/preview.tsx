import React from 'react'
import type { Preview } from '@storybook/react'

// Mock window.wp globals that WP injects at runtime.
// Must run before any story module is evaluated.
const useBlockProps = Object.assign((props: Record<string, unknown> = {}) => props, {
  save: (props: Record<string, unknown> = {}) => props,
})

;(window as any).wp = {
  blockEditor: {
    useBlockProps,
    InspectorControls: ({ children }: any) => children,
    BlockControls: ({ children }: any) => children,
  },
  components: {
    Button: ({ children, onClick, disabled, variant }: any) => (
      <button onClick={onClick} disabled={disabled} data-variant={variant}>
        {children}
      </button>
    ),
    Modal: ({ children, title, onRequestClose, className }: any) => (
      <div role="dialog" aria-label={title} className={className}>
        <button aria-label="Close dialog" onClick={onRequestClose} />
        {children}
      </div>
    ),
  },
}

// Minimal ICON_INDEXA_ global so SERVER_VARIABLES references don't throw at runtime
const serverVariables = {
  nonce: 'storybook-nonce',
  restNonce: 'storybook-rest-nonce',
  apiURL: { base: 'http://localhost:8888/wp-json/IconIndexa/v1', separator: '?' },
  rootURL: 'http://localhost:8888/wp-content/plugins/icon-indexa',
  siteURL: 'http://localhost:8888',
  newPostURL: 'http://localhost:8888/wp-admin/post-new.php',
  pluginSlug: 'icon-indexa',
  routePrefix: 'ICON_INDEXA_',
  onboarding: { adminTour: false, editorGuide: false, version: 1, wizard: false },
}

;(window as any).ICON_INDEXA_ = serverVariables

// Storybook's builder does not apply the `define` that rewrites SERVER_VARIABLES to
// window.ICON_INDEXA_, so the identifier survives into the served module and resolves to
// undefined. Bind it directly too, the same way test.setup.ts does for Vitest.
;(globalThis as any).SERVER_VARIABLES = serverVariables

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
}

export default preview

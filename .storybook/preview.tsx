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

// Minimal ICON_BASE_ global so SERVER_VARIABLES references don't throw at runtime
;(window as any).ICON_BASE_ = {
  nonce: 'storybook-nonce',
  restNonce: 'storybook-rest-nonce',
  apiURL: { base: 'http://localhost:8888/wp-json/IconBase/v1', separator: '?' },
  rootURL: 'http://localhost:8888/wp-content/plugins/icon-base',
  siteURL: 'http://localhost:8888',
}

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

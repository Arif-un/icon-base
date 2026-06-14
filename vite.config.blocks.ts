import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import tailwindcssPostcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import postcss from 'postcss';
import { type Plugin, defineConfig } from 'vite';

const BLOCK_SRC = 'frontend/src/blocks/icon';
const BLOCK_OUT = 'assets/blocks/icon';

function copyBlockAssets(): Plugin {
  return {
    name: 'copy-block-assets',
    buildStart() {
      this.addWatchFile(path.resolve(BLOCK_SRC, 'editor.css'));
    },
    async closeBundle() {
      mkdirSync(BLOCK_OUT, { recursive: true });
      copyFileSync(path.resolve(BLOCK_SRC, 'block.json'), path.resolve(BLOCK_OUT, 'block.json'));

      const editorCssFrom = path.resolve(BLOCK_SRC, 'editor.css');
      const editorCssTo = path.resolve(BLOCK_OUT, 'editor.css');
      const raw = readFileSync(editorCssFrom, 'utf-8');
      const result = await postcss([tailwindcssPostcss()]).process(raw, { from: editorCssFrom, to: editorCssTo });
      writeFileSync(editorCssTo, result.css);

      const assetPhp = `<?php return array('dependencies' => array('react', 'react-jsx-runtime', 'wp-blocks', 'wp-block-editor', 'wp-element', 'wp-components', 'wp-keycodes'), 'version' => '${Date.now()}');`;
      writeFileSync(path.resolve(BLOCK_OUT, 'index.asset.php'), assetPhp);
    },
  };
}

export default defineConfig({
  build: {
    cssCodeSplit: false,
    emptyOutDir: false,
    outDir: BLOCK_OUT,
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      input: path.resolve(import.meta.dirname, BLOCK_SRC, 'index.tsx'),
      output: {
        assetFileNames: 'style-index.css',
        entryFileNames: 'index.js',
        format: 'iife',
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
        },
      },
    },
  },
  define: {
    SERVER_VARIABLES: 'window.ICON_BASE_',
  },
  plugins: [react(), copyBlockAssets()],
  resolve: {
    alias: {
      '@wordpress/element': 'react',
    },
    tsconfigPaths: true,
  },
});

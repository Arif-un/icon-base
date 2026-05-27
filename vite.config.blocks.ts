import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';

const BLOCK_SRC = 'frontend/src/blocks/demo';
const BLOCK_OUT = 'assets/blocks/demo';

function copyBlockAssets(): Plugin {
  return {
    name: 'copy-block-assets',
    writeBundle() {
      mkdirSync(BLOCK_OUT, { recursive: true });
      copyFileSync(path.resolve(BLOCK_SRC, 'block.json'), path.resolve(BLOCK_OUT, 'block.json'));

      const assetPhp = `<?php return array('dependencies' => array('react', 'react-jsx-runtime', 'wp-blocks', 'wp-block-editor', 'wp-element'), 'version' => '${Date.now()}');`;
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
  plugins: [react(), copyBlockAssets()],
});

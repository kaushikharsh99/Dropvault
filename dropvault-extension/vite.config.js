import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { resolve } from 'path';
import fs from 'fs-extra';

// Custom plugin to copy assets
const copyAssets = () => {
  return {
    name: 'copy-assets',
    closeBundle: async () => {
      const src = resolve(__dirname, 'src/assets');
      const dest = resolve(__dirname, 'dist/src/assets');
      if (await fs.pathExists(src)) {
        await fs.copy(src, dest);
      }
    }
  };
};

export default defineConfig({
  plugins: [
    crx({ manifest }),
    copyAssets()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
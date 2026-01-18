import { defineConfig, loadEnv } from 'vite';
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const manifestWithEnv = {
    ...manifest,
    oauth2: {
      ...manifest.oauth2,
      client_id: env.VITE_GOOGLE_CLIENT_ID || manifest.oauth2.client_id,
    },
  };

  return {
    plugins: [
      crx({ manifest: manifestWithEnv }),
      copyAssets()
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };
});
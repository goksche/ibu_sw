/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { apiProxyWithFallbackPlugin } from './vite.apiProxyFallback';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const proxyPrimary = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000';
const proxyFallbackRaw = process.env.VITE_PROXY_FALLBACK;
const proxyFallback =
  proxyFallbackRaw === 'off' || proxyFallbackRaw === 'false'
    ? ''
    : proxyFallbackRaw || 'https://test.finalstage.ch';

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [
    apiProxyWithFallbackPlugin({
      primary: proxyPrimary,
      fallback: proxyFallback || proxyPrimary,
    }),
    react(),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    // 3000 = Docker-Compose / „weiter auf localhost:3000“; alternativ: vite --port 5173
    port: Number(process.env.PORT) || 3000,
    allowedHosts: true,
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  }
});
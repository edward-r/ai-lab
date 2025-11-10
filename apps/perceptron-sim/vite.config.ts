import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BASE_PATH = process.env.BASE_PATH ?? '/';

const normalizeBase = (v: string): string => {
  let s = v;
  if (!s.startsWith('/')) s = `/${s}`;
  if (!s.endsWith('/')) s = `${s}/`;
  return s;
};

const appRoot = __dirname;
const distRoot = resolve(__dirname, '../../dist/apps/perceptron-sim');

export default defineConfig({
  root: appRoot,
  cacheDir: '../../node_modules/.vite/perceptron-sim',
  server: {
    port: 5173,
    host: 'localhost',
  },
  preview: {
    port: 4173,
    host: 'localhost',
  },
  resolve: {
    alias: {
      '@perceptron/core': resolve(__dirname, '../../libs/perceptron-core/src'),
      '@perceptron/core/': resolve(__dirname, '../../libs/perceptron-core/src/'),
    },
  },
  plugins: [react()],
  build: {
    outDir: distRoot,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(appRoot, 'index.html'),
      },
    },
  },
  base: normalizeBase(BASE_PATH),
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BASE_PATH = process.env.BASE_PATH ?? '/';

const normalizeBase = (v: string): string => {
  let s = v;
  if (!s.startsWith('/')) s = `/${s}`;
  if (!s.endsWith('/')) s = `${s}/`;
  return s;
};

export default defineConfig({
  plugins: [react()],
  base: normalizeBase(BASE_PATH),
});

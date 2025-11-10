import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      globals: true,
      include: ['src/**/*.test.{ts,tsx}', '../../libs/**/*.test.{ts,tsx}'],
      coverage: {
        reporter: ['text', 'lcov'],
        reportsDirectory: '../../coverage/apps/perceptron-sim',
      },
    },
  }),
);

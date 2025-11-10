import type { Config } from 'tailwindcss';

export default {
  content: [
    './apps/perceptron-sim/index.html',
    './apps/perceptron-sim/src/**/*.{ts,tsx}',
    './libs/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;

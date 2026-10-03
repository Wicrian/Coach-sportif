import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // Adresse GitHub Pages : https://wicrian.github.io/Coach-sportif/
  base: '/Coach-sportif/',
  test: { include: ['src/**/*.test.ts'] },
});

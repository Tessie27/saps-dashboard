import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tessie27.github.io',
  base: '/saps-dashboard',
  outDir: './docs',
  build: {
    assets: 'assets'
  }
});

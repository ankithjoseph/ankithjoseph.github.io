import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  image: {
    domains: ["www.datascienceportfol.io"],
  },
  site: 'https://ankithbjoseph.github.io',
  base: '/',
});

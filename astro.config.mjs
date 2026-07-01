import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  devToolbar: { enabled: false },
  image: {
    domains: ["www.datascienceportfol.io"],
  },
  site: 'https://ankithjoseph.github.io',
  base: '/',
  vite: {
    plugins: [tailwindcss()],
  },
});

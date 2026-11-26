// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://isaac-kwon.github.io',
  base: '/physics',
  trailingSlash: 'always',
  output: 'static',
  i18n: {
    locales: ['ko', 'en', 'it'],
    defaultLocale: 'en', // PLAN §8 D1
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [
    mdx(),
    svelte(),
    sitemap({ i18n: { defaultLocale: 'en', locales: { ko: 'ko-KR', en: 'en-US', it: 'it-IT' } } }),
  ],
});

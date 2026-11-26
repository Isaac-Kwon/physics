import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { LANGS, PRIMER_IDS, TOPIC_IDS } from './data/topics';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const reference = z.object({
  title: z.string(),
  author: z.string().optional(),
  url: z.string().url().optional(),
  note: z.string().optional(),
});

/**
 * Topic pages: src/content/topics/<topic>/<lang>.mdx  → entry id "<topic>/<lang>".
 * `layers` must match src/data/topics.ts (ids, order) — enforced by scripts/check-content.mjs.
 */
const topics = defineCollection({
  loader: glob({ pattern: '*/*.mdx', base: './src/content/topics' }),
  schema: z.object({
    topic: z.enum(TOPIC_IDS),
    lang: z.enum(LANGS),
    title: z.string(),
    subtitle: z.string(),
    /** <meta name="description">, ≤ 160 chars. */
    description: z.string().max(200),
    /** Short line for hub cards. */
    tagline: z.string(),
    layers: z.array(z.object({ id: z.string().regex(kebab), title: z.string() })).min(1),
    references: z.array(reference).default([]),
    /** "As of" date for frontier content (PLAN §6.3). */
    asOf: z.string().optional(),
    draft: z.boolean().default(true),
  }),
});

/** Primers: src/content/primers/<primer>/<lang>.mdx → id "<primer>/<lang>". ≤ 150 words + one small figure. */
const primers = defineCollection({
  loader: glob({ pattern: '*/*.mdx', base: './src/content/primers' }),
  schema: z.object({
    primer: z.enum(PRIMER_IDS),
    lang: z.enum(LANGS),
    title: z.string(),
    /** Optional scene id for the small figure (e.g. "shared.tpc"). */
    figure: z.string().optional(),
    draft: z.boolean().default(true),
  }),
});

const localizedTerm = z.object({
  term: z.string(),
  /** One or two sentences, plain language. */
  definition: z.string(),
  /** Alternative spellings shown in parentheses on first use. */
  alt: z.string().optional(),
});

/** Glossary: src/content/glossary/<id>.yaml — one term, all three languages. */
const glossary = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/glossary' }),
  schema: z.object({
    id: z.string().regex(kebab),
    abbr: z.string().optional(),
    ko: localizedTerm,
    en: localizedTerm,
    it: localizedTerm,
    topics: z.array(z.enum(TOPIC_IDS)).default([]),
    /** Needs native-speaker / physicist review (PLAN docs/i18n/glossary-seed.md). */
    reviewed: z.boolean().default(false),
  }),
});

export const collections = { topics, primers, glossary };

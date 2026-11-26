/**
 * Canonical, language-independent topic registry (PLAN §2.3, §2.4, §3.2).
 * Layer ids/tiers here are the single source of truth; each topic MDX
 * frontmatter must list the same layer ids in the same order (checked by scripts/check-content.mjs).
 */
export const LANGS = ['ko', 'en', 'it'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export const TIERS = ['T0', 'T1', 'T2', 'T3', 'T4'] as const;
export type Tier = (typeof TIERS)[number];

export const TOPIC_IDS = [
  'heavy-ion',
  'dark-matter',
  'neutrinos',
  'semiconductor-detectors',
  'detectors',
] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

export interface LayerDef {
  id: string;
  tier: Tier;
}

export interface TopicDef {
  id: TopicId;
  /** 'subject' sits on the hub's length-scale axis; 'tool' sits beside it (Detectors). */
  kind: 'subject' | 'tool';
  /** log10 of the characteristic length in metres, for the hub scale axis. null for tools. */
  scaleLog10: number | null;
  /** Primary / secondary accent colours on DARK backgrounds (PLAN §3.2, draft until docs/design/ is finalised). */
  accent: string;
  accent2: string;
  /** Same accents darkened for the light theme (text/border contrast on white). */
  accentLight: string;
  accent2Light: string;
  /** Released topics are linked; unreleased ones show "coming soon" and dashed connections. */
  released: boolean;
  readingMinutes: number;
  heroScene: string;
  layers: LayerDef[];
}

export const TOPICS: Record<TopicId, TopicDef> = {
  'heavy-ion': {
    id: 'heavy-ion',
    kind: 'subject',
    scaleLog10: -15,
    accent: '#ffb547',
    accent2: '#fff3dc',
    accentLight: '#b85c00',
    accent2Light: '#7a3a00',
    released: false,
    readingMinutes: 25,
    heroScene: 'hi.hook',
    layers: [
      { id: 'hook', tier: 'T0' },
      { id: 'why', tier: 'T1' },
      { id: 'collision', tier: 'T2' },
      { id: 'fireball', tier: 'T3' },
      { id: 'phase-diagram', tier: 'T3' },
      { id: 'detection', tier: 'T3' },
      { id: 'frontier', tier: 'T4' },
    ],
  },
  'dark-matter': {
    id: 'dark-matter',
    kind: 'subject',
    scaleLog10: 26,
    accent: '#9b8cff',
    accent2: '#4b3fd1',
    accentLight: '#5a44d4',
    accent2Light: '#33268f',
    released: false,
    readingMinutes: 20,
    heroScene: 'dm.hook',
    layers: [
      { id: 'hook', tier: 'T0' },
      { id: 'evidence', tier: 'T1' },
      { id: 'candidates', tier: 'T2' },
      { id: 'search', tier: 'T2' },
      { id: 'direct-detection', tier: 'T3' },
      { id: 'frontier', tier: 'T4' },
    ],
  },
  neutrinos: {
    id: 'neutrinos',
    kind: 'subject',
    scaleLog10: 11,
    accent: '#3d7bff',
    accent2: '#9fc0ff',
    accentLight: '#1f5fe0',
    accent2Light: '#0d3a96',
    released: false,
    readingMinutes: 20,
    heroScene: 'nu.hook',
    layers: [
      { id: 'hook', tier: 'T0' },
      { id: 'ghost', tier: 'T1' },
      { id: 'sources', tier: 'T2' },
      { id: 'detection', tier: 'T3' },
      { id: 'frontier', tier: 'T4' },
    ],
  },
  'semiconductor-detectors': {
    id: 'semiconductor-detectors',
    kind: 'subject',
    scaleLog10: -5,
    accent: '#2fd3b5',
    accent2: '#d08a55',
    accentLight: '#0c8a73',
    accent2Light: '#9a5a2c',
    released: false,
    readingMinutes: 20,
    heroScene: 'sc.hook',
    layers: [
      { id: 'hook', tier: 'T0' },
      { id: 'intuition', tier: 'T1' },
      { id: 'mechanism', tier: 'T2' },
      { id: 'zoo', tier: 'T3' },
      { id: 'research', tier: 'T4' },
      { id: 'case-its3', tier: 'T4' },
    ],
  },
  detectors: {
    id: 'detectors',
    kind: 'tool',
    scaleLog10: null,
    accent: '#5fe1ff',
    accent2: '#ffffff',
    accentLight: '#087ea3',
    accent2Light: '#1f2d36',
    released: false,
    readingMinutes: 18,
    heroScene: 'det.hook',
    layers: [
      { id: 'hook', tier: 'T0' },
      { id: 'history', tier: 'T1' },
      { id: 'interactions', tier: 'T2' },
      { id: 'measurement', tier: 'T3' },
      { id: 'design', tier: 'T4' },
    ],
  },
};

/** Display order only, not reading order (PLAN §2.3). */
export const TOPIC_ORDER: TopicId[] = ['dark-matter', 'neutrinos', 'detectors', 'semiconductor-detectors', 'heavy-ion'];

export const PRIMER_IDS = [
  'ionization',
  'scintillation',
  'cherenkov',
  'tpc',
  'magnetic-tracking',
  'particle-id',
  'silicon-sensor',
  'underground-lab',
  'weak-interaction',
  'quarks-gluons',
  'standard-model',
] as const;
export type PrimerId = (typeof PRIMER_IDS)[number];

/** Theme-aware CSS colour for a topic accent: resolves per element via color-scheme (see tokens.css). */
export function accentCss(id: TopicId): string {
  const t = TOPICS[id];
  return `light-dark(${t.accentLight}, ${t.accent})`;
}
export function accent2Css(id: TopicId): string {
  const t = TOPICS[id];
  return `light-dark(${t.accent2Light}, ${t.accent2})`;
}

export function isLang(x: string | undefined): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x);
}

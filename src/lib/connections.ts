/**
 * Typed access to src/content/connections.yaml (PLAN §2.5).
 * Used by the hub topic map, <Bridge>, <RelatedTopics> and <Primer>.
 */
import { parse } from 'yaml';
import { z } from 'astro/zod';
import raw from '../content/connections.yaml?raw';
import { LANGS, PRIMER_IDS, TOPICS, TOPIC_IDS, type Lang, type PrimerId, type TopicId } from '../data/topics';

const anchorRe = new RegExp(`^(${TOPIC_IDS.join('|')})#([a-z0-9-]+)$`);
const anchor = z.string().regex(anchorRe);
const localized = z.object(Object.fromEntries(LANGS.map((l) => [l, z.string()])) as Record<Lang, z.ZodString>);

const schema = z.object({
  links: z.array(
    z.object({
      id: z.string(),
      from: anchor,
      to: anchor,
      related: z.boolean().default(false),
      reason: localized,
    }),
  ),
  primers: z.array(
    z.object({
      id: z.enum(PRIMER_IDS),
      origin: anchor.nullable(),
      usedBy: z.array(anchor),
    }),
  ),
});

export interface Anchor {
  topic: TopicId;
  layer: string;
}

export function parseAnchor(a: string): Anchor {
  const m = anchorRe.exec(a);
  if (!m) throw new Error(`Bad anchor "${a}"`);
  return { topic: m[1] as TopicId, layer: m[2] };
}

export interface Link {
  id: string;
  from: Anchor;
  to: Anchor;
  related: boolean;
  reason: Record<Lang, string>;
  /** false when the destination topic is not released → render as "coming soon" / dashed line. */
  live: boolean;
}

export interface PrimerUsage {
  id: PrimerId;
  origin: Anchor | null;
  usedBy: Anchor[];
}

const data = schema.parse(parse(raw));

export const links: Link[] = data.links.map((l) => {
  const to = parseAnchor(l.to);
  return { id: l.id, from: parseAnchor(l.from), to, related: l.related, reason: l.reason, live: TOPICS[to.topic].released };
});

export const primerUsage: PrimerUsage[] = data.primers.map((p) => ({
  id: p.id,
  origin: p.origin ? parseAnchor(p.origin) : null,
  usedBy: p.usedBy.map(parseAnchor),
}));

export function getLink(id: string): Link {
  const l = links.find((x) => x.id === id);
  if (!l) throw new Error(`Unknown connection id "${id}" (see src/content/connections.yaml)`);
  return l;
}

/** Links that start on a given topic (optionally a given layer). */
export function linksFrom(topic: TopicId, layer?: string): Link[] {
  return links.filter((l) => l.from.topic === topic && (!layer || l.from.layer === layer));
}

/** Topic-level edges for the hub map: unique unordered topic pairs with all their reasons. */
export function topicEdges(): { a: TopicId; b: TopicId; links: Link[] }[] {
  const map = new Map<string, { a: TopicId; b: TopicId; links: Link[] }>();
  for (const l of links) {
    const [a, b] = [l.from.topic, l.to.topic].sort() as [TopicId, TopicId];
    const key = `${a}|${b}`;
    if (!map.has(key)) map.set(key, { a, b, links: [] });
    map.get(key)!.links.push(l);
  }
  return [...map.values()];
}

/** Related Topics block at the end of a page: unique destination topics of `related` links, max 3. */
export function relatedTopics(topic: TopicId): { topic: TopicId; link: Link }[] {
  const seen = new Set<TopicId>();
  const out: { topic: TopicId; link: Link }[] = [];
  for (const l of linksFrom(topic)) {
    if (!l.related || seen.has(l.to.topic)) continue;
    seen.add(l.to.topic);
    out.push({ topic: l.to.topic, link: l });
  }
  return out.slice(0, 3);
}

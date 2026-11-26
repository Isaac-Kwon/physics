// Light-weight readers for TS/YAML sources (no Astro runtime, no TS toolchain).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const p = (...parts) => join(ROOT, ...parts);

export function read(path) {
  return readFileSync(path, 'utf8');
}

export function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function listFiles(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(ext))
    .map((d) => d.name);
}

/** Parse src/data/topics.ts → { LANGS, TOPICS: {id: {released, layers:[ids]}}, PRIMER_IDS } */
export function loadTopicRegistry() {
  const src = read(p('src/data/topics.ts'));
  const arr = (name) => {
    const m = new RegExp(`export const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(src);
    if (!m) throw new Error(`topics.ts: cannot find ${name}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };
  const LANGS = arr('LANGS');
  const PRIMER_IDS = arr('PRIMER_IDS');
  const body = src.slice(src.indexOf('export const TOPICS'), src.indexOf('export const TOPIC_ORDER'));
  const TOPICS = {};
  const parts = body.split(/\n  (?:'[\w-]+'|\w+): \{\n/).slice(1);
  for (const part of parts) {
    const id = /^\s*id: '([^']+)'/.exec(part)?.[1];
    if (!id) continue;
    const released = /released:\s*(true|false)/.exec(part)?.[1] === 'true';
    const layers = [...part.matchAll(/\{\s*id:\s*'([^']+)',\s*tier:/g)].map((m) => m[1]);
    TOPICS[id] = { id, released, layers };
  }
  return { LANGS, PRIMER_IDS, TOPICS };
}

/** Mirrors src/scenes/registry.ts auto-discovery: src/scenes/<dir>/<name>.ts → "<prefix>.<name>". */
const SCENE_DIR_PREFIX = { 'heavy-ion': 'hi', 'dark-matter': 'dm', neutrinos: 'nu', 'semiconductor-detectors': 'sc', detectors: 'det', hub: 'hub', common: 'shared', demo: 'demo' };
export function loadSceneIds() {
  const ids = new Set();
  for (const [dir, prefix] of Object.entries(SCENE_DIR_PREFIX)) {
    const d = p(`src/scenes/${dir}`);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (f.endsWith('.ts') && !f.startsWith('_')) ids.add(`${prefix}.${f.slice(0, -3)}`);
  }
  return ids;
}

export function loadConnections() {
  return parse(read(p('src/content/connections.yaml'))) ?? {};
}

/** Split MDX into { data, body } */
export function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: null, body: text };
  return { data: parse(m[1]) ?? {}, body: m[2] };
}

/** Remove fenced code + inline code so tags inside examples are not counted. */
export function stripCode(body) {
  return body.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '').replace(/`[^`\n]*`/g, '');
}

const attr = (tag, name) => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*["'\`]([^"'\`]*)["'\`]\\s*\\})`).exec(tag);

/** Ordered list of component usages: [{ comp, key, value }] */
export function scanComponents(body) {
  const clean = stripCode(body);
  const out = [];
  const keyFor = { Layer: 'id', Scene: 'id', Walkthrough: 'scene', Step: 'state', Widget: 'name', Bridge: 'id', Primer: 'id', Term: 'id', Portal: 'scene' };
  const re = /<(Layer|Scene|Walkthrough|Step|Widget|Bridge|Primer|Term|Portal)\b([^>]*?)\/?>/g;
  for (const m of clean.matchAll(re)) {
    const a = attr(m[2], keyFor[m[1]]);
    out.push({ comp: m[1], value: a ? (a[1] ?? a[2] ?? a[3]) : null });
  }
  return out;
}

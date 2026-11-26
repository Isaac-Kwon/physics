// Validates content consistency before build (PLAN §2.5, §4.2). Errors → exit 1; warnings/info do not fail.
import { existsSync } from 'node:fs';
import { parse } from 'yaml';
import { p, read, listDirs, listFiles, loadTopicRegistry, loadSceneIds, loadConnections, splitFrontmatter, scanComponents } from './lib/registry.mjs';

const errors = [];
const warnings = [];
const infos = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const info = (m) => infos.push(m);

const { LANGS, PRIMER_IDS, TOPICS } = loadTopicRegistry();
const sceneIds = loadSceneIds();
const conn = loadConnections();
const links = conn.links ?? [];
const linkIds = new Set(links.map((l) => l.id));
const rel = (f) => f.replace(/\\/g, '/');

// ---- glossary ------------------------------------------------------------------------------
const glossaryIds = new Set();
const gdir = p('src/content/glossary');
for (const file of listFiles(gdir, '.yaml')) {
  const where = `glossary/${file}`;
  let doc;
  try {
    doc = parse(read(`${gdir}/${file}`));
  } catch (e) {
    err(`${where}: invalid YAML (${e.message.split('\n')[0]})`);
    continue;
  }
  const stem = file.replace(/\.yaml$/, '');
  glossaryIds.add(stem);
  if (!doc || doc.id !== stem) err(`${where}: id "${doc?.id}" must equal filename "${stem}"`);
  for (const l of LANGS) {
    if (!doc?.[l]?.term) err(`${where}: missing ${l}.term`);
    if (!doc?.[l]?.definition) err(`${where}: missing ${l}.definition`);
  }
}

// ---- connections.yaml ----------------------------------------------------------------------
const seenLink = new Set();
const checkAnchor = (a, where) => {
  const m = /^([a-z0-9-]+)#([a-z0-9-]+)$/.exec(String(a));
  if (!m) return err(`connections.yaml: ${where}: bad anchor "${a}" (expected topic#layer)`);
  const t = TOPICS[m[1]];
  if (!t) return err(`connections.yaml: ${where}: unknown topic "${m[1]}" in "${a}"`);
  if (!t.layers.includes(m[2])) err(`connections.yaml: ${where}: topic "${m[1]}" has no layer "${m[2]}" (layers: ${t.layers.join(', ')})`);
};
for (const l of links) {
  const w = `link "${l.id}"`;
  if (seenLink.has(l.id)) err(`connections.yaml: duplicate link id "${l.id}"`);
  seenLink.add(l.id);
  checkAnchor(l.from, `${w} from`);
  checkAnchor(l.to, `${w} to`);
  for (const lang of LANGS) if (!l.reason?.[lang]?.trim()) err(`connections.yaml: ${w}: missing reason.${lang}`);
  const dest = TOPICS[String(l.to).split('#')[0]];
  if (dest && !dest.released) info(`link "${l.id}" points to unreleased topic "${dest.id}" (renders as coming soon)`);
}
const seenPrimer = new Set();
for (const pr of conn.primers ?? []) {
  if (!PRIMER_IDS.includes(pr.id)) err(`connections.yaml: primer "${pr.id}" is not in PRIMER_IDS`);
  if (seenPrimer.has(pr.id)) err(`connections.yaml: duplicate primer "${pr.id}"`);
  seenPrimer.add(pr.id);
  if (pr.origin) checkAnchor(pr.origin, `primer "${pr.id}" origin`);
  for (const u of pr.usedBy ?? []) checkAnchor(u, `primer "${pr.id}" usedBy`);
}

// ---- topic MDX -----------------------------------------------------------------------------
const topicsDir = p('src/content/topics');
const unknownScenes = new Set();
for (const topicDir of listDirs(topicsDir)) {
  const def = TOPICS[topicDir];
  if (!def) {
    err(`content/topics/${topicDir}/: unknown topic (not in src/data/topics.ts)`);
    continue;
  }
  const sigs = {}; // lang → [tokens]
  for (const file of listFiles(`${topicsDir}/${topicDir}`, '.mdx')) {
    const lang = file.replace(/\.mdx$/, '');
    const where = `topics/${topicDir}/${file}`;
    if (!LANGS.includes(lang)) {
      err(`${where}: "${lang}" is not a supported language (${LANGS.join(', ')})`);
      continue;
    }
    const { data, body } = splitFrontmatter(read(`${topicsDir}/${topicDir}/${file}`));
    if (!data) {
      err(`${where}: missing or malformed frontmatter`);
      continue;
    }
    if (data.topic !== topicDir) err(`${where}: frontmatter topic "${data.topic}" != path topic "${topicDir}"`);
    if (data.lang !== lang) err(`${where}: frontmatter lang "${data.lang}" != path lang "${lang}"`);
    const fmLayers = (data.layers ?? []).map((x) => x.id);
    if (fmLayers.join() !== def.layers.join()) err(`${where}: frontmatter layers [${fmLayers.join(', ')}] != registry [${def.layers.join(', ')}]`);

    const used = scanComponents(body);
    const bodyLayers = used.filter((u) => u.comp === 'Layer').map((u) => u.value);
    for (const id of bodyLayers) if (!def.layers.includes(id)) err(`${where}: <Layer id="${id}"> is not a layer of ${topicDir}`);
    const order = bodyLayers.filter((id) => def.layers.includes(id));
    const expected = def.layers.filter((id) => order.includes(id));
    if (order.join() !== expected.join()) err(`${where}: <Layer> order [${order.join(', ')}] differs from registry order [${expected.join(', ')}]`);
    const dupes = bodyLayers.filter((id, i) => bodyLayers.indexOf(id) !== i);
    if (dupes.length) err(`${where}: duplicate <Layer id> ${[...new Set(dupes)].join(', ')}`);
    const missing = def.layers.filter((id) => !bodyLayers.includes(id));
    if (missing.length) (data.draft === false ? err : warn)(`${where}: layers without <Layer> section: ${missing.join(', ')}`);

    for (const u of used) {
      if (u.value == null) {
        if (u.comp !== 'Step' && u.comp !== 'Term') warn(`${where}: <${u.comp}> without its id attribute`);
        continue;
      }
      if (u.comp === 'Bridge' && !linkIds.has(u.value)) err(`${where}: <Bridge id="${u.value}"> not found in connections.yaml`);
      if (u.comp === 'Primer' && !PRIMER_IDS.includes(u.value)) err(`${where}: <Primer id="${u.value}"> is not a known primer id`);
      if ((u.comp === 'Scene' || u.comp === 'Walkthrough') && !sceneIds.has(u.value)) unknownScenes.add(`${u.value} (${where})`);
      if (u.comp === 'Term' && !glossaryIds.has(u.value)) warn(`${where}: <Term id="${u.value}"> has no glossary entry`);
    }
    sigs[lang] = used.filter((u) => ['Layer', 'Scene', 'Walkthrough', 'Step', 'Widget'].includes(u.comp)).map((u) => `${u.comp}:${u.value ?? ''}`);
  }

  // cross-language consistency (PLAN §4.2)
  const present = Object.keys(sigs);
  for (const l of LANGS) if (!present.includes(l)) warn(`topics/${topicDir}: no ${l}.mdx yet`);
  const master = present.includes('en') ? 'en' : present[0];
  for (const l of present) {
    if (l === master) continue;
    const a = sigs[master];
    const b = sigs[l];
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) {
        err(`topics/${topicDir}: ${l}.mdx scene/step sequence differs from ${master}.mdx at item ${i + 1}: ${master}=${a[i] ?? '(end)'} vs ${l}=${b[i] ?? '(end)'}`);
        break;
      }
    }
  }
}
for (const s of unknownScenes) warn(`scene not registered in src/scenes/registry.ts: ${s}`);

// ---- primers -------------------------------------------------------------------------------
const pdir = p('src/content/primers');
for (const dir of listDirs(pdir)) {
  if (!PRIMER_IDS.includes(dir)) err(`content/primers/${dir}/: not a known primer id`);
  for (const file of listFiles(`${pdir}/${dir}`, '.mdx')) {
    const lang = file.replace(/\.mdx$/, '');
    const where = `primers/${dir}/${file}`;
    const { data } = splitFrontmatter(read(`${pdir}/${dir}/${file}`));
    if (!data) err(`${where}: missing or malformed frontmatter`);
    else {
      if (data.primer !== dir) err(`${where}: frontmatter primer "${data.primer}" != "${dir}"`);
      if (data.lang !== lang) err(`${where}: frontmatter lang "${data.lang}" != "${lang}"`);
    }
  }
  if (!existsSync(`${pdir}/${dir}/en.mdx`) && listFiles(`${pdir}/${dir}`, '.mdx').length) warn(`primers/${dir}: has no en.mdx (en is the fallback)`);
}
for (const id of PRIMER_IDS) if (!existsSync(`${pdir}/${id}/en.mdx`)) info(`primer "${id}" has no en.mdx yet (renders a placeholder)`);

// ---- report --------------------------------------------------------------------------------
for (const m of infos) console.log(`  info  ${m}`);
for (const m of warnings) console.warn(`  warn  ${m}`);
for (const m of errors) console.error(`  ERROR ${m}`);
console.log(`[check-content] ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info`);
process.exit(errors.length ? 1 : 0);

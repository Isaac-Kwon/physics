# Parallel build — contracts & ownership (wave 1)

Read this together with [PLAN.md](PLAN.md) and the storyboards in [storyboards/](storyboards/).
Decisions taken for PLAN §8 (recommended defaults): **D1 en fallback · D2 en master · D3 Svelte islands · D4 Heavy-Ion first · D5 no zoom intro**.

## Stack as installed (do not add or upgrade packages — ask the lead instead)
Astro **7** (static, `base: '/physics'`, `trailingSlash: 'always'`) · MDX · Svelte 5 · TypeScript strict · GSAP 3.15 (ScrollTrigger is in `gsap/ScrollTrigger`) ·
Lenis · Three r187 · D3 7 · KaTeX via remark-math/rehype-katex (`@astrojs/markdown-remark` processor) · yaml · Playwright · Prettier · ESLint 10 flat config.
Fonts are npm packages already imported in `BaseLayout.astro` (Pretendard dynamic subset, Inter Variable, JetBrains Mono Variable).

Commands: `npx astro build` (must pass before you report done) · `npx astro check` · `npx astro dev`.
Windows + Dropbox: a transient `EBUSY … dist` error on build is a file lock — just rerun.

## Foundation (lead-owned — read, don't edit; ask if a change is needed)
| File | What |
|---|---|
| `astro.config.mjs`, `tsconfig.json`, `package.json`, `svelte.config.js` | config |
| `src/data/topics.ts` | topic registry: ids, accents, scale, layers (id + tier), `released`, primer ids |
| `src/content.config.ts` | collections `topics`, `primers`, `glossary` + frontmatter schemas |
| `src/content/connections.yaml` + `src/lib/connections.ts` | connection map, typed helpers (`getLink`, `linksFrom`, `topicEdges`, `relatedTopics`, `primerUsage`) |
| `src/i18n/index.ts` | `useT(lang)`, `localizePath`, `withBase`, `getLangFromUrl`, `stripLang`, `LANG_LABEL` … |
| `src/i18n/en/core.json` | site-wide strings |
| `src/lib/format.ts` | `formatNumber`, `formatSci`, `superscript` |
| `src/styles/tokens.css`, `global.css` | design tokens. `--accent` / `--accent-2` are set per page on `<html>` |
| `src/layouts/BaseLayout.astro` | `<head>`, hreflang, fonts, header/footer |
| `src/scenes/shared/types.ts` | **scene contract** (`SceneModule`, `SceneInstance`, `SceneContext`) |

**Links**: always build internal URLs with `localizePath(lang, '/heavy-ion/#collision')` or `withBase()` — never hard-code `/physics`.

**UI strings**: each track owns its own file `src/i18n/en/<area>.json` (English). Add keys there freely; `useT` merges all files.
Do not create ko/it string files — translations are a separate track. Key prefix = area (e.g. `chrome.*`, `scrolly.*`).

## Ownership (wave 1)
Write only inside your track's paths. Need something from another track? Code against the contract below and leave a `// TODO(track-X)` note.

| Track | Owner | Paths |
|---|---|---|
| **A — Scroll engine** | Sonnet | `src/components/scrolly/**`, `src/components/ui/DepthGauge.*`, `src/components/ui/Deeper.astro`, `src/scenes/shared/**` (except `types.ts`), `src/scenes/registry.ts`, `src/scenes/demo/**`, `src/lib/scroll.ts`, `src/lib/device.ts`, `src/layouts/TopicLayout.astro`, `src/pages/[lang]/[topic]/**`, `src/pages/[lang]/lab/**`, `src/i18n/en/scrolly.json` |
| **B — Site chrome + hub** | Sonnet | `src/components/ui/**` (except A's and C's files), `src/components/hub/**`, `src/scenes/hub/**`, `src/pages/index.astro`, `src/pages/[lang]/index.astro`, `src/pages/[lang]/glossary/**`, `src/pages/[lang]/about/**`, `src/pages/404.astro`, `src/i18n/en/chrome.json` |
| **C — Connections + validation** | Sonnet | `src/components/connections/**`, `src/components/ui/Term.astro`, `scripts/check-content.mjs`, `scripts/lib/**`, `src/i18n/en/connections.json` |
| **D — Glossary + translations** | Haiku | `src/content/glossary/*.yaml`, `src/i18n/ko/core.json`, `src/i18n/it/core.json` |
| **E — Tooling + CI** | Haiku | `.github/workflows/**`, `.prettierrc*`, `.prettierignore`, `eslint.config.js`, `playwright.config.ts`, `tests/**`, `.editorconfig` |
| **F — Heavy-Ion content (en)** | Sonnet | `src/content/topics/heavy-ion/en.mdx`, `src/content/primers/*/en.mdx`, `src/data/heavy-ion.ts`, `docs/scenes/heavy-ion.md` |

## MDX component API (contract between A, C and F)
Topic and primer MDX files **do not import components** — the topic route passes them via `components={…}`
(`src/components/scrolly/mdx-components.ts`, owned by A, which imports C's components from the fixed paths below).
Text inside components is normal Markdown; `$…$` / `$$…$$` is KaTeX.

| Component | Owner / file | Props | Pattern |
|---|---|---|---|
| `<Layer id>` | A `scrolly/Layer.astro` | `id` must exist in `TOPICS[topic].layers`; title from frontmatter, tier from registry. Renders `<section id={id}>` | — |
| `<BigNumber value unit approx caption>` | A `scrolly/BigNumber.astro` | `value: number` (e.g. `{1e12}`), `unit?: string`, `approx?: boolean` (prefix "~"), `caption?: string`; counts up on enter | P4 |
| `<Scene id mode>` … `<Step state>` … | A `scrolly/Scene.astro`, `scrolly/Step.astro` | `id` = registered scene id; `mode="steps"` (default, P2 sticky graphic + text steps) or `"scrub"` (P1 pinned; scroll drives `setProgress` within each step). `<Step state>` = one state name from the scene's `states`. Unregistered scene → labelled placeholder box (never a build error) | P1, P2 |
| `<Walkthrough scene experiment also>` + `<Step state kind>` | A `scrolly/Walkthrough.astro` | Detection Walkthrough (PLAN §3.5). `experiment` = the one representative experiment, `also` = "same principle: …" one-liner. `kind` ∈ `goal · signal · readout · trick` | P9 |
| `<Portal scene to>` | A `scrolly/Portal.astro` | zoom-into-a-point transition between layers; `to` = next layer id | P3 |
| `<Gallery>` + `<GalleryItem title>` | A `scrolly/Gallery.astro` | horizontal gallery | P6 |
| `<Figure kind caption>` | A `scrolly/Figure.astro` | `kind="schematic"` → "Schematic — not real data" badge; `"simulated"` → "Simulated example". Wraps a scene or image | P8 |
| `<Widget name …props>` | A `scrolly/Widget.astro` | P5 explorable. Mounts `src/components/widgets/<name>.svelte` lazily on the client (Svelte `mount()` via `import.meta.glob`), passing `lang` + props. Missing widget → placeholder box | P5 |
| `<Deeper title>` | A `ui/Deeper.astro` | collapsible undergraduate box, closed by default (`<details>`) | — |
| `<Primer id open>` | C `connections/Primer.astro` | embeds `src/content/primers/<id>/<lang>.mdx` (falls back to en, marks `lang`); "From <origin topic>" link from connections.yaml; collapsed unless `open` | — |
| `<Bridge id>` | C `connections/Bridge.astro` | `id` from `connections.yaml` links; margin card on desktop, inline card on mobile; "coming soon" if destination unreleased | — |
| `<Term id>text</Term>` | C `ui/Term.astro` | glossary tooltip from `src/content/glossary/<id>.yaml` | — |

Rendered automatically by `TopicLayout` (not written in MDX): hero/title, Depth Gauge, `<RelatedTopics topic>` (C, `connections/RelatedTopics.astro`), `<References>` from frontmatter `references` (C, `connections/References.astro`).

### Topic MDX skeleton
```mdx
---
topic: heavy-ion
lang: en
title: Heavy-Ion Physics
subtitle: Recreating the first microsecond of the universe
description: …
tagline: …
layers:
  - { id: hook, title: The hottest matter ever made }
  - { id: why, title: Why smash nuclei? }
references:
  - { title: "…", author: "…", url: "…" }
draft: true
---

<Layer id="hook">
  <BigNumber value={1e12} unit="K" approx caption="Hotter than anything else humans have made." />
</Layer>

<Layer id="why">
  <Scene id="hi.confinement">
    <Step state="string">Quarks can never be pulled out alone…</Step>
    <Step state="pair">…</Step>
  </Scene>
  <Deeper title="The QCD potential">$$V(r) \approx -\frac{4}{3}\frac{\alpha_s \hbar c}{r} + \kappa r$$</Deeper>
  <Primer id="quarks-gluons" />
  <Bridge id="hi-universe-to-dm-evidence" />
</Layer>
```

## Scene contract summary (`src/scenes/shared/types.ts`)
Scene module = `export default { states: [...], mount(ctx) → { setState, setProgress?, resize, setActive, dispose } }`,
registered in `src/scenes/registry.ts` as `'hi.collision': () => import('./heavy-ion/collision')`.
One shared WebGL renderer per page via `ctx.getRenderer()`; 2D scenes use Canvas2D/SVG in `ctx.container`.
Reduced motion → `setState(…, { immediate: true })` and no continuous loops.

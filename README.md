# Physics, from the Outside In

An interactive, scroll-driven introduction to several fields of physics — in Korean, English and Italian.

- Heavy-Ion Physics — recreating the first microsecond of the universe
- Dark Matter — and how we try to detect it
- Neutrinos — how neutrino detectors catch ghost particles
- Semiconductor Detectors — principles and research methods
- Detectors — the basic principles of seeing the invisible

Each topic is a self-contained page. It starts from the outermost, most familiar picture and goes deeper as you scroll,
up to undergraduate level. Topics link to each other through shared primers, bridge cards and a topic map on the hub page.

## Status
Draft build in progress (Astro 7). All five topic pages have full text in English, Korean and Italian (unreviewed);
interactive scenes and widgets are being completed topic by topic. Nothing is released yet — every topic shows
"coming soon" on the hub until it has been reviewed (`released` in `src/data/topics.ts`).

```bash
npm install
npm run dev          # http://localhost:4321/physics/
npm run build        # content check + static build into dist/
```

Dev pages: `/physics/en/lab/` (scroll patterns) and `/physics/en/lab/scenes/<scene-id>/` (every state of one scene).

## Documents
| File | Contents |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Master plan: goals, information architecture, visual language, tech stack, roadmap, open decisions |
| [docs/BUILD.md](docs/BUILD.md) | Build contracts: file ownership, MDX component API, scene authoring rules |
| [docs/design/DIRECTION.md](docs/design/DIRECTION.md) | Visual direction (calm editorial page, dark figures) |
| [docs/scenes/](docs/scenes/) | Per-topic scene and widget specs |
| [docs/storyboards/](docs/storyboards/) | Hub and per-topic storyboards (layers, scenes, representative numbers, connections) |
| [docs/i18n/glossary-seed.md](docs/i18n/glossary-seed.md) | KO / EN / IT terminology seed |

## Planned stack
Astro (static) · TypeScript · MDX · GSAP ScrollTrigger · Lenis · Three.js · D3 · KaTeX — deployed to GitHub Pages.

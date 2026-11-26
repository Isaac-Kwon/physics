# Visual direction — v2 (2026-11-26)

Replaces the "event display HUD" look of PLAN §3.1 for the page chrome. Reason: the first build read as a generic
AI landing page (glow dots, gradient headings, uppercase mono eyebrows, rounded cards with coloured borders, grid backgrounds).

**Reference points**: a good physics textbook page, Distill.pub articles, Quanta Magazine, Bartosz Ciechanowski's explainers.
The page is a *document* that contains *figures*. The figures (scenes) may be dark and luminous; the document around them is calm, printed-looking.

## Bans (remove wherever found)
- Gradient text, gradient fills, glows (`filter: drop-shadow`, `box-shadow` glows, `text-shadow`), blurred backdrops for decoration.
- Background grid patterns, noise, vignettes on page chrome.
- Decorative coloured dots/bullets before titles, logos or list items (exception: the Depth Gauge marker and map nodes, which encode data).
- Eyebrow labels above headings (`WAYS OF SEEING…`, `TOPIC · 25 MIN READ`). If the info matters, put it in a plain meta line *below* the title.
- UPPERCASE + letter-spaced monospace labels for ordinary words ("COMING SOON", "DEEPER", "PRIMER", "MECHANISM"). Use sentence case in the body font.
- Rounded "card" boxes with tinted borders and a coloured top/left bar as the default container. No pill shapes.
- Hover lift/scale animations, pulsing, shimmer.
- Duplicated content (eyebrow repeating the H1, hint text repeating an intro).

## Rules
**Type**
- One family for text: `--font-sans` (Pretendard / Inter). Headings weight 650–700, letter-spacing ≤ −0.01em (0 for Korean). Body 17–18px, line-height 1.65, measure ≤ 38rem.
- Size steps are few: page title (display), section title (h2), sub-heading (h3), body, small. Don't invent extra sizes.
- Monospace (`--font-mono`) is **only** for numbers with units, axis ticks, coordinates, scene ids in dev placeholders. Never for words.
- Small labels: `--fs-sm`, body font, `--fg-muted`, sentence case. Italic is fine for status ("Coming soon").

**Colour**
- Page is neutral (tokens). The topic accent is used sparingly: links, the active Depth Gauge marker, figure highlights, map nodes. Not borders on every box, not headings.
- Text is never coloured for decoration.

**Structure instead of boxes**
- Separate things with whitespace and 1px hairlines (`--line`), not with filled rounded cards.
- Radius: 0–4px (`--radius-sm`). Big radius only on nothing.
- Asides (Deeper, Primer, Bridge) look like textbook margin notes/sidebars: small heading in sentence case ("Deeper: the Lorentz factor"), hairline rule above, slightly smaller text, `--bg-raised` background at most.
- Figures: the scene panel is a dark rectangle (`.theme-dark`, radius ≤ 4px, no border glow) with a caption *below* in small text: "Figure 3. … Schematic, not real data." Numbered per page.
- Lists of topics: a plain list/table with title, one-line description, reading time — hairlines between rows.

**Motion**
- Only physical motion inside figures. Chrome transitions ≤ 150ms opacity/colour only.

## Copy in chrome
- Plain, short, no slogans in UI strings. No em-dash flourishes in labels. "Coming soon", not "✨ Coming soon".

## Figures (scenes and widgets)
Scenes render inside a dark panel (`.theme-dark`); `ctx.theme` gives the resolved dark-ground colours.
- **Every mark is a quantity.** A moving dot is a particle with a position/momentum; colour encodes energy, temperature or
  species; line width or alpha may encode intensity. No decorative particles, no ambient drift, no parallax for its own sake.
- **Lines**: 1–1.5 px. Particle tracks are thin lines; particles are small dots (1.5–3 px). Light emission (scintillation,
  Cherenkov, a hot fireball) may use additive blending — that is the physics. Nothing else glows.
- **Colour**: topic accent (`ctx.theme.accent`) for the subject of the figure, `accent2` for a secondary species, `fg` at
  reduced alpha for labels/axes, `grid` for guides. Continuous quantities (temperature, energy) use perceptual maps only:
  `interpolateInferno` / `interpolateViridis` from `d3`. Never red/green as the only distinction.
- **Text in figures**: sans 12 px for words, mono 11 px for numbers with units (`FONT_SANS`, `FONT_MONO` in
  `src/scenes/shared/plot.ts`). Sentence case. Labels come from `ctx.label(key)` (strings in `src/i18n/<lang>/scenes-*.json`
  as `scene.<id>.<key>`), numbers through `ctx.formatNumber` (Italian decimal comma).
- **Plots**: use `plot()` from `src/scenes/shared/plot.ts` — left/bottom axes only, sparse ticks, no grid box, no legend box
  (label curves directly at their end). Shapes come from textbook formulas; no fake error bars or data points.
- **Motion**: transitions 0.4–1.2 s with `approach()`; scrub scenes map `setProgress` directly to physical time.
  Reduced motion → draw the final frame of each state, no loops.
- **Widgets** (Svelte, light page, not dark panels): plain HTML controls styled with tokens, a native `<input type="range">`
  with a visible value + unit, the plot beside/below. No custom knobs, no pill toggles.

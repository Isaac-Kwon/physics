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

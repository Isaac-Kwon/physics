# Dark Matter — scene and widget spec (Track F → scene builders)

Source text: `src/content/topics/dark-matter/en.mdx`. State names below are the ones used in `<Step state>` and must be the `states` array of each scene module, in this order.
Constants: `src/data/dark-matter.ts` (`DM.*`). Accent: violet–indigo (`#9b8cff` / `#4b3fd1`); scintillation light (S1, S2) may use additive blending in a pale violet-white. Continuous quantities: `interpolateInferno` / `interpolateViridis`.
Rules (PLAN §1.3, DIRECTION Figures): every mark is a quantity. Schematic plots are labelled by `<Figure kind="schematic">`: no measured points, no error bars. Reduced motion: final frame of each state, no loops.
Dark matter itself is never drawn as glowing dust: it is shown as a mass distribution (contours or a density map, labelled "inferred from gravity").

Pattern key: P1 pinned scrub, P2 sticky steps, P5 widget, P6 gallery, P8 schematic plot, P9 walkthrough.

---

## Scenes

### `dm.hook` — P1, mode `scrub` (topic hero)
States: `galaxy-visible`, `halo-reveal`, `rotation-curve`.
- `galaxy-visible`: face-on or tilted spiral disc of ~2000 faint stars (positions from an exponential disc, seeded). Scale bar ~30 kpc.
- `halo-reveal`: progress 0→1 fades in a large, nearly spherical density map (inferno-like, low alpha) of radius ≈ 5× the disc; label "mass inferred from gravity, not light".
- `rotation-curve`: star dots move on circular orbits with speed v(r) from the flat-curve model (below), arrows ∝ v; a small inset plot of v(r), disc-only curve dashed, with-halo curve solid. Reduced motion: static arrows.

### `dm.evidence` — P2
States: `coma`, `rotation`, `lensing`, `bullet`, `cmb`.
- `coma`: cluster of ~30 galaxy dots with velocity arrows (length ∝ speed, order 1000 km/s dispersion); a faint "escape" circle: arrows exceed it unless extra mass is added (a faint mass cloud fades in). Label "velocity dispersion".
- `rotation`: single galaxy edge-on, stars with arrows; arrows at large r stay as long as at small r; dashed "expected" shorter arrows.
- `lensing`: observer — cluster (lens) — background source on a line; light rays bending around the cluster; the source image smeared into arcs. Deflection angle α ≈ 4GM/(c²b) is shown by ray curvature; label "image arcs". The mass map (contours) is overlaid at the end of the state.
- `bullet`: two clusters side by side after collision. Pink-violet contours (lensing mass) sit on the outer galaxies; hot gas (X-ray, inferno colours) lags in the middle. Labels "mass (lensing)" and "hot gas (X-rays)". No real image.
- `cmb`: left, a schematic sky patch with temperature ripples; right, the angular power spectrum sketch (curve with first three peaks, schematic, no numbers on y). A toggle-like animation: with extra matter the peaks pattern changes (second peak lower). Qualitative only.

### `dm.rotation` — P2 inside `<Figure kind="schematic">`
States: `disc-only`, `with-halo`.
Axes: x radius r (kpc, 0–30 ticks 0, 10, 20, 30), y speed v (km/s, 0–300). Model functions (shared with the `RotationCurve` widget, put in `src/scenes/dark-matter/_rotation.ts`):
- Disc: M_d(r) = M_d [1 − e^(−r/a)(1 + r/a)], a = 3 kpc; v_d² = G M_d(r)/r (spherical approximation, labelled). M_d ≈ 6×10¹⁰ M☉ gives ~160 km/s peak for the disc alone (total ~200 km/s with the halo) near 2.2 a.
- Halo (pseudo-isothermal): ρ = ρ₀ / (1 + (r/r_c)²), r_c = 5 kpc; M_h(r) = 4πρ₀ r_c² [r − r_c arctan(r/r_c)]; v_h² → 4πGρ₀ r_c² (flat) at large r. Parametrise the halo by v_flat (km/s).
- Total: v² = v_d² + v_h².
- `disc-only`: the disc curve rises, peaks near 2–3 a, then falls as r^(−1/2) (dashed r^(−1/2) guide labelled "Keplerian fall").
- `with-halo`: halo curve fades in, total curve stays flat; direct labels on curve ends ("visible disc", "dark halo", "total").
No data points.

### `dm.candidates` — P2 (mass-axis gallery as steps)
States: `axis`, `axion`, `wimp`, `sterile`, `pbh`.
Horizontal log-mass axis from 10⁻²² eV to ~10⁶⁶ eV (a few solar masses, ~90 decades); ticks every 10 decades, with reference marks: electron (0.5 MeV), proton (1 GeV), Sun (1 M☉).
- `axis`: empty axis with reference marks, a bracket "about 90 powers of ten".
- `axion`: band 10⁻⁶–10⁻³ eV highlighted, with a lighter segment extending to 10⁻²² eV labelled "fuzzy". Small wave icon (oscillating field) above.
- `wimp`: band 1 GeV–10 TeV; small icon: a dot with a "W" line (weak force) only.
- `sterile`: band ~1–50 keV; arrow to a photon icon (decay).
- `pbh`: band 10¹⁷–10²² g (convert to eV for the axis; `DM.M_PBH_G`) with "mostly excluded; window open" label.
All bands are qualitative; no colours as the only cue (direct labels).

### `dm.channels` — P2
States: `direct`, `indirect`, `collider`.
One Feynman-like blob diagram: χ and SM legs on a central vertex (two lines left, two right).
- `direct`: arrow of time downwards: χ + nucleus → χ + nucleus; χ line highlighted, small nucleus recoil.
- `indirect`: time rightwards: χχ → SM SM; photon/antimatter lines leaving.
- `collider`: time leftwards: SM SM → χχ; χ lines dashed and leaving, missing-energy arrow.
Transition = rotate the diagram (rotation about the vertex), same lines.

### `dm.xenon-tpc` — P9 (inside `<Walkthrough>`, violet theme)
Cutaway of a cylinder (side view), liquid xenon (lower ~90 %) and a thin gas layer, PMT/SiPM arrays top and bottom, field cage, cathode below, gate/anode around the liquid surface. Does **not** reuse `shared.tpc` (states `drift`/`readout` are single-phase and have no S1/S2); may reuse `_draw.ts` helpers.
States: `exterior`, `cutaway`, `recoil`, `s1`, `drift`, `s2`, `reconstruct`, `s2-s1-ratio`. The MDX uses all except `exterior`.
- `exterior`: the cryostat as a tall cylinder with "several tonnes" label, then morphing (with `cutaway`).
- `cutaway`: the principle diagram. Scale bar ~1.5 m.
- `recoil`: a dark-matter particle (accent dot with a trail) enters, hits one nucleus; the nucleus recoils (short bright track, ≪ pixel; enlarged inset ×10⁷). E_R label "~10 keV".
- `s1`: expanding pale flash (additive) at the interaction point; photons reaching the arrays, bars on the top and bottom arrays grow (more on the bottom array: light goes mostly down; schematic). Waveform strip: a short, small peak at t = 0.
- `drift`: electrons (dots) move up at constant speed; field arrows; time axis in the waveform strip advancing to ~ 1 ms; dot count = number of electrons (order 10–100).
- `s2`: at the liquid surface electrons enter gas, flare (additive) bright flash; waveform strip: a larger, broader peak after S1. Top array bars show the footprint.
- `reconstruct`: the footprint centroid gives (x, y); Δt between S1 and S2 gives z; a 3D dot appears in the cylinder; fiducial-volume cylinder (dashed) shown, edge events greyed out.
- `s2-s1-ratio`: small plot of log(S2/S1) against S1 (a few events): ER band above, NR band below (shape only). Markers: a few events highlighted. Hand-off to `ErNrClassifier` widget.
Quantities: drift speed (mm/µs), E field (V/cm), S1 photon count (tens), delay ≤ 1 ms. Labels: "S1", "S2", "liquid xenon", "gas", "PMT array".

### `dm.technique-cards` — P2
States: `bolometer`, `ccd`, `bubble`, `nai-modulation`, `argon-psd`. One small principle diagram each.
- `bolometer`: crystal on a thermometer; recoil → temperature rise ΔT ~ 1 µK on a log-temperature inset; second panel (light or charge) with ER/NR bands.
- `ccd`: grid of pixels; a charge packet read many times (the readout histogram sharpens into peaks at 0, 1, 2, … electrons). Label "single-electron counting". Link visually to `src/scenes/semiconductor` if a shared sensor drawing exists.
- `bubble`: liquid in a jar; a recoil makes one bubble that grows; an electron recoil leaves none.
- `nai-modulation`: Earth orbit seen from above with the Sun's galactic velocity vector; June and December positions with the net speed through the halo (June larger). Right: a sinusoidal rate vs month, schematic, no numbers on y, plus a banner "claim not confirmed by COSINE-100, ANAIS-112".
- `argon-psd`: two scintillation pulses (fast-heavy for NR, slow-tail for ER), overlay; label "pulse shape".

### `dm.backgrounds` — P2
States: `muons`, `radioactivity`.
- `muons`: a mountain cross-section (rock above a cavern); muon tracks (many at the surface, almost none in the cavern); depth label "m.w.e." with the flux drop 10⁶. Water tank (Cherenkov) around the detector shown as a veto.
- `radioactivity`: detector block with decay symbols from the walls (U, Th, K, Rn); the fiducial volume (dashed) excludes the outer layer; events inside are rare. Counter: events from walls vs inside.

### `dm.exclusion` — P8 (axes shown outside, Figure inside)
States: `axes`, `early`, `improving`, `neutrino-fog`.
Axes: x log m_χ (0.1–10⁴ GeV), y log σ_SI (cm²) with only "weaker" and "stronger" labels, no numbers beyond a few powers of ten. All curves are U-shaped sketches (min near 30–100 GeV).
- `axes`: empty axes with the shaded "excluded" region above a sample curve and "allowed" below.
- `early`: one high curve.
- `improving`: a family of curves stepping down (generation labels without dates); sweep animation.
- `neutrino-fog`: shaded floor band along the bottom; labels "solar neutrinos (low mass)", "atmospheric neutrinos (high mass)"; the lowest curve approaches the band.

### `dm.axion-cavity` — P9 abridged
States: `magnet`, `conversion`, `tuning`.
- `magnet`: solenoid cross-section around a cylinder cavity; field arrow B; cavity cooled (cold icon). Axion wave drawn as a slow oscillation filling the picture.
- `conversion`: inside the cavity, an axion converts to a photon (a → γ via the B field), small micro-wave field pattern; text "~10⁻²³ W".
- `tuning`: a rod moves inside the cavity; the resonance curve (a Lorentzian) shifts along the frequency axis; a waterfall of scanned frequencies fills in, each with "no signal" except one faint pattern per scan (schematic). Frequency axis 0.5–2 GHz.

### `dm.indirect` — P2
States: `annihilation`, `sky`.
- `annihilation`: χχ → γγ / quarks; a density map of the galaxy centre with a gamma-ray flux ∝ ρ².
- `sky`: all-sky ellipse (Mollweide) with a bright centre ("excess?") and diffuse band; pulsars as a competing source (dots). No numbers; labels "possible dark-matter signal / other explanations".

---

## Widgets (P5) — `src/components/widgets/<Name>.svelte`, props `lang` plus those listed

### `RotationCurve`
- Inputs: two sliders. Disc mass M_d, 1–10 ×10¹⁰ M☉ (default 6); halo strength as v_flat, 0–300 km/s (default 200). The sliders show their values with units.
- Model: the same functions as `dm.rotation` (`_rotation.ts`). v_total² = v_d² + v_h².
- Output: plot of v(r) for r = 0–30 kpc: three curves (disc, halo, total) with direct labels; a faint horizontal band marks "flat" ±10 %. Readouts: total speed at 10 and 25 kpc and the ratio of the dark mass to visible mass within 25 kpc (M_h(25)/M_d(25), ≈ with "model" label). At halo = 0 the curve falls: a one-line caption "no halo: the outer stars would fly off the model".
- The plot is schematic ("Model, not data").

### `ErNrClassifier`
- Task: classify events in the log(S2/S1) against S1 plane.
- Data: ~60 simulated events drawn from two bands (seeded): ER band centred at log10(S2/S1) = 1.2 − 0.0025·S1 (S1 in photons, 3–40), σ ≈ 0.15; NR band centred at 0.7 − 0.0025·S1, σ ≈ 0.12. The shapes only matter qualitatively; both bands are labelled "Simulated example, not real data".
- Interaction: the user draws or drags a horizontal-ish cut line (one slider for the cut level and one for the tilt). Events below the line are accepted as "nuclear recoils". Readouts: ER leakage (fraction of ER below the cut) and NR acceptance (fraction of NR below the cut). Tension: lowering the line removes background but also signal.
- Reset button, "new events" button (new seed). Keyboard-accessible sliders.
- Output text: "leakage x %, acceptance y %" with a short caption on how experiments tune this.

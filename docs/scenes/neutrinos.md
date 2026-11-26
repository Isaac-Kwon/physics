# Neutrinos — scene and widget spec (Track G → scene builders)

Source text: `src/content/topics/neutrinos/en.mdx`. State names below are the ones used in `<Step state>` and must be the `states` array of each scene module, in this order.
Constants: `src/data/neutrinos.ts` (`NU.*`, `NU_EXPERIMENTS`). Accent: Cherenkov blue `#3d7bff` / `#9fc0ff` (`ctx.theme.accent`, `accent2`).
Rules (PLAN §1.3, DIRECTION Figures): every mark is a quantity (position, energy, time, probability). No ambient drift. Light emission (Cherenkov, scintillation) may use additive blending; nothing else glows. Schematic plots are labelled by `<Figure kind="schematic">` — no measured points or error bars. Reduced motion: draw the final frame of each state, no loops. Neutrinos themselves are drawn as thin dashed lines (they leave no trace); only what they cause is bright.

Pattern key: P1 pinned scrub, P2 sticky steps, P5 widget, P8 schematic plot reveal, P9 walkthrough.

Colour conventions: neutrino path = `fg` dashed at 50% alpha; charged lepton / track = accent; light = accent2 (additive); electrons (ionization) = `fg` dots; flavour colours (electron / muon / tau) = three viridis samples (0.15, 0.5, 0.85), always also labelled with text.

---

## Scenes

### `nu.hook` — P1, mode `scrub` (registered as topic hero `heroScene`)
States: `dark`, `sun`, `through-earth`, `thumbnail`.
- `dark`: black; very faint dashed lines cross the frame, density ∝ the real flux ratio is impossible, so draw ~200 thin lines (document "not to scale").
- `sun`: a small disc at left (Sun) with lines fanning out toward the right edge; label "Sun, 8 light-minutes" (1.5×10¹¹ m).
- `through-earth`: a disc (Earth) in the middle; the lines pass through it unchanged; label "12,700 km of rock".
- `thumbnail`: zoom to a 1 cm² square (a thumbnail outline); lines cross it. Counter ticking ≈ 6×10¹⁰ s⁻¹ (`NU.SOLAR_FLUX_CM2_S`). progress = zoom.

### `nu.beta-decay` — P2
States: `missing-energy`, `neutrino`.
- `missing-energy`: a nucleus emits an electron (dot); beside it a spectrum sketch: a continuous electron energy distribution up to the endpoint, with a sharp line (what two-body decay would give) shown dashed for contrast. Label "energy seems to vanish".
- `neutrino`: a dashed line is added leaving with the electron; the energy bars of the electron and neutrino sum to the endpoint. Label "second particle carries the rest".

### `nu.flavours` — P2
States: `three`, `neutral`.
- `three`: three pairs: (νₑ, e), (ν_μ, μ), (ν_τ, τ), with relative charged-lepton masses to a log scale (0.511 MeV, 106 MeV, 1777 MeV).
- `neutral`: a neutrino dashed line passes through a drawn atom (nucleus + electron cloud) with the label "no charge, no colour: only the weak force"; log mass bar: neutrino below 1 eV vs electron 511 000 eV (label "less than a millionth", `NU.M_NU_KATRIN_EV`).

### `nu.oscillation` — P2 (+ Figure for `probability-plot`; widget `Oscillation` is separate)
States: `produce`, `fly`, `detect`, `probability-plot`, `solar-deficit`.
- `produce`: source at left emits a wave packet drawn as a colour bar of three flavour fractions (100% νₑ).
- `fly`: the same bar travels right; fractions evolve with P = sin²2θ sin²(1.27 Δm² L/E) using round values (θ, Δm² from `NU.DM2_ATM_EV2`, `NU.SIN2_2THETA_ATM`); progress/time loops with a distance axis in km/GeV.
- `detect`: detector at right; the bar freezes at a chosen L/E; bar lengths = probabilities.
- `probability-plot` (schematic): survival probability P(ν_μ→ν_μ) vs L/E (km/GeV, 0–1500, linear), curve 1 − sin²2θ sin²(1.27 Δm² L/E). Mark the first minimum at ≈ 500 km/GeV. Axis ticks 0, 1.
- `solar-deficit`: a bar "expected 1.0" and a bar "Homestake ≈ 0.33"; then a second bar pair "SNO: all flavours = expected". Qualitative fractions only, label them "about a third".

### `nu.sources` — P2 (+ Figure for `overview`)
States: `cosmic-background`, `geo-reactor`, `sun`, `supernova`, `atmosphere`, `accelerator`, `astro`, `overview`.
Layout: horizontal logarithmic energy axis from 10⁻⁴ eV to 10²¹ eV (ticks at meV, eV, keV, MeV, GeV, TeV, PeV, EeV). Each state highlights one source's band and dims the rest; `overview` shows all, positions approximate, no vertical meaning.
- `cosmic-background`: band near 10⁻⁴ eV, label "relic, undetected".
- `geo-reactor`: bands 0.1–10 MeV for geo and reactor (two labelled bands).
- `sun`: pp (< 0.42 MeV) and ⁸B (up to ~15 MeV) bands.
- `supernova`: band ~10–50 MeV, with "SN 1987A".
- `atmosphere`: band 0.1 GeV – 10 TeV (declining).
- `accelerator`: band ~0.1 – 30 GeV.
- `astro`: band 10 TeV – >100 PeV, with a marker at 220 PeV "KM3-230213A" (`NU.KM3_EVENT_PEV`).

### `nu.interactions` — P2
States: `cc`, `nc`, `targets`, `cross-section`.
- `cc`: ν_μ + nucleus → μ + hadrons; ν_e → e. A W line is drawn between; charged lepton bright.
- `nc`: ν → ν with a Z line; a nucleus recoils; outgoing ν dashed.
- `targets`: three small panels: ν–e elastic, ν̄ + p → e⁺ + n, ν–nucleus coherent recoil. Each labelled with its detector's name from the page (no more).
- `cross-section`: a bar of "mean free path" in lead: ~1 light-year (label "about a light-year of lead", order of magnitude), against the Sun's radius (7×10⁸ m) for comparison. Quantities: `NU.XSEC_GEV_CM2`.

### `nu.site` — P2
States: `surface-background`.
- a cross-section of rock with depth axis (0–2 km); a rate bar of cosmic muons falling with depth (schematic, log). Label "muon rate drops by a factor ~10⁶ at 1 km" — keep as "about a million" only if a real source is attached; otherwise show unlabelled decline.

### `nu.radiochem` — P9
States: `tank`, `capture`, `extract`, `count`, `rate`, `needle`.
- `tank`: cutaway of a rock layer with a tank (600 t, `NU.HOMESTAKE_MASS_T`), depth label 1.5 km.
- `capture`: inside, one Cl-37 nucleus changing into Ar-37 (a coloured atom); a neutrino dashed line arriving. Counter "≈ 1 atom per couple of days".
- `extract`: helium bubbles carry argon atoms (coloured dots) to a trap; atoms in the trap count up.
- `count`: a small counter with Ar-37 decays as clicks (event strip) over time; half-life 35 d label.
- `rate`: a tally "N atoms" vs a "prediction" bar; the measured is about a third (qualitative).
- `needle`: a grid of ~10³⁰ chlorine atoms (grey dots, hugely subsampled) with ~30 coloured argon atoms highlighted; label "30 among 10³⁰".

### `nu.water-cherenkov` — P9 (widget `RingClassifier` mounted after the walkthrough)
States: `tank`, `interaction`, `cone`, `ring`, `reconstruct`, `ring-sharpness`.
- `tank`: cylinder cutaway (Super-K, 50 kt, depth 1 km) with PMT dots on the wall.
- `interaction`: neutrino dashed line, a vertex, a charged lepton line leaving (labelled μ or e).
- `cone`: the particle path with a light cone, half-angle 42° (`NU.CHERENKOV_ANGLE_WATER_DEG`); label "light slower than the particle".
- `ring`: unrolled wall (a rectangle with a barrel unwrapped) with a ring of lit PMT dots. progress: ring grows with time.
- `reconstruct`: ring centre → direction arrow, brightness → energy bar, edge → identity tag.
- `ring-sharpness`: two rings side by side: μ-like sharp (narrow band), e-like fuzzy (broad band built from several overlapping cones from shower particles).

### `nu.ibd` — P9 (widget `IbdCoincidence` mounted after the walkthrough)
States: `reactor`, `inverse-beta`, `prompt`, `delayed`, `energy`, `coincidence`.
- `reactor`: reactor on the left, the 20 kt sphere on the right (50 km, `NU.JUNO_BASELINE_KM`), then cutaway to the sphere with PMT dots.
- `inverse-beta`: ν̄ₑ + p → e⁺ + n; two outgoing tracks from a vertex.
- `prompt`: positron stops and annihilates; flash 1 at the vertex; a timeline strip at the bottom shows pulse 1 at t = 0.
- `delayed`: neutron wanders (random walk of ≤ a few tens of cm), captured; flash 2; pulse 2 on the timeline at ≈ 200 µs (`NU.IBD_DELAY_US`). Label 2.2 MeV γ.
- `energy`: pulse-height histogram of prompt flashes (schematic, reactor-like shape with a falling tail above 1.8 MeV); inset arrow "E_ν ≈ E_prompt + 0.8 MeV".
- `coincidence`: timeline with many random single flashes (grey) and one correlated pair (accent) within a window box; the window box is highlighted.

### `nu.lartpc` — P9 (shares drawing helpers with `shared.tpc`; liquid-argon variant, blue theme)
States: `argon`, `ionize`, `drift`, `wires`, `event`, `purity`.
- `argon`: map-style line from Fermilab to South Dakota (1300 km, `NU.DUNE_BASELINE_KM`), then a cutaway of the tank.
- `ionize`: neutrino vertex in the argon; muon (long straight track), proton (short, thick), pion; ionization electrons as dots along each track, dot area ∝ charge (denser along the proton).
- `drift`: electrons drift sideways toward the wire plane at constant speed (drift field arrow); x = x_plane − v_d·t.
- `wires`: two wire planes at ±60° plus a collection plane; each plane records a 2D (wire, time) image; three small panels.
- `event`: reconstructed 3D picture with tracks coloured by dE/dx (inferno) and labelled μ, p, π.
- `purity`: a drifting electron lost to an impurity (a dot "O₂" captures it); a plot of surviving charge vs drift distance with two purities (exponential, label "cleaner argon, longer drift", `NU.LAR_PURITY_PPB`).

### `nu.neutrino-telescope` — P9
States: `lattice`, `muon`, `timing`, `direction`, `earth-shield`.
- `lattice`: side view of the ice: 86 strings (draw ≈ 15 for clarity, label "86 strings × 60 sensors"), depth axis 1.45–2.45 km (`NU.ICECUBE_DEPTH_KM`).
- `muon`: an upward muon line crossing the lattice, Cherenkov cone along it (42° in ice, ≈ 41°), sensors lit as the cone passes.
- `timing`: sensors coloured by arrival time (viridis, early → late); progress sweeps time.
- `direction`: a straight line fit through the earliest-to-latest sequence; the arrow gives the direction; sensor size ∝ light → energy bar.
- `earth-shield`: globe-free diagram: the detector below the surface with muons from above (grey, stopped by nothing) vs muons from below (accent) that have traversed the Earth; "Earth shields from the other side" label.

### `nu.cevns` — P9
States: `goal`, `target`, `coherent`, `recoil`, `rate`, `fog`.
- `goal`: timeline 1974 (prediction) → 2017 (observation) with the SNS building.
- `target`: pulsed source (a short pulse strip, microsecond scale) at 20 m from a small crystal (`NU.COHERENT_BASELINE_M`).
- `coherent`: a nucleus drawn as a ball of neutrons and protons; a neutrino wave with wavelength larger than the ball; all neutrons shown pushing in phase; text "∝ N²".
- `recoil`: the nucleus moves a tiny distance; energy bar "a few keV" (`NU.CEVNS_RECOIL_KEV`) next to a MeV bar (ratio visible), the crystal emits a handful of photons (dots).
- `rate`: histogram of recoil energies with a steeply falling spectrum above a threshold line (schematic).
- `fog`: a recoil-energy axis with a dark-matter-like recoil band and the solar-neutrino recoil band overlapping; label "the neutrino fog" (schematic, no numbers).

### `nu.frontier` — P2
States: `mass-ordering`, `cp`, `absolute-mass`, `majorana`, `cosmic`, `snews`.
- `mass-ordering`: two stacks of three mass levels: normal (ν₁ < ν₂ < ν₃, gap ν₃ large) and inverted (ν₃ lowest); flavour compositions shown as stacked colour bars per level (qualitative). Label "which is it?".
- `cp`: ν and ν̄ probability curves vs L/E, slightly different; label "difference = CP violation?" (schematic).
- `absolute-mass`: a log eV axis: oscillation-implied minimum 0.06 eV, KATRIN limit at 0.45 eV (`NU.M_NU_KATRIN_EV`), electron mass off-scale; the allowed window shaded.
- `majorana`: a neutrino and an antineutrino drawn as one particle with two helicities vs two separate particles (two panels); labels "Dirac" and "Majorana".
- `cosmic`: sky map outline (Mollweide ellipse) with a few labelled markers (TXS 0506+056, NGC 1068, Galactic plane band, KM3-230213A as "position not shown"); schematic, positions approximate.
- `snews`: timeline: neutrinos at t = 0, light hours later (log or broken axis); alert icon at ~minutes.

### `nu.dbd-spectrum` — P9 (reduced version) and used by widget `DbdSpectrum`
States: `decay`, `source-detector`, `sum-energy`, `spectrum`, `resolution`.
- `decay`: two panels: ordinary decay (nucleus → daughter + 2e⁻ + 2ν̄), neutrinoless (nucleus → daughter + 2e⁻). Majorana line labelled on the second.
- `source-detector`: a germanium crystal cutaway; the decaying atom inside; electrons stopping in the crystal (short tracks, charge cloud).
- `sum-energy`: bars: electron₁ + electron₂ energies; ordinary decay splits remaining energy with neutrinos (varies), neutrinoless always sums to Q (`NU.DBD_Q_GE76_MEV`).
- `spectrum`: histogram of the sum energy: continuous bump ending at Q; a narrow peak at Q for neutrinoless. Both shapes from textbook-style formulas (ordinary ∝ x⁵-like phase space, schematic); label "schematic" via Figure/widget.
- `resolution`: same, with the peak broadened (Gaussian) at three resolutions and the bump overlapping; progress sweeps resolution from sharp to blurred.

---

## Widgets (P5) — `src/components/widgets/<Name>.svelte`, props `lang` plus those listed

### `Oscillation`
- Inputs: slider L (km, log 1 to 20 000, ticks at 1, 295 (T2K), 1300 (DUNE), 12 700 (Earth)), slider E (GeV, log 0.001 to 1000, ticks at 0.003 reactor, 1, 100), selector "two flavours / three flavours (simplified)". Optional presets: Atmospheric, Reactor (KamLAND/JUNO), Accelerator (T2K).
- Model: two-flavour P = sin²2θ sin²(1.27 Δm² L/E) with θ and Δm² from the preset (`NU.*`); the three-flavour option only superposes two terms (atmospheric + solar) as an explicit simplification, no CP or matter effects.
- Output: left, bar triple (νₑ, ν_μ, ν_τ fractions) at the chosen (L, E) starting from the selected initial flavour; right, probability curves vs L at fixed E (and a marker at the chosen L). Readouts: L/E in km/GeV, P. Footer: "Two-flavour approximation; round-number parameters".

### `RingClassifier`
- Task: an unrolled tank wall with a simulated Cherenkov ring. User chooses "muon-like (sharp)" or "electron-like (fuzzy)", gets feedback and a running score.
- Model: ring radius from 42° and the vertex depth; sharp ring = thin band with Gaussian smearing σ_s; fuzzy = sum of 3–6 rings with random small offsets and amplitudes. Simulated (label "Simulated example, not real data"). Optional "difficulty" slider increases PMT noise or reduces brightness.

### `IbdCoincidence`
- Inputs: time-window slider Δt (1 µs to 1 ms, log, default 1 ms), optional "energy cut" toggle (prompt 1–8 MeV, delayed 2.2 ± 0.3 MeV).
- Model: an oscilloscope-style strip with random single flashes (Poisson, rate ~ kHz scale) and a few true pairs with delays drawn from an exponential (mean ≈ 200 µs, `NU.IBD_DELAY_US`). Counts the pairs accepted inside Δt and the accidentals; with a narrower window, signal is mostly kept and accidental coincidences drop roughly linearly. Readouts: "true pairs kept", "accidental pairs". Simulated; label as such.
- Teaching point: tighten the window and the background vanishes while the signal stays.

### `DbdSpectrum`
- Inputs: energy resolution slider (σ/Q from 0.1% to 10%), a toggle "expected signal: none / small / large".
- Model: continuous two-neutrino spectrum (schematic shape ∝ (Q−x)⁵·x-type) normalised; a Gaussian peak at Q of width σ and area set by the toggle; background flat. Plot with `plot()` style axes (sum energy in units of Q).
- Teaching point: with poor resolution the peak spreads into and under the tail of the continuum and disappears. Label "Schematic". No real half-lives drawn.

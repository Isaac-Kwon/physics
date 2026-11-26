# Heavy-Ion — scene and widget spec (Track F → scene builders)

Source text: `src/content/topics/heavy-ion/en.mdx`. State names below are the ones used in `<Step state>` and must be the `states` array of each scene module, in this order.
Constants: `src/data/heavy-ion.ts` (`HI.*`). Accent: amber `#ffb547` → white-hot `#fff3dc`; high baryon-density regions use a deep red family.
Rules (PLAN §1.3): every moving particle encodes a real quantity (momentum, energy, time). Schematic plots are labelled by `<Figure kind="schematic">` — do not add measured points or error bars. Reduced motion: jump to the final frame of each state, no loops.

Pattern key: P1 pinned scrub (`setProgress` drives it), P2 sticky steps, P5 widget, P8 schematic plot reveal, P9 walkthrough, P7 event replay.

---

## Scenes

### `hi.hook` — P1, mode `scrub`
States: `dark`, `approach`, `impact`, `fireball`, `tracks`. Registered as topic hero (`heroScene`).
- `dark`: black field, two faint amber discs far apart (edge-on pancakes). progress: discs fade in.
- `approach`: discs move toward the centre. progress 0→1 = separation shrinking (speed ~ c, motion eased, no deceleration).
- `impact`: overlap flash at the origin. progress: overlap fraction of the two discs.
- `fireball`: white-hot expanding sphere, radius ∝ progress, colour temperature falls amber→red as it expands.
- `tracks`: thousands of thin tracks leave radially, length ∝ progress. Particle count order 1e3–1e4 (`HI.NCH_CENTRAL_HIGH_E`); angular distribution slightly elliptic is optional (do not claim anything).
Labels: none (BigNumber follows in the page).

### `hi.confinement` — P2
States: `string`, `stretch`, `break`, `deconfined`.
- `string`: a proton (three coloured dots r/g/b in a blob) with gluon lines between them.
- `stretch`: one quark pulled out; the flux tube between it and the rest lengthens. Draw a **narrow tube of constant thickness**, not a thinning rubber band (tension constant, see Deeper). Energy label E ∝ r, with a bar that grows linearly with the separation.
- `break`: at r ≈ 1 fm the tube snaps; a new q q̄ pair appears at the break. Result: two mesons/hadrons, no free quark. Label "new pair".
- `deconfined`: many hadrons overlapping into one dense region where coloured dots and gluon lines move freely. Label "QGP".
Quantity: string tension κ ≈ 1 GeV/fm (`HI.STRING_TENSION_GEV_FM`); breaking separation of order 1 fm.

### `hi.cosmic-timeline` — P2
States: `qgp`, `hadrons`, `nuclei`, `atoms`. Log-time axis (1e-6 s … 1e13 s, i.e. ~380 000 years), with a cursor.
- `qgp`: cursor at ~1e-5 s, background of free quarks/gluons, T label "~10¹² K" (do not give a more exact value).
- `hadrons`: cursor at ~1e-5 s transitions; quarks bind into protons/neutrons; T label "~2×10¹² K".
- `nuclei`: cursor at ~minutes; protons/neutrons fuse to light nuclei (D, He).
- `atoms`: cursor at ~4×10⁵ yr; electrons bind to nuclei; light released (CMB).
Labels: epoch names; time axis in s with powers of ten.

### `hi.phase-diagram` — P1 `scrub` (collision-to-phase layer) and P2 `steps` (why, last block)
Axes: vertical T (0–200 MeV), horizontal μ_B (0–~1000 MeV). Light amber glow in the QGP region, red family for high density.
States in order: `axes`, `early-universe`, `crossover`, `nuclear-matter`, `liquid-gas`, `neutron-star`, `unknown-region`, `first-order`, `critical-point`, `energy-scan`, `freezeout-curve`, `experiments`.
- `axes`: empty axes with tick labels; (in the `why` layer only this state is shown, with the water-like regions faintly sketched).
- `early-universe`: marker at (μ_B≈0, T high) labelled "early universe · LHC".
- `crossover`: smooth band (not a line) from (0, ~157 MeV) bending down slowly to the right; label "crossover" and Tc ≈ 155–160 MeV at μ_B ≈ 0 (`HI.T_C_MEV`).
- `nuclear-matter`: marker near (μ_B ≈ 920 MeV [nuclear matter ~ nucleon mass minus binding], T≈0) labelled "ordinary nuclei, n₀ ≈ 0.16 fm⁻³".
- `liquid-gas`: short line near the bottom ending at a small dot, T_c ~ 10–20 MeV (`HI.T_LIQUID_GAS_CRIT_MEV`), labelled "liquid–gas".
- `neutron-star`: region bottom right labelled "neutron stars"; a faint hot patch above it labelled "mergers".
- `unknown-region`: hatched/dimmed mid-right region with "?".
- `first-order`: dashed line hypothesised, labelled "first-order? (hypothesis)".
- `critical-point`: endpoint dot with "?" label "critical point?" — no coordinates beyond a loose "somewhere here".
- `energy-scan`: collision paths: bold arrows from the top left going down-right as √s_NN lowers; scrub progress sweeps √s_NN from 5000 GeV to ~3 GeV (log scale), marker moves along the freeze-out curve.
- `freezeout-curve`: curve of freeze-out points T_ch(μ_B) from (1 MeV, 156) via (25, ~160) at 200 GeV, (420, ~140) at 7.7 GeV to (720, ~?) at 3 GeV — **qualitative shape only** (flat then falling), see `HI.MU_B_*`.
- `experiments`: coloured bands for ALICE/LHC, STAR BES, SPS NA61, HADES, CBM, NICA, J-PARC-HI (dashed/"planned"), each with a text label; colour is not the only cue (add labels).
Setprogress (scrub): in `energy-scan` and `freezeout-curve` only.

### `hi.collision` — P1 `scrub` and P2 `steps`
States: `approach`, `lorentz`, `impact`, `initial`, `preeq`, `qgp`, `hadronization`, `freezeout`, `free-stream`.
Layout: side view (beam axis horizontal), plus a clock "t = … fm/c" (1 fm/c ≈ 3.3×10⁻²⁴ s). The first three states (steps) are static/eased; the last six are a continuous scrub with progress driving t.
- `approach`: two spheres of 14 fm diameter (round, nucleon dots visible) approach. Quantities: scale bar "14 fm".
- `lorentz`: spheres squeeze into pancakes along the beam axis. Label γ ≈ 2700, thickness ≈ 0.005 fm × (not to scale: draw ≥ 2 px thick and say "not to scale").
- `impact`: pancakes offset by b (end view inset): overlap lens, participants coloured, spectators grey and flying on.
- `initial` (t = 0): pancakes overlap; a thin, very bright slab appears. progress: t from 0 to ~0.3 fm/c.
- `preeq`: disordered tracks/lines inside slab; becomes smooth glow. progress: t 0.3→1 fm/c.
- `qgp`: expanding ellipsoid; colour = temperature, falling amber-white → amber. Draw flow arrows with length ∝ local velocity. progress: t 1→10 fm/c; colour from several×Tc to Tc.
- `hadronization`: the surface layer turns into hadrons (small coloured blobs), interior continues; at the end all hadrons. t≈10 fm/c, T = Tc ≈ 2×10¹² K label.
- `freezeout`: hadrons scatter (short flashes) then stop scattering; t 10→20 fm/c.
- `free-stream`: arrows leave the picture; text "→ detector, ~10¹⁶ fm/c ≈ 30 ns later".
Quantities: t (fm/c), T (qualitative), Lorentz contraction factor, participant fraction. Bjorken ε is not drawn.

### `hi.stopping` — P2
States: `transparent`, `stopped`. Two panels or one panel with a morph:
- `transparent`: pancakes pass through each other; the baryons (blue dots) continue along ±z; between them a hot central region full of new particles (amber, baryon-free).
- `stopped`: thicker nuclei; baryon dots pile up in the centre (the net baryon rapidity distribution as a single peak); the central region is dense and red.
Quantity: baryon number location vs rapidity; label "baryon density".

### `hi.flow` — P2 (+ Figure for plot states)
States: `almond`, `pressure`, `momentum-anisotropy`, `v2-plot`.
- `almond`: end view (x–y plane). Reaction plane shown as the x-axis. Almond-shaped overlap, elongated along y.
- `pressure`: arrows from the almond centre; length ∝ pressure gradient; longer along x (short axis).
- `momentum-anisotropy`: particles leave the almond; more of them along x. Particle speed ∝ momentum; angular distribution 1 + 2 v₂ cos 2φ with v₂ ≈ 0.1 for the drawing.
- `v2-plot` (schematic): v₂ vs p_T, rising then saturating, with separate curves for π, p (heavier = smaller v₂ at same p_T). No numbers on the y-axis, only "0" and "larger".

### `hi.jet` — P2 (+ Figure for plot)
States: `dijet`, `quenched`, `raa-plot`.
- `dijet`: elongated overlap in the centre; a hard scattering at the edge produces two back-to-back arrows with cones of particles.
- `quenched`: the arrow crossing the interior shrinks/fades (energy → many soft particles at wide angles); the opposite jet is unchanged. Energy of a jet ∝ arrow length.
- `raa-plot` (schematic): R_AA vs p_T. A line at 1 labelled "no medium". Curve for hadrons well below 1; a curve for photons/Z near 1. y axis labelled R_AA with ticks 0, 1.

### `hi.quarkonium` — P2
States: `bound`, `screening`, `melt-sequence`.
- `bound`: a cc̄ pair (J/ψ) and a bb̄ pair (Υ) as two small spheres with a string. The Υ is smaller than the J/ψ; label sizes qualitatively (J/ψ ≈ 0.4 fm, Υ(1S) ≈ 0.2 fm).
- `screening`: coloured charges surround the pair, shielding the line between them; the line fades as the screening length drops (draw a circle of radius λ_D).
- `melt-sequence`: temperature axis T/Tc with states ordered by binding: Υ(1S) melts last, J/ψ, Υ(2S), Υ(3S) earlier (qualitative). Optionally a small box "regeneration (LHC)" with c and c̄ from different origins combining.

### `hi.thermometers` — P2
States: `strangeness`, `photons`, `hadron-ratios`.
- `strangeness`: two pie/bar pairs: pp-like vs heavy-ion central, with the strange share larger in the latter (qualitative, no numbers).
- `photons`: fireball cross-section with photons and e⁺e⁻ pairs leaving from every depth, unattenuated; hadrons are absorbed/scattered at the surface. Small exponential spectrum with a slope → "temperature".
- `hadron-ratios`: bar chart of several particle ratios with a model line (one T, one μ_B). Schematic.

### `hi.bes-signals` — P2 (+ Figure for plot)
States: `fluctuations`, `fluctuations-plot`, `directed-flow`, `turn-off`, `dileptons`.
- `fluctuations`: event-by-event histograms of net-proton number (p − p̄); widths differ at different energies. Number of protons per event drawn as dots.
- `fluctuations-plot` (schematic): C₄/C₂ vs √s_NN with a flat baseline (dashed) and a hypothetical dip/bump labelled "if a critical point exists" and a banner "measurement in progress". x-axis log √s_NN 3–200 GeV.
- `directed-flow`: slope dv₁/dy vs √s_NN, a curve crossing zero (schematic); small panel of the tilted fireball.
- `turn-off`: three stacked signal bars (jet suppression, quark-number scaling, …) switching off as √s_NN decreases.
- `dileptons`: e⁺e⁻ pair leaving a dense hot region; invariant-mass spectrum sketch.

### `hi.geometry` — P2
States: `collider`, `fixed-target`.
- `collider`: two beams meeting at a point; a cylindrical (barrel) detector around the point, tracks in all directions; solenoid field arrow.
- `fixed-target`: beam entering a thin target; particles in a forward cone (angles ≈ 1/γ_cm scale); detector stations in a line along the beam; dipole magnet.
Quantity: the angular distribution is isotropic in the CM frame and boosted forward in the lab; the cone must follow that.

### `hi.walkthrough-collider` — P9 (used inside `<Walkthrough>`; shared tpc/magnetic-track assets, amber theme)
Cross-section (end view of a barrel): beam pipe, silicon layers, TPC volume, TOF barrel, solenoid; one particle track plus a few faint ones.
States: `birth`, `pixels`, `curvature`, `tpc-drift`, `tof`, `identity`, `pid-trick`.
- `birth`: highlight one charged track from the vertex.
- `pixels`: 3 silicon layers light up; extrapolation back to the vertex, one displaced track shown with a secondary vertex.
- `curvature`: arc with radius R; B-field out of the page; overlay p ≈ 0.3 B R (B = 0.5 T, `HI.B_FIELD_BARREL_T`). Curve radius ↔ momentum: show two tracks, stiff and soft; sign of charge → curve direction.
- `tpc-drift`: ionization electrons along the track drift toward the end plate (side view inset), drift time → depth, charge ∝ dE/dx. Show electrons as dots with arrival time.
- `tof`: a hit on the TOF barrel; stopwatch with Δt; label path length L.
- `identity`: panel with p on x and β (or dE/dx) on y: the track point falls on a band → label "proton".
- `pid-trick`: the widget `BetheBloch` mode `pid` (see below) mounted next to it; momentum fixed, particle type switched.

### `hi.walkthrough-fixed-target` — P9
States: `cone`, `silicon-stations`, `bend`, `time-stamp`, `reconstruct`, `free-streaming`.
- `cone`: beam → target → forward cone of tracks.
- `silicon-stations`: 4–8 thin silicon planes along z (pixels near the target, strips further); track hits shown as dots.
- `bend`: dipole magnet box; tracks bend in the horizontal plane; curvature ↔ momentum.
- `time-stamp`: TOF wall and a RICH ring symbol; each hit carries a time label.
- `reconstruct`: hits connected into tracks; vertex marked.
- `free-streaming`: a time axis with hits from several collisions interleaved in a single colour, then colour-separated by collision (animation). Rate label ~10⁷ s⁻¹ (`HI.CBM_RATE_HZ`).

### `hi.event-replay` — P7 (inside `<Figure kind="simulated">`)
States: `collider-high`, `fixed-target-low`. **Simulated** events: random p_T (exponential, ⟨p_T⟩ ≈ 0.5 GeV/c), uniform η, helical tracks in B = 0.5 T.
- `collider-high`: ~2000–5000 tracks in the barrel (end view + short side view). progress = time growth of track length.
- `fixed-target-low`: ~200–500 tracks in the forward cone, bent by a dipole.
Label both "Simulated example".

### `hi.pid` — P8
States: `momentum-axis`, `bands`, `overlap`.
- `momentum-axis`: log p axis 0.1–10 GeV/c, y: dE/dx (arbitrary units); a scatter of unlabelled points.
- `bands`: the points arrange along e, π, K, p curves from the simplified Bethe–Bloch (use the same function as `BetheBloch`, I = 1 in scaled units, labelled "arbitrary units"). Labels on each band.
- `overlap`: shade the p ranges where two bands cross; label "need TOF".
Do not plot data points with error bars.

### `hi.frontier` — P2
States: `bes-next`, `small-systems`, `shapes`, `future`, `astro`.
- `bes-next`: the `hi.phase-diagram` map with the highest-density region highlighted and the energy scan arrows.
- `small-systems`: three droplets of increasing size (pp, p–Pb, Pb–Pb) with flow arrows; "?" at the smallest.
- `shapes`: round O-16 vs elongated Ne-20 (end view) → the overlap shape in a collision → stronger/weaker elliptic anisotropy (schematic arrows).
- `future`: timeline 2025–2040 with ALICE 3, EIC, CBM first physics (dates "as of 2025": use words like "late 2020s", "2030s").
- `astro`: neutron-star merger icon and the phase diagram bottom-right highlighted with the heavy-ion points above it.

Gallery (P6) in the same layer uses text only; images optional (CERN CDS CC-BY credit on `about`).

---

## Widgets (P5) — `src/components/widgets/<Name>.svelte`, props `lang` plus those listed

### `CollisionEnergy`
- Input: slider √s_NN, log scale, ticks at 3, 5, 17, 200, 5020 GeV (labels: FAIR, SPS, RHIC, LHC); default 5020.
- Model: γ = √s_NN / (2 m_N) (m_N = 0.938 GeV); thickness L = D/γ with D = 14 fm (draw max(L, 2 px) and show the exact number); baryon stopping fraction f_stop = a simple monotone function, e.g. f = 1 / (1 + (√s_NN / 10 GeV)^1.5) (explicitly schematic).
- Output: two nuclei as pancakes; the central region colour (white-hot baryon-free at high energy, red baryon-rich at low energy); numeric readouts γ, thickness in fm, and "transparent ↔ stopped" bar.

### `ImpactParameter`
- Input: slider b (0–14 fm; Pb radius R = 7 fm).
- Model: two discs radius R separated by b; overlap area A(b) = 2R² arccos(b/2R) − (b/2)√(4R² − b²); N_part ≈ 416 × A(b)/(πR²) (two nuclei × 208 nucleons × overlap fraction) as the geometric estimate (for display "≈", flagged as geometric not Glauber). Centrality percentile c ≈ (b/2R)² × 100 % (sharp-edge approximation, valid for b < 2R; show as "≈").
- Output: end view overlap (circle → lens → almond), participants coloured, spectators grey; readouts b, N_part, centrality; eccentricity ε₂ ≈ computed from the lens shape (second moment of overlap region) as a small bar — linked to `FlowDemo`.

### `FlowDemo`
- Input: slider ε₂ (eccentricity 0–0.6) and optional selector "weak rescattering ↔ strong rescattering" (opacity κ 0–1).
- Model: v₂ ≈ κ · ε₂ · c, c ≈ 0.2 (schematic constant), particle angles sampled from dN/dφ ∝ 1 + 2 v₂ cos 2φ.
- Output: 500 particles drawn leaving a shape of eccentricity ε₂; polar histogram of angles; readout v₂. At κ = 0 the distribution is isotropic.

### `EnergyScan`
- Input: slider √s_NN, log 3–5020 GeV; marks at 3, 7.7, 19.6, 62.4, 200, 5020 GeV.
- Model: μ_B(√s) = 1.308 GeV / (1 + 0.273 √s_NN[GeV]) (a common parametrisation of freeze-out fits, Cleymans et al.; clearly shown as "typical fit"); T_ch(μ_B) = 0.166 − 0.139 μ_B² − 0.053 μ_B⁴ (GeV; same source). Both are drawn **as schematic**; do not label them as data. √s_NN → (μ_B, T) is a point on the `hi.phase-diagram` map.
- Output: the map with the crossover band, the freeze-out curve, the current point, and the band for each experiment (from `experiments` state); readouts √s_NN, μ_B, T.
- (Check these two formulas against Cleymans et al., Phys. Rev. C 73 (2006) 034905 before shipping.)

### `BetheBloch` (owned by another track — heavy-ion usage)
- Used as `<Widget name="BetheBloch" mode="pid" />`. Expected behaviour: fixed momentum slider, particle selector (e, π, K, p), shows dE/dx band curves and the selected particle's point; optional read-out of β, TOF delay over 4 m. Formula: simplified Bethe–Bloch in the Deeper box, arbitrary units. If the widget does not know `mode="pid"`, falling back to its default mode is acceptable.

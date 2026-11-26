# Semiconductor Detectors — scene and widget spec (content author → scene builders)

Source text: `src/content/topics/semiconductor-detectors/en.mdx`. State names below are the ones used in `<Step state>` and must be the `states` array of each scene module, in this order.
Constants: `src/data/semiconductor.ts` (`SC.*`). Accent: silicon green-teal `#2fd3b5` (subject), copper `#d08a55` (`accent2`: metal, electrodes, wiring). Electrons and holes need a colour pair that does not rely on hue alone: electrons = accent (filled dot, label "e⁻"), holes = accent2 (open ring, label "h⁺"). Field/potential: `fg` at reduced alpha.
Rules (PLAN §1.3, DIRECTION Figures): every mark is a quantity. Schematic plots are wrapped by `<Figure kind="schematic">` — no measured points or error bars. Reduced motion: draw the final frame of each state, no loops. Scene file location `src/scenes/semiconductor-detectors/<name>.ts` → id `sc.<name>`; `src/scenes/shared/silicon-cross-section` may be reused for the cross-section drawings if the builder prefers (then themed teal/copper).

Common cross-section convention (used by most scenes): side view, particle enters from the top, p+ electrode at the top (or segmented side), n+ backplane at the bottom, thickness drawn with a scale bar "300 µm" (not to scale for pixels; say so). Particle track = thin straight line (1.5 px); pairs = dots along it, density ∝ 80 µm⁻¹ (subsampled; label "~80 pairs per µm"). Particles are never decorative.

Pattern key: P1 pinned scrub, P2 sticky steps, P5 widget, P8 schematic plot reveal, P9 walkthrough.

---

## Scenes

### `sc.hook` — P1, mode `scrub` (topic hero scene)
States: `wafer`, `chips`, `staves`, `barrel`. Zoom-out sequence; progress within a state = camera dolly/rotation.
- `wafer`: a 300 mm circular wafer, slowly rotating, specular reflection only (that reflection is the one allowed light effect). Chips as a grid of dies on it.
- `chips`: dies separate and lift; ~stamp-sized rectangles; one is highlighted with a pixel grid inset (pitch ≈ 30 µm labelled).
- `staves`: chips line up on long ladders (staves) of ~ 9 chips in a row.
- `barrel`: ladders wrap into concentric cylinders (7 layers, as ITS2) around a beam pipe; end view then oblique. Scale bar 1 m → 10 cm.
Quantities: counts only for staging (7 layers). The big number follows in `BigNumber` (1e10 pixels).

### `sc.charge-ladder` — P2
States: `ladder`, `kick`, `hole`. Energy-level picture (vertical = energy).
- `ladder`: valence band (filled: a row of electrons) and conduction band (empty) separated by a gap marked 1.12 eV. "Floor" metaphor: bands drawn as two floors of a building, subtly.
- `kick`: a particle passes the side; one electron jumps to the conduction band (arrow length = 3.6 eV on a scale bar, with the extra ~2.5 eV drawn as small lattice wiggles).
- `hole`: empty seat left in the valence band drawn as an open ring; free electron and hole move in opposite directions under a small field arrow. Labels: "electron", "hole", "electron–hole pair".
Quantities: E_g = 1.12 eV, w = 3.6 eV.

### `sc.camera-vs-particle` — P2
States: `camera`, `particle`.
- `camera`: a pixel grid with thousands of photon arrows arriving over a time axis (exposure ~1/100 s); accumulated charge bucket fills slowly. Labels "many photons, long time".
- `particle`: the same pixel; one track crosses in ~ps, charge bucket fills at once to ~2×10⁴ e⁻. Labels "one particle, one instant".
Quantity: charge in the pixel vs time (bar), no numbers except 2×10⁴ e⁻.

### `sc.mip-charge` — P2
States: `crossing`, `pairs`.
- `crossing`: side view of a 300 µm sensor, scale bar, the MIP track crossing it. Thickness comparison: a sheet of paper (~100 µm) as a thin strip beside it.
- `pairs`: dots along the track, density = 80 µm⁻¹ (subsampled 1:20 for display, label says so), counter "≈ 2.4×10⁴ pairs".

### `sc.band-gap` — P2
States: `bands`, `pair-energy`, `n-type`, `p-type`.
- `bands`: band diagram, E_g = 1.12 eV, 300 K; a faint thermal population (very few electrons in the conduction band) labelled "almost none at room temperature". Optional comparison bars: metal (no gap), insulator (large gap).
- `pair-energy`: a bar of 3.6 eV split into 1.12 eV (gap, accent) and ≈ 2.5 eV (lattice vibrations, grey wiggles); beside it a 30 eV bar for gas, labelled "gas ≈ 30 eV".
- `n-type`: lattice sketch of silicon atoms with one phosphorus atom (P), extra electron free; band diagram with donor level just under the conduction band.
- `p-type`: boron (B), a hole; acceptor level just above the valence band.
Quantities: 1.12 eV, 3.6 eV, ~30 eV, "1 in 10⁶" dopant ratio label.

### `sc.junction` — P2 (+ widget `BiasDepletion` follows)
States: `contact`, `depletion`, `reverse-bias`, `full-depletion`. Cross-section with three panels: charge density ρ(x), field E(x), geometry.
- `contact`: p and n regions side by side; electrons (accent) and holes (accent2) diffusing across, recombining near the boundary.
- `depletion`: a centred band with no free carriers, fixed ± ions (small squares) visible; E(x) triangle appears; label "depletion region". A pair created inside is separated (short animation).
- `reverse-bias`: battery symbol, n side +; the depleted layer widens; W ∝ √V indicated by the edge position (use the widget formula).
- `full-depletion`: layer spans the sensor; field profile changes from triangle to trapezoid; label "full depletion".
Quantities: W(V) from `BiasDepletion` model.

### `sc.drift` — P2
States: `mip-crossing`, `drift`, `speed`.
- `mip-crossing`: sensor cross-section, track and pair line, field arrow.
- `drift`: electrons move up, holes down, speed ∝ μ E (electrons ~3× faster); thin trajectories, small diffusion jitter (σ ≈ 8 µm after 10 ns).
- `speed`: time axis in ns; arrival of electrons ~ 4 ns (marker), holes ~ 15 ns. Two horizontal progress bars. Labels "electrons ~ few ns", "holes ~ tens of ns".
setProgress not used (steps). Reduced motion: final frames.

### `sc.signal-induction` — P2
States: `weighting-field`, `moving-charge`, `pulse`. Pixel sensor cross-section with a small pixel electrode and a large backplane.
- `weighting-field`: field lines of the weighting field (potential 1 on the pixel, 0 elsewhere) as faint lines, concentrated near the pixel; colour map of |E_w| (viridis).
- `moving-charge`: one electron moves toward the pixel; an instantaneous induced-current bar i ∝ q v·E_w shown beside it growing as it nears the pixel (small-pixel effect).
- `pulse`: waveform i(t) for electron + hole (two curves + sum); area = Q. Schematic time axis 0–20 ns. Not data.
Model: i(t) = −q v(x(t))·E_w(x(t)), E_w from a simple analytic small-pixel approximation (e.g. E_w ∝ 1/(1 + (r/p)²)), v = μE with the constants in `SC`.

### `sc.charge-sharing` — P2 (+ widget `ChargeSharing`)
States: `cloud`, `pixels`, `centroid`, `binary`.
- `cloud`: a point cloud of electrons broadening with depth, σ ≈ 8 µm label.
- `pixels`: end view: 3×3 pixel grid; a cloud lands on a boundary; pixel colours (inferno) by collected charge; numbers as % per pixel.
- `centroid`: weighted centroid marker (cross) vs true position (dot); residual arrow.
- `binary`: pixels as on/off only; marker at the hit pixel centre; error shown as a uniform box of width p; label "σ = pitch/√12".

### `sc.strip` — P2
States: `strips`, `stereo`.
- `strips`: top view of a sensor with long parallel strips; one particle fires a strip (highlighted) → 1D position; counter "channels: N strips vs N² pixels".
- `stereo`: two strip layers crossed at a small angle; the two fired strips intersect at the hit; extra "ghost" intersections when two particles hit (greyed, labelled "ghost").

### `sc.walkthrough-hybrid` — P9 (inside `<Walkthrough>`; representative: ATLAS pixels)
Cross-section: sensor (teal) on top, solder bumps (copper circles), readout chip (grey with circuit blocks) below.
States: `goal`, `drift`, `bump`, `amplify`, `readout`, `trick`.
- `goal`: whole module, the particle crossing it; pixel grid view marking one hit.
- `drift`: pairs drift to the pixel electrode; scale ~ 50 µm pitch label.
- `bump`: zoom to one bump joining pixel to amplifier; label "bump bond".
- `amplify`: pulse waveform out of the amplifier with a threshold line; "hit" flag raised when above (schematic).
- `readout`: the pixel map with fired pixels, cluster centroid marked.
- `trick`: sensor and chip drawn apart, labelled "optimised separately", with bumps highlighted.

### `sc.walkthrough-maps` — P9 (representative: ALICE ITS2 / ALPIDE)
Cross-section: p-type substrate, epitaxial layer ~25 µm, small n-well collection electrode, p-wells holding circuits (deep p-well).
States: `goal`, `epi-layer`, `collect`, `in-pixel`, `readout`, `trick`.
- `goal`: a thin module in a layer; material comparison bar vs hybrid (qualitative).
- `epi-layer`: the epitaxial layer highlighted with the track and pairs.
- `collect`: carriers diffusing (random-walk paths, not straight) toward the small electrode; caption "diffusion, then collection".
- `in-pixel`: circuit blocks (amplifier, discriminator, memory) in the deep p-well; the well shields them (field lines bend around).
- `readout`: matrix of pixels; only fired addresses sent out on a bus (arrows).
- `trick`: chip thinning animation 300 → 50 µm; label "one piece of silicon".
Quantities: epi ≈ 25 µm, chip ≈ 50 µm thick, pixel ≈ 30 µm.

### `sc.walkthrough-lgad` — P9 (representative: ATLAS HGTD)
Cross-section: n++ electrode, p+ gain layer (thin, near the electrode), p-bulk ~ 50 µm.
States: `goal`, `drift`, `gain-layer`, `fast-edge`, `timestamp`, `trick`.
- `goal`: overlapping collisions in space (two vertices drawn close in z), time axis separating them.
- `drift`: pairs in a thin bulk; short drift.
- `gain-layer`: field profile E(x) with a peak at the gain layer (~3×10⁵ V/cm label); electrons entering it multiply (chain of branching dots, ×~20).
- `fast-edge`: two waveforms overlaid: without gain (noisy slow rise), with gain (steeper, above noise); threshold line; timing jitter = noise/slope as a shaded band on the threshold crossing.
- `timestamp`: clock tick marker with "t = … ps" (schematic), label "30–50 ps".
- `trick`: gain bar "~20" vs a Geiger-mode device "~10⁶" (SiPM) with "proportional" tag on the LGAD.

### `sc.zoo-more` — P2 (text steps; scene = card illustration, one per state; P6 gallery behaviour is optional)
States: `hpge`, `ccd`, `skipper`, `sipm`, `3d`, `wide-gap`.
- `hpge`: coaxial crystal cross-section in a cryostat (77 K label), gamma → pairs; side panel: schematic gamma spectrum with a sharp peak vs a broader scintillator peak (schematic).
- `ccd`: grid of buckets; charge rows shifting down (animated clock), to one output amplifier.
- `skipper`: output stage measuring the same packet N times; histogram of readings narrowing as N grows; single-electron peaks resolved (schematic).
- `sipm`: grid of microcells; one photon → one cell fires (full pulse); sum of cell pulses = integer photon count staircase.
- `3d`: cross-section with columns through the bulk; short lateral drift distance marked vs planar thickness.
- `wide-gap`: band-gap comparison bars (Ge 0.67, Si 1.12, SiC 3.3, diamond 5.5) with pair energy ratio.

### `sc.lab-pipeline` — P2 sticky (pipeline strip across the top, a pictogram per state)
States: `tcad`, `asic`, `probe`, `source`, `tct`, `testbeam`, `irradiation`, `integration`.
- `tcad`: field map colour (viridis) of a simulated cross-section next to a simulated particle trace (schematic).
- `asic`: three coupled blocks — amplifier, shaper, discriminator — and a triangle "noise / threshold / power" with a point moving inside.
- `probe`: needle probe on a wafer; an I–V curve inset.
- `source`: ⁹⁰Sr (β⁻) and ⁵⁵Fe (5.9 keV X) sources above a sensor, with their charge labels (MIP-like, ≈ 1,640 e⁻).
- `tct`: laser spot scanning over the sensor, depth-selective spot (TPA) as a small bright voxel; charge map as a colour image.
- `testbeam`: beam line with telescope planes (links to `sc.testbeam`).
- `irradiation`: a sensor under a particle shower; fluence counter in n_eq/cm².
- `integration`: exploded stave: sensors, flex cable, cold plate, carbon support.

### `sc.iv-curve` — P8, inside `<Figure kind="schematic">`
States: `iv`, `cv`. Plot via `plot()`.
- `iv`: log-current vs voltage; slow rise (∝ √V below full depletion, then flat), sharp upturn at breakdown. Marks: V_fd, V_bd. No numbers on y beyond "low" / "high".
- `cv`: 1/C² versus V rising linearly, then constant above V_fd; knee marked. Schematic.

### `sc.testbeam` — P2 (+ widget `TestbeamResiduals`)
States: `telescope`, `track`, `residual`.
- `telescope`: beam line, 6 reference planes (3 + 3) around the DUT, one particle track passing as straight line; planes drawn as thin sheets with a pixel pattern.
- `track`: hits connected, fit line extrapolated to the DUT; DUT hit or miss flagged; efficiency counter.
- `residual`: histogram of (measured − predicted) building up from simulated tracks (Gaussian of width σ_res set by the widget default).

### `sc.radiation-damage` — P2
States: `defects`, `leakage`, `doping`, `trapping`, `anneal`.
- `defects`: lattice (2D schematic); a fast particle displaces an atom → vacancy + interstitial; counter of fluence (n_eq/cm²).
- `leakage`: band diagram with mid-gap defect levels; electrons hop through; the I–V sketch with leakage line rising with fluence.
- `doping`: N_eff vs fluence curve (schematic): decreases, passes through a minimum, rises; V_fd follows.
- `trapping`: drifting electron caught by a trap and released later; collected charge fraction bar shrinking.
- `anneal`: leakage current vs time at room temperature, decaying; beneficial vs reverse annealing sketch (schematic).

### `sc.its3` — P1, mode `scrub`
States: `its2`, `limits`, `flat-wafer`, `bending`, `cylinder`, `material`.
- `its2`: end view of 7 ITS2 layers; innermost radius marked (≈ 22 mm); flat chips on staves.
- `limits`: the innermost three layers exploded; material fractions shown as a stacked bar: silicon vs support/cooling/cables (qualitative).
- `flat-wafer`: a 300 mm wafer with a rectangular stitched sensor of 26 cm marked; thinning to ~50 µm.
- `bending`: progress ∈ [0,1] bends the sheet from flat to a half-cylinder of the layer's radius (physical radius given). The bending curve is the physical shape (circular arc).
- `cylinder`: two half-cylinders around the beam pipe; foam supports (ribs), air-flow arrows. Innermost radius ≈ 19 mm.
- `material`: bar chart ITS2 inner layer ≈ 0.35 % X₀ vs ITS3 ≈ 0.07 % X₀ (labelled "as of 2025 design values"), and the impact-parameter resolution band improved ≈ ×2 (schematic).

### `sc.its3-bending` — P8, inside `<Figure kind="schematic">`
States: `wafer`, `half-cylinder`. A looped two-state morph (flat → curved) with scale bars "26 cm", "≈ 50 µm". Not to scale in thickness (draw ≥ 2 px).

### `sc.walkthrough-its3-heavyflavour` — P9 (representative: ALICE ITS3)
States: `goal`, `vertex`, `extrapolate`, `displaced`, `trick`.
- `goal`: a collision point with a short-lived D meson flying a fraction of a mm and decaying; the decay tracks drawn.
- `vertex`: beam pipe + 2 silicon layers; a track with its two hits.
- `extrapolate`: the line extrapolated back with an uncertainty band (width from the σ_d0 formula); hit-resolution and scattering contributions in two colours.
- `displaced`: impact parameter d₀ marked for a displaced track (tens of µm) vs a primary track (≈ 0).
- `trick`: two panels (ITS2-like vs ITS3-like geometry) with the error band narrower in the second; inputs r₁ and x/X₀ shown.
Model: σ_d0 formula in the MDX Deeper; ms term with θ₀ = 13.6 MeV/(βcp) √(x/X₀) at p = 1 GeV/c.

### `sc.cbm-silicon` — P2
States: `mvd`, `sts`.
- `mvd`: target + 4 MAPS stations in vacuum, tracks from a decay vertex displaced from the target.
- `sts`: 8 strip stations inside a dipole; bent tracks; time-stamped hits stream (small time axis).
(Re-use the Heavy-Ion `hi.walkthrough-fixed-target` assets where possible.)

### `sc.future` — P2
States: `timing-4d`, `alice3`, `fcc`, `beyond`.
- `timing-4d`: a (z, t) plot: two vertices overlapping in z but separated in t; sensor with timing resolves them (schematic).
- `alice3`: schematic of an all-silicon barrel with innermost layers inside the beam pipe (retractable), radius a few mm (label "as of 2025: design stage").
- `fcc`: vertex detector sketch with a ring layout, labels "less material", "few µm".
- `beyond`: three icons: space telescope tracker, hospital imaging, radiation monitor.

---

## Widgets (P5) — `src/components/widgets/<Name>.svelte`, props `lang` plus those listed
Style: Svelte, light page, native `<input type="range">` with visible value + unit, plot beside/below (DIRECTION Figures/Widgets).

### `BiasDepletion`
- Inputs: bias voltage V (slider 0–300 V, default 0); sensor thickness d (selector 100/200/300/500 µm, default 300); optional bulk resistivity ρ (selector 1/4/10 kΩ·cm, default 4) → N_eff.
- Model: N_eff = 1/(q μ_n ρ) for n-type bulk (μ_n = 1350 cm²/Vs); W = min(d, √(2 ε₀ ε_r (V_bi + V)/(q N_eff))) with ε_r = 11.9, ε₀ = 8.854×10⁻¹⁴ F/cm, V_bi = 0.6 V; V_fd = q N_eff d² / (2 ε_0 ε_r) − V_bi (clamp ≥ 0). Collected MIP charge Q ≈ 80 µm⁻¹ × W (with the field-free remainder collecting nothing). Leakage current I ∝ W (generation current in the depleted volume, schematic units: I/I(V_fd) = W/d). Check: ρ = 4 kΩ cm → N_eff ≈ 1.2×10¹² cm⁻³ → V_fd ≈ 80 V for 300 µm.
- Output: the cross-section with the depleted band coloured; marker at W; plots W(V) (∝ √V then flat) with V_fd marked; readouts V, W, V_fd, Q (in e⁻), relative leakage; arrow showing the field profile.

### `MipCharge`
- Input: thickness slider (10–500 µm, default 300 µm), material selector (silicon only by default; optional: Ge, diamond via different `w` and pair density).
- Model: N_pairs = 80 µm⁻¹ × t (silicon, most probable); ΔE = 0.39 keV/µm × t (mean). Readout noise reference: ENC ≈ 100 e⁻ (typical hybrid pixel, schematic) → S/N = N/ENC.
- Output: the number of pairs (shown also as dots in a sensor cross-section), the energy deposited, S/N bar; side comparison "gas of the same thickness (≈ 1 cm of gas: ~100 pairs)" is optional.

### `ChargeSharing`
- Inputs: hit position x₀ within a 3×1 or 3×3 pixel row (drag a dot, or slider across 0–150 µm), pitch p (25/50/100 µm), cloud width σ (slider 2–20 µm, default 8), toggle readout "analogue / binary".
- Model: charge fraction for pixel k = ½[erf((x_{k+1} − x₀)/(σ√2)) − erf((x_k − x₀)/(σ√2))]; analogue estimate = Σ q_k x_k / Σ q_k (centroid; with noise ~ 5 % of total optional); binary estimate = centre of the pixel with the largest charge; error = estimate − x₀.
- Output: per-pixel charge bars and the estimates; running RMS of the error over the last ~200 random hits: for binary expected p/√12 (shown as a dashed line), for analogue a value several times smaller at p ≈ 3σ (schematic, depends on σ).

### `TestbeamResiduals`
- Inputs: DUT pitch p (25/50/100 µm), telescope resolution σ_tel (1–10 µm, default 3), beam momentum p_beam (1–10 GeV/c, default 5), readout mode analogue/binary.
- Model: σ_DUT = p/√12 (binary) or p/√12 × 0.3 (analogue, schematic); prediction error σ_pred = √(σ_tel² + (θ₀ d_arm)²) with θ₀ from the multiple-scattering formula (silicon X₀ = 9.37 cm; 6 × 50 µm planes; arm length 15 cm; ≤ a few µm at 5 GeV); residual width σ_res = √(σ_DUT² + σ_pred²). Draw N = 1 … 2000 events with sampled Gaussian residuals; Play button adds events.
- Output: telescope + track animation on the left; residual histogram on the right with the Gaussian curve; readouts σ_res, σ_pred, deduced σ_DUT = √(σ_res² − σ_pred²), efficiency (fixed 99 %, shown as ratio of hit/miss counts).
- Simulated example only: label "Simulated".

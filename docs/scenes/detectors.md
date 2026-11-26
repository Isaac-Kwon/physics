# Detectors — scene and widget spec (content track → scene builders)

Source text: `src/content/topics/detectors/en.mdx`. State names below are the ones used in `<Step state>` and must be the `states` array of each scene module, in this order.
Constants: `src/data/detectors.ts` (`DET.*`). Accent: cyan `#5fe1ff` / white. Topic hero scene is `det.hook` (registry `heroScene`; the storyboard's `det.event-burst` is this scene).
Rules (PLAN §1.3, DIRECTION Figures): every mark is a quantity (position, momentum, energy, time, light intensity). Light emission (Cherenkov cone, scintillation flash, calorimeter light) may use additive blending; nothing else glows. Lines 1–1.5 px, particles 1.5–3 px dots. Continuous quantities (energy, deposited charge) use `interpolateViridis`/`interpolateInferno` only. Schematic plots go inside `<Figure kind="schematic">`: no data points, no error bars. Reduced motion: draw the final frame of each state, no loops.
Labels via `ctx.label(key)` in `src/i18n/en/scenes-detectors.json` (`scene.det.<name>.<key>`).

Pattern key: P1 pinned scrub, P2 sticky steps, P5 widget, P8 schematic plot reveal, P9 walkthrough, P6 gallery.

Reused shared scenes (no new work): `shared.tpc` (`drift`, `readout`), `shared.magnetic-track` (`tracks`, `fit`) — cyan theme.

---

## Scenes

### `det.hook` — P1, mode `scrub` (topic hero)
States: `dark`, `burst`, `detector`.
- `dark`: black field, a single faint dot (vertex) at the centre.
- `burst`: tracks leave the vertex. Order 10^2 curved tracks (helices in a field), track length ∝ progress; colour = momentum (viridis, stiffer = brighter); a few arcs curve opposite ways (charge sign).
- `detector`: camera pulls out; concentric detector silhouette (barrel cross-section, 5–6 rings of the onion) appears around the tracks; scale bar "~20 m". No labels beyond the scale bar.

### `det.history` — P2
States: `scintillation-screen`, `cloud-chamber`, `emulsion`, `bubble-chamber`, `wire-chamber`, `electronic`. One panel per era with a year stamp and an instrument name, same track pattern drawn in each era's style (not photographs):
- `scintillation-screen`: dark screen, isolated flashes (additive, decaying 0.5 s), counter tally.
- `cloud-chamber`: thin white fog lines, one curved (field on), fading.
- `emulsion`: a track as a chain of dark grains on a pale plate, a pion stopping and a muon leaving (kink).
- `bubble-chamber`: dense bubble tracks, spiral low-energy electrons, an interaction vertex with several tracks.
- `wire-chamber`: a grid of wires; hit wires light; reconstructed track overlaid; pulse trace in the corner.
- `electronic`: composite: pixel hits, calorimeter towers (viridis heights), muon hits, all along one track.
Quantity: the era stamp; the trace density, not a numeric claim.

### `det.cloud-chamber` — P2
States: `vapour`, `track`, `muons`. Side view of a box: cold plate at the bottom, vapour density gradient (supersaturated layer highlighted).
- `vapour`: vapour dots, cooling gradient, supersaturated layer labelled.
- `track`: one particle crosses; ions along its path; droplets nucleate and grow; the line fades over ~1 s (loop).
- `muons`: occasional straight tracks at random angles (rate ~1 per minute per hand area, accelerated and labelled "sped up") and a short thick alpha track.

### `det.matter-block` — P2
Side view of a slab of matter with one incoming particle. Scale bar in cm; for brems/shower states the slab is drawn in units of X₀ with a ruler.
States in order: `ionization`, `brems`, `photon-pe`, `photon-compton`, `photon-pair`, `em-shower`, `had-shower`, `neutral`, `cherenkov`, `scintillation`.
- `ionization`: charged track (accent) leaves ion–electron pairs along the path; spacing ∝ dE/dx at the current β (use the `BetheBloch` function); one rare large-energy delta electron.
- `brems`: an electron deflected near a nucleus emits a photon (wavy line); ruler in X₀ with markers for lead, silicon and water (`DET.X0_*`); energy fraction left after k X₀ is e^{-k}.
- `photon-pe`: low-energy photon absorbed by an atom; electron leaves; energy label E_γ − binding.
- `photon-compton`: photon scatters, loses energy (wavy line shorter in wavelength, drawn lighter), electron recoils; angle and energy relationship follow the Compton formula.
- `photon-pair`: photon of E > 1.022 MeV converts near a nucleus into e⁺e⁻ with opposite curvature in a weak field; threshold labelled.
- `em-shower`: Heitler tree; generation k has 2^k particles with energy E₀/2^k; generations stop at E_c; ruler in X₀; colour = energy per particle (inferno). Longitudinal profile bar chart underneath, shape from a gamma distribution (schematic). progress = depth.
- `had-shower`: slab in units of λ_I (λ_I ≈ 10 X₀ in iron, `DET.LAMBDA_I_IRON_CM`); an incoming hadron collides, produces charged hadrons (accent), neutral pions that decay to photon pairs (EM sub-showers in white), and a few invisible neutrons (dashed, no deposit). Irregular profile.
- `neutral`: three particles in parallel panels or sequential: neutron (nuclear collision, charged fragments), neutrino (passes through; no interaction drawn), photon already shown. Keep to neutron and neutrino.
- `cherenkov`: particle with β = 0.99 in water: wavefront circles from points along the path and their envelope = cone with half-angle θ_c = arccos(1/(nβ)); drag-free; slow particle (β < 1/n) shown dimmer with no cone. Photon sensor ring on the right with a projected ring. Light additive.
- `scintillation`: particle crosses a block; flash of photons ∝ deposited energy (of order 10⁴/MeV, `DET.SCINT_PHOTONS_PER_MEV`); photons go to a PMT/SiPM symbol and a pulse appears. Dot counts scaled, labelled "not to scale (×1/100)".

### `det.photon-regions` — P8 schematic (inside `<Figure kind="schematic">`)
State: `regions`. Plane: x = photon energy (log, 10 keV–100 GeV), y = Z (1–100). Three regions: photoelectric (lower left), Compton (middle band), pair production (right). Boundaries from the textbook crossover curves (qualitative: Compton/pair at ~5 MeV for lead, ~30 MeV for silicon; photoelectric/Compton at ~0.5 MeV in lead). Label curves directly. Mark 1.022 MeV on the x axis. Banner "approximate boundaries".

### `det.signal-chain` — P2
States: `charge`, `scintillation`, `cherenkov`, `timing`.
- `charge`: ionization electrons drift in a field to a wire; avalanche near the wire (gas); in a silicon wafer, e–h pairs drift opposite ways. Charge bar ∝ number of pairs (3.6 eV/pair; 80 pairs/µm).
- `scintillation`: flash in a crystal → light guide → PMT (photocathode, dynode chain with growing electron counts 1, 3, 9, ...; gain ~1e6) and a SiPM cell grid next to it (single cell fires).
- `cherenkov`: cone of light hits a photon-sensor plane as a ring; ring radius readout.
- `timing`: two timing layers with a particle crossing; stopwatch Δt ~ 30 ps ↔ ~ 1 cm light-travel distance scale (3 mm per 10 ps, `DET.LIGHT_CM_PER_NS`).

### `det.walkthrough-calorimeter` — P9 (crystal ECAL; cyan)
Cross-section of one crystal (long axis horizontal, 25 X₀ ruler, `DET.X0_PBWO4_CM`) next to a 3×3 crystal front view.
States: `goal`, `shower`, `light`, `photosensor`, `sum`, `containment`.
- `goal`: incoming electron, crystal outline, "stop it completely".
- `shower`: shower tree inside the crystal; energy-per-particle colouring; depth ruler to 25 X₀.
- `light`: scintillation photons from the charged particles (additive), density ∝ local energy deposit.
- `photosensor`: sensor at the rear; photon → pulse; Moliere radius circle (2 cm) on the front view with 90 % containment.
- `sum`: nine towers coloured by deposited energy (viridis); sum label E; centroid marker.
- `containment`: two showers, 10 GeV and 100 GeV: relative width of the Poisson fluctuation ∝ 1/√N shown as a narrower distribution for 100 GeV.

### `det.energy-resolution` — P8 schematic (inside `<Figure kind="schematic">`)
States: `stochastic`, `noise`, `constant`, `sum`. Axes: x = E (log, 0.1–1000 GeV), y = σ/E (log). Curves: a/√E (slope −1/2), c/E (slope −1), constant b (flat), and their quadrature sum (accent). Each state reveals one curve. Parameters qualitative: a = 3 %, b = 0.5 %, c = 0.2 GeV (labelled "illustrative"). No numbers on the y axis other than "0.1 %", "1 %", "10 %".

### `det.walkthrough-rich` — P9 (LHCb RICH; cyan)
Side view: track along z through a radiator, a spherical mirror, a photon-detector plane tilted aside.
States: `goal`, `cone`, `ring`, `radius`, `focus`.
- `goal`: two tracks, same momentum, labelled π and K, indistinguishable in the tracker.
- `cone`: radiator with n (aerogel / gas; label n − 1 ~ 1e-3 for gas) and the Cherenkov cone for β values; rays at θ_c.
- `ring`: mirror focuses the cone onto a ring on the detector plane; emission-point independence shown by emitting from three points (all rays land on the same circle).
- `radius`: ring radii for π and K at the same p (K smaller); formula cos θ_c = 1/(nβ) with the plot θ_c(p) for π, K, p (schematic, from the formula, saturating at arccos(1/n)).
- `focus`: two radiators with different n on the same momentum axis; thresholds (β > 1/n) as vertical marks.

### `det.onion` — P1 pinned, steps (state change + exploded/assembled morph)
States: `assembled`, `vertex`, `tracker`, `ecal`, `hcal`, `magnet`, `muon`.
End view and side view of a barrel detector with concentric layers: beam pipe, vertex detector, tracker, electromagnetic calorimeter, hadron calorimeter, magnet, muon system.
- `assembled`: all layers drawn together, scale bar "~20 m".
- each later state highlights one layer (the scene explodes progressively as steps advance): layer pulls out radially, name and role appear (role keywords: "where it started", "charge and momentum", "energy of e and γ", "energy of hadrons", "bend", "muons only"). Highlight uses accent, others fade to 20 %.
Quantity: relative radii (schematic, not drawn to scale; ruler marked "not to scale").

### `det.signatures` — P2 (and used by the `ParticleSignatures` widget for per-particle drawing)
States: `photon`, `electron`, `muon`, `charged-hadron`, `neutral-hadron`, `neutrino`.
End view of the onion (from `det.onion`, dimmed). Per state one particle leaves a signature:
- `photon`: no track; ECAL shower (energy colour).
- `electron`: curved track, ECAL shower with deposit ∝ momentum.
- `muon`: curved track; small deposits (MIP) in ECAL and HCAL; hits in the muon system; the track continues beyond.
- `charged-hadron`: curved track; small deposit in ECAL; larger shower in HCAL.
- `neutral-hadron`: no track; HCAL shower (an ECAL start is optional).
- `neutrino`: nothing; a small arrow of missing transverse momentum drawn from the vertex opposite the visible momentum.
Each state shows the layers lit as a small table of ✓ per layer (text, not colour only).

### `det.walkthrough-muon` — P9 (ATLAS muon spectrometer; cyan)
Cross-section of a tube chamber, with a toroidal field arrow.
States: `goal`, `drift-tube`, `circles`, `fit`, `muon-trick`.
- `goal`: muon arrow entering from the left through absorber rectangles (the calorimeters) into the outer chambers.
- `drift-tube`: one tube close-up; ionization electrons drift to the central wire; arrival time stamp.
- `circles`: circles around each wire with radius = v_d × t (v_d from `DET.DRIFT_VELOCITY_GAS_CM_US`); the track tangent to all circles.
- `fit`: tangent line + curvature across three chamber stations (sagitta shown).
- `muon-trick`: other particles (e, γ, hadron) drawn stopping in the absorber; only the muon reaches the chambers.

### `det.trigger` — P2
States: `rate`, `levels`, `streaming`.
- `rate`: time axis with 40 MHz bunch crossings as ticks (density-scaled; labelled), counter "40 MHz → ~kHz" (`DET.LHC_BUNCH_CROSSING_HZ`, `DET.STORED_EVENTS_HZ`).
- `levels`: funnel: 40 MHz → Level 1 (~100 kHz, `DET.L1_ACCEPT_HZ`, "microseconds") → software (~kHz); events as dots filtering; rejected dots fall away.
- `streaming`: no funnel; all hits time-stamped flow to a buffer and are sorted by time into collisions.

### `det.momentum-resolution` — P8 schematic (inside `<Figure kind="schematic">`)
States: `terms`, `lever-arm`. Axes: x = p_T (log, 0.1–1000 GeV/c), y = σ(p_T)/p_T (log). Curves: multiple-scattering term (flat), curvature term (∝ p_T), quadrature sum with a minimum. `lever-arm`: second curve set with a tracker twice as large (the curvature term lower by 4×) as a faint overlay. Labelled "illustrative".

### `det.tradeoffs` — P2
States: `material`, `readout`, `radiation`.
- `material`: a silicon layer drawn at several thicknesses, signal bar (∝ thickness) vs scattering cone (∝ √thickness).
- `readout`: triangle of power, speed and material (cooling): three sliders not required; static diagram with arrows.
- `radiation`: dose map (radius²) with the detector layers placed; damage markers on the innermost.

### `det.simulation` — P2
States: `generate`, `transport`, `digitize`, `compare`.
- `generate`: vertex with particle arrows from a generator.
- `transport`: random walk of each particle through the detector geometry, interactions drawn as in `det.matter-block`.
- `digitize`: energy deposits → signal pulses with noise → threshold line.
- `compare`: two event displays side by side (labelled "simulated" and "recorded"), no real data: both drawn from the same random generator with different seeds; labelled "illustration".

### `det.frontier` — P2
States: `timing4d`, `ml`, `next`.
- `timing4d`: two vertices overlapped in space but separated in time; a timing layer separates them (point cloud with a colour = arrival time).
- `ml`: tracks drawn as hits; a network arrow selects the true tracks from combinatorial hits.
- `next`: timeline "now · 2030 · later" with words "as of 2025" (no exact dates beyond what the text states).

Gallery (P6): text-only, five items (tracker, calorimeter, particle identification, muon system, trigger and data acquisition).

---

## Widgets (P5) — `src/components/widgets/<Name>.svelte`, props `lang` plus those listed

### `BetheBloch` (exists)
Used as `<Widget name="BetheBloch" />` (general mode) in `interactions` and `<Widget name="BetheBloch" mode="pid" />` in `measurement`. Nothing new to build.

### `TrackCurvature` (new)
- Input: slider B (0.5–4 T), slider p_T (0.1–1000 GeV/c, log), particle charge sign toggle (±1).
- Model: R = p_T / (0.3 B) (m); helix in the transverse plane inside a circular tracker of radius 1.2 m (a track exits if 2R is less than its path); sagitta over the tracker radius s = L²/(8R) with L = 1 m; relative resolution readout σ(p)/p ∝ p (schematic constant: 1e-4 per GeV at B = 4 T, scaled ∝ 1/B), displayed as "≈".
- Output: top view with the track, its circle (dashed), sagitta marker; readouts R, sagitta, bend direction ("positive charge turns clockwise with B out of the page" as stated by the sign convention shown in the figure), and a warning line "nearly straight: hard to measure" when s < 1 mm.

### `ParticleSignatures` (new, with quiz mode)
- Input: select a particle (photon, electron, muon, charged hadron, neutral hadron, neutrino) and an energy slider (1–100 GeV, log).
- Model: per-layer deposit table from qualitative rules (see `det.signatures`): track present Y/N, ECAL deposit fraction (e, γ: 1.0; μ: MIP; charged hadron: ~0.3 + noise; neutral hadron: ~0.3 + noise), HCAL fraction (hadrons ~0.7, others 0), muon system hit Y/N, missing momentum arrow. Random fluctuation ~ 1/√E. Not quantitative: label "qualitative".
- Output: onion end view with the signature drawn (reuse `det.signatures` drawing code in `src/scenes/detectors/_onion.ts`), plus a text table of layers lit.
- Quiz mode (`mode="quiz"` or a toggle): a signature is shown with the particle hidden; four-choice answer; feedback names the distinguishing layer; score only for the session. Neutral hadron versus neutrino and electron versus photon are the standard pairs to confuse (track or no track).

---

## Primer (new in this track)

`scintillation` — `src/content/primers/scintillation/en.mdx`, no figure (optional later: `det.signal-chain` state `scintillation`). Origin `detectors#interactions` per connections.yaml (the page text covers it in `measurement`; the registry's origin is a layer anchor only).

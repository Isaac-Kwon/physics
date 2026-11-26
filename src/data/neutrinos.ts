/**
 * Representative numbers for the Neutrinos page (PLAN §4.5, §6.3).
 * Order-of-magnitude values only — not measurements shown as data. Shared by all languages, scenes and widgets.
 * `value` is a number, or [low, high] for a range.
 */
export interface NuConst {
  value: number | readonly [number, number];
  unit: string;
  note: string;
  /** Textbook / review the order of magnitude can be checked against. */
  source: string;
}

const PDG = 'Particle Data Group, Review of Particle Physics';
const GK = 'Giunti & Kim, Fundamentals of Neutrino Physics and Astrophysics (2007)';
const ZUBER = 'Zuber, Neutrino Physics (2nd ed., 2011)';

export const NU = {
  /** Fluxes and cross-sections */
  SOLAR_FLUX_CM2_S: {
    value: 6e10,
    unit: 'cm^-2 s^-1',
    note: 'Total solar neutrino flux at Earth (dominated by pp neutrinos). Hook number: through a thumbnail every second.',
    source: 'Standard solar model, summarised in ' + PDG,
  },
  XSEC_GEV_CM2: {
    value: 1e-38,
    unit: 'cm^2 per nucleon',
    note: 'Charged-current cross-section at about 1 GeV; grows roughly linearly with energy in this range.',
    source: PDG + ', neutrino cross-section review',
  },
  XSEC_IBD_CM2: {
    value: 1e-43,
    unit: 'cm^2',
    note: 'Inverse beta decay at a few MeV (reactor antineutrinos).',
    source: GK,
  },

  /** Oscillation parameters (rounded, for the widget and schematic plots) */
  DM2_ATM_EV2: {
    value: 2.5e-3,
    unit: 'eV^2',
    note: 'Atmospheric squared-mass splitting, |Δm²31|, rounded.',
    source: PDG,
  },
  DM2_SOL_EV2: {
    value: 7.5e-5,
    unit: 'eV^2',
    note: 'Solar squared-mass splitting, Δm²21, rounded.',
    source: PDG,
  },
  SIN2_2THETA_ATM: {
    value: 1.0,
    unit: '',
    note: 'Nearly maximal atmospheric mixing, sin²2θ23 (about 0.98–1), rounded.',
    source: PDG,
  },
  SIN2_2THETA_SOL: {
    value: 0.85,
    unit: '',
    note: 'Solar mixing, sin²2θ12 ≈ 0.85 (sin²θ12 ≈ 0.31).',
    source: PDG,
  },
  SIN2_2THETA_13: {
    value: 0.085,
    unit: '',
    note: 'Reactor mixing angle, sin²2θ13 ≈ 0.085, rounded.',
    source: PDG,
  },
  OSC_COEFF: {
    value: 1.27,
    unit: 'GeV / (eV^2 km)',
    note: 'Constant in sin²(1.27 Δm² L/E) with Δm² in eV², L in km, E in GeV (= c³/(4ħ) in these units).',
    source: GK,
  },
  L_OVER_E_FIRST_MAX_ATM_KM_GEV: {
    value: 500,
    unit: 'km/GeV',
    note: 'First oscillation maximum for the atmospheric splitting: L/E = π/(2·1.27·Δm²) ≈ 495.',
    source: 'Computed from the formula with ' + PDG + ' values',
  },

  /** Masses */
  M_NU_KATRIN_EV: {
    value: 0.45,
    unit: 'eV',
    note: 'Upper limit (90% CL) on the electron-neutrino mass, KATRIN, as of 2025.',
    source: 'KATRIN Collaboration, Science (2025)',
  },
  M_SUM_MIN_EV: {
    value: [0.06, 0.1],
    unit: 'eV',
    note: 'Lowest sum of masses allowed by oscillations: about 0.06 (normal) to 0.1 (inverted).',
    source: PDG,
  },

  /** Detector sizes */
  SUPERK_MASS_KT: {
    value: 50,
    unit: 'kt',
    note: 'Super-Kamiokande total water mass (about 22.5 kt fiducial).',
    source: 'Super-Kamiokande Collaboration public pages',
  },
  SUPERK_PMT_COUNT: {
    value: 1.1e4,
    unit: '',
    note: 'Large photomultiplier tubes in the inner detector, order of magnitude.',
    source: 'Super-Kamiokande Collaboration public pages',
  },
  SUPERK_DEPTH_KM: {
    value: 1,
    unit: 'km',
    note: 'Rock overburden above Super-Kamiokande.',
    source: 'Super-Kamiokande Collaboration public pages',
  },
  JUNO_MASS_KT: {
    value: 20,
    unit: 'kt',
    note: 'JUNO liquid scintillator mass. Data taking began in 2025.',
    source: 'JUNO Collaboration public pages',
  },
  JUNO_BASELINE_KM: {
    value: 50,
    unit: 'km',
    note: 'Approximate distance to the reactor complexes.',
    source: 'JUNO Collaboration public pages',
  },
  HOMESTAKE_MASS_T: {
    value: 600,
    unit: 't',
    note: 'Perchloroethylene in the Davis tank (about 615 t).',
    source: ZUBER,
  },
  HOMESTAKE_DEPTH_KM: {
    value: 1.5,
    unit: 'km',
    note: 'Depth of the Davis experiment (4850 ft level).',
    source: ZUBER,
  },
  HOMESTAKE_AR_PER_EXTRACTION: {
    value: [10, 50],
    unit: 'atoms',
    note: 'Argon-37 atoms collected per extraction run (a few tens); the capture rate is about one atom every couple of days.',
    source: ZUBER,
  },
  AR37_HALF_LIFE_D: {
    value: 35,
    unit: 'd',
    note: 'Half-life of argon-37 (electron capture).',
    source: 'Nuclear data tables',
  },
  DUNE_BASELINE_KM: {
    value: 1300,
    unit: 'km',
    note: 'Fermilab to the Sanford Underground Research Facility.',
    source: 'DUNE Collaboration public pages',
  },
  DUNE_DEPTH_KM: {
    value: 1.5,
    unit: 'km',
    note: 'Depth of the DUNE far detector.',
    source: 'DUNE Collaboration public pages',
  },
  LAR_PURITY_PPB: {
    value: 1,
    unit: 'ppb',
    note: 'Impurity (oxygen equivalent) must be well below one part per billion for multi-metre drift.',
    source: 'DUNE Collaboration public pages',
  },
  ICECUBE_VOLUME_KM3: {
    value: 1,
    unit: 'km^3',
    note: 'Instrumented ice volume.',
    source: 'IceCube Collaboration public pages',
  },
  ICECUBE_STRINGS: {
    value: 86,
    unit: '',
    note: 'Cables (strings), each with 60 optical sensors (5160 in total).',
    source: 'IceCube Collaboration public pages',
  },
  ICECUBE_DEPTH_KM: {
    value: [1.45, 2.45],
    unit: 'km',
    note: 'Depth range of the sensors.',
    source: 'IceCube Collaboration public pages',
  },
  COHERENT_BASELINE_M: {
    value: 20,
    unit: 'm',
    note: 'Distance from the Spallation Neutron Source to the first CsI detector (about 19 m).',
    source: 'COHERENT Collaboration, Science 357 (2017) 1123',
  },
  CEVNS_RECOIL_KEV: {
    value: [1, 10],
    unit: 'keV',
    note: 'Typical nuclear recoil energy in CEvNS at tens of MeV neutrino energy.',
    source: 'COHERENT Collaboration, Science 357 (2017) 1123',
  },

  /** Optics / timing */
  CHERENKOV_ANGLE_WATER_DEG: {
    value: 41,
    unit: 'deg',
    note: 'arccos(1/n) with n ≈ 1.33 for β → 1.',
    source: 'Any particle-detector text',
  },
  WATER_INDEX: {
    value: 1.33,
    unit: '',
    note: 'Refractive index of water.',
    source: 'Any optics text',
  },
  IBD_THRESHOLD_MEV: {
    value: 1.8,
    unit: 'MeV',
    note: 'Minimum antineutrino energy for inverse beta decay on a free proton.',
    source: GK,
  },
  IBD_DELAY_US: {
    value: [10, 200],
    unit: 'µs',
    note: 'Neutron capture delay in liquid scintillator (about 200 µs on hydrogen; shorter with gadolinium).',
    source: 'Daya Bay / JUNO public pages',
  },
  N_CAPTURE_GAMMA_MEV: {
    value: 2.2,
    unit: 'MeV',
    note: 'Gamma-ray energy released on neutron capture by hydrogen.',
    source: 'Nuclear data tables',
  },

  /** Sources and astrophysics */
  SN1987A_EVENTS: {
    value: 20,
    unit: 'events',
    note: 'Neutrino events recorded (Kamiokande-II, IMB, Baksan: about 25 combined) in about 10 s.',
    source: ZUBER,
  },
  REACTOR_NU_PER_GW_S: {
    value: 2e20,
    unit: 's^-1 per GW thermal',
    note: 'Electron antineutrinos emitted per second per gigawatt of thermal power, order of magnitude.',
    source: GK,
  },
  CNB_DENSITY_CM3: {
    value: 56,
    unit: 'cm^-3 per species (neutrino + antineutrino: 112)',
    note: 'Relic neutrino number density; not yet detected.',
    source: GK,
  },
  KM3_EVENT_PEV: {
    value: 220,
    unit: 'PeV',
    note: 'Estimated energy of KM3-230213A (wide uncertainty), as of 2025.',
    source: 'KM3NeT Collaboration, Nature 638 (2025) 376',
  },
  DBD_HALF_LIFE_LIMIT_YR: {
    value: 1e26,
    unit: 'yr',
    note: 'Order of the current 0νββ half-life limits for Ge-76 and Xe-136, as of 2025.',
    source: 'GERDA/LEGEND-200, KamLAND-Zen publications',
  },
  /** Q-values of double-beta isotopes used in the schematic spectrum */
  DBD_Q_GE76_MEV: { value: 2.039, unit: 'MeV', note: 'Q-value of Ge-76 double-beta decay.', source: 'Nuclear data tables' },
  DBD_Q_TE130_MEV: { value: 2.527, unit: 'MeV', note: 'Q-value of Te-130 double-beta decay.', source: 'Nuclear data tables' },
  DBD_Q_XE136_MEV: { value: 2.458, unit: 'MeV', note: 'Q-value of Xe-136 double-beta decay.', source: 'Nuclear data tables' },
} as const satisfies Record<string, NuConst>;

export type NuKey = keyof typeof NU;

/** Experiment list for galleries / maps (name, site, principle, rough size). Names and orders of magnitude only. */
export const NU_EXPERIMENTS = [
  { id: 'homestake', name: 'Homestake', site: 'South Dakota, USA', principle: 'radiochemical', size: '600 t C2Cl4' },
  { id: 'gallex', name: 'GALLEX/GNO', site: 'Gran Sasso, Italy', principle: 'radiochemical', size: '30 t gallium (as chloride solution)' },
  { id: 'super-k', name: 'Super-Kamiokande', site: 'Kamioka, Japan', principle: 'water Cherenkov', size: '50 kt water' },
  { id: 'hyper-k', name: 'Hyper-Kamiokande', site: 'Kamioka, Japan', principle: 'water Cherenkov', size: '~250 kt water (under construction)' },
  { id: 'juno', name: 'JUNO', site: 'Guangdong, China', principle: 'liquid scintillator', size: '20 kt' },
  { id: 'reno', name: 'RENO', site: 'Hanbit, Korea', principle: 'liquid scintillator', size: 'tens of tonnes' },
  { id: 'dune', name: 'DUNE', site: 'South Dakota, USA', principle: 'liquid-argon TPC', size: '4 x ~17 kt (planned)' },
  { id: 'icecube', name: 'IceCube', site: 'South Pole', principle: 'ice Cherenkov telescope', size: '1 km3' },
  { id: 'km3net', name: 'KM3NeT', site: 'Mediterranean Sea', principle: 'water Cherenkov telescope', size: 'up to ~1 km3 (under construction)' },
  { id: 'coherent', name: 'COHERENT', site: 'Oak Ridge, USA', principle: 'CEvNS', size: 'kg-scale' },
  { id: 'katrin', name: 'KATRIN', site: 'Karlsruhe, Germany', principle: 'tritium beta spectrometer', size: '70 m beamline' },
  { id: 'legend', name: 'LEGEND', site: 'Gran Sasso, Italy', principle: '0νββ, germanium', size: '200 kg, then 1 t' },
  { id: 'cuore', name: 'CUORE', site: 'Gran Sasso, Italy', principle: '0νββ, TeO2 bolometers', size: '~1 t' },
  { id: 'amore', name: 'AMoRE', site: 'Yemilab, Korea', principle: '0νββ, Mo bolometers', size: 'kg to 100 kg scale' },
  { id: 'kamland-zen', name: 'KamLAND-Zen', site: 'Kamioka, Japan', principle: '0νββ, xenon in scintillator', size: '~750 kg Xe' },
] as const;

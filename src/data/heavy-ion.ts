/**
 * Representative numbers for the Heavy-Ion page (PLAN §4.5, §6.3).
 * Order-of-magnitude values only — not measurements. Shared by all three languages and by scenes/widgets.
 * `value` is a number, or [low, high] for a range.
 */
export interface HiConst {
  value: number | readonly [number, number];
  unit: string;
  note: string;
  /** Textbook / review the order of magnitude can be checked against. */
  source: string;
}

const BUSZA = 'Busza, Rajagopal & van der Schee, Ann. Rev. Nucl. Part. Sci. 68 (2018)';
const BZDAK = 'Bzdak et al., Phys. Rep. 853 (2020)';
const PDG = 'Particle Data Group, Review of Particle Physics';

export const HI = {
  /** Temperatures and energy scales */
  T_QGP_K: {
    value: 1e12,
    unit: 'K',
    note: 'Headline temperature of the plasma, order of magnitude (initial values are a few times higher).',
    source: BUSZA,
  },
  T_SUN_CORE_K: {
    value: 1.5e7,
    unit: 'K',
    note: 'Centre of the Sun; the hook compares ~1e12 K with this (ratio ~1e5).',
    source: 'Standard solar model, any astrophysics text',
  },
  T_C_MEV: {
    value: [155, 160],
    unit: 'MeV',
    note: 'Crossover temperature at near-zero baryon density from lattice QCD; depends on the observable used.',
    source: 'HotQCD (2019) and Wuppertal–Budapest (2020) lattice results, summarised in ' + BZDAK,
  },
  T_C_K: {
    value: 1.8e12,
    unit: 'K',
    note: '155–160 MeV converted with 1 MeV ≈ 1.16e10 K.',
    source: 'Unit conversion',
  },
  T_CHEM_LHC_MEV: {
    value: 156,
    unit: 'MeV',
    note: 'Chemical freeze-out temperature from statistical-hadronization fits at the LHC.',
    source: 'Andronic et al., Nature 561 (2018) 321',
  },
  T_LIQUID_GAS_CRIT_MEV: {
    value: [10, 20],
    unit: 'MeV',
    note: 'Order of the critical temperature of the nuclear liquid–gas transition.',
    source: BZDAK + ' (qualitative); nuclear physics textbooks',
  },
  EPSILON_NUCLEAR_GEV_FM3: {
    value: 0.15,
    unit: 'GeV/fm^3',
    note: 'Energy density of ordinary nuclear matter (0.16 fm^-3 × 0.94 GeV).',
    source: 'Nuclear physics textbook',
  },

  /** Lengths and times */
  R_PB_FM: {
    value: 7,
    unit: 'fm',
    note: 'Radius of a lead nucleus (diameter ~14 fm).',
    source: 'Nuclear physics textbook (R ≈ 1.2 A^(1/3) fm)',
  },
  D_PB_FM: { value: 14, unit: 'fm', note: 'Diameter of a lead nucleus.', source: 'Nuclear physics textbook' },
  FM_C_S: {
    value: 3.34e-24,
    unit: 's',
    note: '1 fm/c, the time light needs to cross one femtometre.',
    source: 'Unit conversion (1e-15 m / 2.998e8 m/s)',
  },
  QGP_LIFETIME_FM_C: {
    value: 10,
    unit: 'fm/c',
    note: 'Order of magnitude of the time spent in the plasma phase at top RHIC and LHC energies (~1e-23 s).',
    source: BUSZA,
  },
  FREEZEOUT_FM_C: {
    value: [10, 20],
    unit: 'fm/c',
    note: 'Approximate time window from hadronization to kinetic freeze-out.',
    source: BUSZA,
  },
  DETECTOR_ARRIVAL_FM_C: {
    value: 1e16,
    unit: 'fm/c',
    note: 'A particle at c reaching a detector 10 m away: 10 m / c ≈ 33 ns ≈ 1e16 fm/c.',
    source: 'Unit conversion',
  },
  T_UNIVERSE_QGP_END_S: {
    value: 1e-5,
    unit: 's',
    note: 'The quark–gluon plasma epoch ends about ten microseconds after the Big Bang.',
    source: 'Cosmology textbook (e.g. Kolb & Turner, The Early Universe)',
  },
  PROPER_TIME_TAU0_FM_C: {
    value: 1,
    unit: 'fm/c',
    note: 'Typical proper time used in Bjorken energy-density estimates.',
    source: 'Bjorken, Phys. Rev. D 27 (1983) 140',
  },

  /** Collision energies, per nucleon pair */
  SQRT_SNN_LHC_PBPB_GEV: {
    value: [2760, 5360],
    unit: 'GeV',
    note: 'Pb–Pb at the LHC: 2.76 TeV (Run 1), 5.02 TeV (Run 2), 5.36 TeV (Run 3).',
    source: 'CERN / ALICE public pages',
  },
  SQRT_SNN_LHC_REF_GEV: {
    value: 5020,
    unit: 'GeV',
    note: 'Reference LHC Pb–Pb energy used for the Lorentz factor in the text.',
    source: 'CERN / ALICE public pages',
  },
  SQRT_SNN_RHIC_MAX_GEV: {
    value: 200,
    unit: 'GeV',
    note: 'Top RHIC energy for Au–Au.',
    source: BZDAK,
  },
  SQRT_SNN_RHIC_BES_GEV: {
    value: [3, 200],
    unit: 'GeV',
    note: 'RHIC beam energy scan: collider mode 7.7–200 GeV, fixed-target mode from 3.0 GeV.',
    source: BZDAK,
  },
  SQRT_SNN_SPS_GEV: {
    value: [6.3, 17.3],
    unit: 'GeV',
    note: 'CERN SPS fixed-target heavy-ion programme (NA61/SHINE, earlier NA49).',
    source: BZDAK,
  },
  SQRT_SNN_FAIR_GEV: {
    value: [2.7, 4.9],
    unit: 'GeV',
    note: 'Approximate range for Au+Au at SIS100 (CBM). HADES at SIS18 reaches about 2.4 GeV.',
    source: 'CBM Collaboration, Eur. Phys. J. A 53 (2017) 60',
  },
  SQRT_SNN_NICA_GEV: {
    value: [4, 11],
    unit: 'GeV',
    note: 'Approximate design range of NICA for heavy ions.',
    source: 'JINR NICA project pages',
  },
  M_NUCLEON_GEV: { value: 0.938, unit: 'GeV/c^2', note: 'Nucleon mass.', source: PDG },
  GAMMA_LHC: {
    value: 2700,
    unit: '',
    note: 'γ = √s_NN / (2 m_N) for √s_NN = 5.02 TeV. Contracted lead thickness 14 fm / 2700 ≈ 0.005 fm.',
    source: 'Special relativity; derived from the energies above',
  },
  GAMMA_RHIC: {
    value: 100,
    unit: '',
    note: 'γ = √s_NN / (2 m_N) for √s_NN = 200 GeV (≈107).',
    source: 'Derived',
  },
  LORENTZ_THICKNESS_LHC_FM: {
    value: 0.005,
    unit: 'fm',
    note: 'Lead nucleus thickness along the beam in the collider frame at the LHC.',
    source: 'Derived: D_PB_FM / GAMMA_LHC',
  },

  /** Baryon chemical potential at chemical freeze-out */
  MU_B_LHC_MEV: { value: 1, unit: 'MeV', note: 'Essentially zero (a few MeV at most).', source: BZDAK },
  MU_B_RHIC_200_MEV: { value: 25, unit: 'MeV', note: 'Au–Au at 200 GeV.', source: BZDAK },
  MU_B_RHIC_7_7_MEV: { value: 420, unit: 'MeV', note: 'Au–Au at 7.7 GeV.', source: BZDAK },
  MU_B_FIXED_TARGET_MAX_MEV: {
    value: 720,
    unit: 'MeV',
    note: 'Au–Au at the lowest energy of the RHIC fixed-target programme (3 GeV), order of magnitude.',
    source: 'STAR Collaboration fixed-target results; ' + BZDAK,
  },
  N0_FM3: {
    value: 0.16,
    unit: 'fm^-3',
    note: 'Nucleon density of ordinary nuclear matter (saturation density).',
    source: 'Nuclear physics textbook',
  },

  /** Event content and rates */
  NCH_CENTRAL_HIGH_E: {
    value: 1e4,
    unit: 'tracks',
    note: 'Charged particles in a central LHC Pb–Pb event, order of magnitude (several thousand to ~1e4).',
    source: 'ALICE, Eur. Phys. J. C 84 (2024) 813',
  },
  NCH_CENTRAL_LOW_E: {
    value: 300,
    unit: 'tracks',
    note: 'Charged particles in a central Au+Au collision at a few GeV, order of magnitude (hundreds).',
    source: 'CBM Collaboration, Eur. Phys. J. A 53 (2017) 60',
  },
  CBM_RATE_HZ: {
    value: 1e7,
    unit: 'Hz',
    note: 'Maximum CBM interaction rate (up to 10 MHz), read out without a hardware trigger.',
    source: 'CBM Collaboration, Eur. Phys. J. A 53 (2017) 60',
  },
  B_FIELD_BARREL_T: {
    value: 0.5,
    unit: 'T',
    note: 'Typical solenoid field in the barrel experiments used in the schematic.',
    source: 'ALICE and STAR public pages',
  },

  /** Plasma properties */
  ETA_OVER_S_BOUND: {
    value: 1 / (4 * Math.PI),
    unit: 'ħ/k_B',
    note: 'Conjectured lower bound 1/(4π) ≈ 0.08 from a holographic (strongly coupled) calculation; the plasma is within a small factor of it.',
    source: 'Kovtun, Son & Starinets, PRL 94 (2005) 111601; ' + BUSZA,
  },
  STRING_TENSION_GEV_FM: {
    value: 1,
    unit: 'GeV/fm',
    note: 'QCD string tension κ ≈ (0.44 GeV)^2 ≈ 0.19 GeV^2 ≈ 1 GeV/fm.',
    source: 'Thomson, Modern Particle Physics, QCD chapter; lattice QCD',
  },
} as const satisfies Record<string, HiConst>;

export type HiKey = keyof typeof HI;

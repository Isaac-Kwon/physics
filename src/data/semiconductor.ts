/**
 * Representative numbers for the Semiconductor Detectors page (PLAN §4.5, §6.3).
 * Order-of-magnitude values only — not measurements. Shared by all languages and by scenes/widgets.
 * `value` is a number, or [low, high] for a range.
 */
export interface ScConst {
  value: number | readonly [number, number];
  unit: string;
  note: string;
  /** Textbook / review the order of magnitude can be checked against. */
  source: string;
}

const SPIELER = 'Spieler, Semiconductor Detector Systems (2005)';
const LUTZ = 'Lutz, Semiconductor Radiation Detectors (1999)';
const PDG = 'Particle Data Group, Review of Particle Physics (passage of particles through matter)';
const KNOLL = 'Knoll, Radiation Detection and Measurement (4th ed.)';
const ITS3 = 'ALICE ITS3 TDR, CERN-LHCC-2024-003 (concept values, as of 2025)';

export const SC = {
  /** Silicon material constants */
  EG_SI_EV: { value: 1.12, unit: 'eV', note: 'Silicon band gap at 300 K.', source: LUTZ },
  EG_GE_EV: { value: 0.67, unit: 'eV', note: 'Germanium band gap at 300 K; detectors are cooled to ~77 K.', source: KNOLL },
  EG_DIAMOND_EV: { value: 5.5, unit: 'eV', note: 'Diamond band gap.', source: SPIELER },
  W_PAIR_SI_EV: {
    value: 3.6,
    unit: 'eV',
    note: 'Mean energy to create one electron–hole pair in silicon (about 3 E_g).',
    source: PDG,
  },
  W_PAIR_GE_EV: { value: 2.96, unit: 'eV', note: 'Pair-creation energy in germanium (at 77 K).', source: KNOLL },
  W_PAIR_GAS_EV: { value: 30, unit: 'eV', note: 'Typical energy per ion pair in a gas detector.', source: PDG },
  FANO_SI: { value: 0.1, unit: '', note: 'Fano factor of silicon and germanium (order of magnitude).', source: KNOLL },
  EPS_R_SI: { value: 11.9, unit: '', note: 'Relative permittivity of silicon.', source: SPIELER },
  NI_SI_CM3: { value: 1e10, unit: 'cm^-3', note: 'Intrinsic carrier density of silicon at 300 K (order of magnitude).', source: LUTZ },
  V_BI_V: { value: 0.6, unit: 'V', note: 'Built-in voltage of a typical detector junction.', source: SPIELER },
  MU_E_CM2_VS: { value: 1400, unit: 'cm^2/(V s)', note: 'Low-field electron mobility in silicon.', source: SPIELER },
  MU_H_CM2_VS: { value: 450, unit: 'cm^2/(V s)', note: 'Low-field hole mobility in silicon.', source: SPIELER },
  V_SAT_CM_S: { value: 1e7, unit: 'cm/s', note: 'Saturation drift velocity (= 100 µm/ns).', source: SPIELER },
  X0_SI_CM: { value: 9.37, unit: 'cm', note: 'Radiation length of silicon.', source: PDG },

  /** MIP signal */
  DEDX_MIP_SI_MEV_CM: { value: 3.9, unit: 'MeV/cm', note: 'Mean minimum-ionizing energy loss in silicon.', source: PDG },
  PAIRS_PER_UM_MPV: {
    value: 80,
    unit: 'µm^-1',
    note: 'Most probable pairs per micrometre for a MIP (mean ~108 µm^-1; the Landau tail raises the mean).',
    source: PDG,
  },
  PAIRS_PER_UM_MEAN: { value: 108, unit: 'µm^-1', note: 'Mean pairs per micrometre = 0.39 keV/µm / 3.6 eV.', source: PDG },
  SENSOR_THICKNESS_UM: { value: 300, unit: 'µm', note: 'Typical hybrid-pixel / strip sensor thickness.', source: SPIELER },
  MIP_CHARGE_300UM_E: { value: 2.4e4, unit: 'e', note: '80 µm^-1 × 300 µm.', source: 'Derived' },
  FE55_PAIRS: { value: 1640, unit: 'e', note: '5.9 keV X-ray / 3.6 eV.', source: 'Derived' },

  /** Depletion (reference numbers for the BiasDepletion widget) */
  NEFF_REF_CM3: { value: 1e12, unit: 'cm^-3', note: 'Reference effective doping of high-resistivity bulk (~4 kΩ cm).', source: SPIELER },
  VFD_REF_V: { value: 70, unit: 'V', note: 'Full depletion voltage for N_eff = 1e12 cm^-3, d = 300 µm.', source: 'Derived: q N d^2 / 2ε' },

  /** Timing and position */
  COLLECTION_TIME_E_NS: { value: [2, 8], unit: 'ns', note: 'Electron collection time across ~300 µm at working fields.', source: SPIELER },
  COLLECTION_TIME_H_NS: { value: [8, 25], unit: 'ns', note: 'Hole collection time across ~300 µm.', source: SPIELER },
  DIFFUSION_SIGMA_UM: { value: 8, unit: 'µm', note: 'Electron cloud width after 10 ns, sqrt(2Dt) with D = 36 cm²/s.', source: 'Derived' },
  PIXEL_PITCH_UM: { value: [25, 100], unit: 'µm', note: 'Typical pixel pitch range for tracking.', source: 'ALICE ITS2 ≈ 27×29 µm; ATLAS 50×250 µm (older), 50×50 µm (newer)' },
  BINARY_RES_FACTOR: { value: 1 / Math.sqrt(12), unit: '', note: 'σ = pitch/√12 for binary readout.', source: SPIELER },

  /** Detector examples */
  ITS2_PIXELS: { value: 1.25e10, unit: 'pixels', note: 'ALICE ITS2, 7 layers, order 1e10 pixels.', source: 'ALICE ITS2 TDR (2014) and public pages' },
  ITS2_AREA_M2: { value: 10, unit: 'm^2', note: 'Silicon area of ITS2.', source: 'ALICE ITS2 TDR (2014)' },
  ITS2_R_INNER_MM: { value: 22, unit: 'mm', note: 'Radius of the innermost ITS2 layer.', source: 'ALICE ITS2 TDR (2014)' },
  ITS2_X0_INNER_PCT: { value: 0.35, unit: '% X0', note: 'Material per inner layer in ITS2.', source: 'ALICE ITS2 TDR (2014)' },
  ITS3_R_INNER_MM: { value: 19, unit: 'mm', note: 'Radius of the innermost ITS3 layer (design).', source: ITS3 },
  ITS3_X0_PCT: { value: 0.07, unit: '% X0', note: 'Material per ITS3 layer (design target).', source: ITS3 },
  ITS3_SENSOR_THICKNESS_UM: { value: 50, unit: 'µm', note: 'Thinned sensor thickness, "tens of micrometres".', source: ITS3 },
  ITS3_SENSOR_LENGTH_CM: { value: 26, unit: 'cm', note: 'Stitched wafer-scale sensor length (order).', source: ITS3 },
  ITS3_CMOS_NM: { value: 65, unit: 'nm', note: 'CMOS technology node of ITS3 sensors (ITS2 used 180 nm).', source: ITS3 },
  ITS3_D0_IMPROVEMENT: { value: 2, unit: '×', note: 'Approximate impact-parameter resolution improvement over ITS2.', source: ITS3 },
  LGAD_GAIN: { value: [10, 30], unit: '', note: 'Typical LGAD internal gain.', source: 'Sadrozinski et al., Rep. Prog. Phys. 81 (2018) 026101' },
  LGAD_TIME_PS: { value: [30, 50], unit: 'ps', note: 'Time resolution targeted by HGTD / ETL.', source: 'ATLAS HGTD TDR (2020), CMS ETL TDR (2020)' },
  LGAD_THICKNESS_UM: { value: 50, unit: 'µm', note: 'Typical LGAD active thickness.', source: 'Sadrozinski et al. (2018)' },
  HPGE_RES_FWHM_KEV: { value: 2, unit: 'keV', note: 'FWHM at 1.33 MeV for a good HPGe detector (~0.15 %).', source: KNOLL },
  SIPM_GAIN: { value: 1e6, unit: '', note: 'Typical gain of one SiPM cell.', source: 'Manufacturer data sheets; Knoll' },

  /** Radiation damage */
  ALPHA_LEAKAGE_A_CM: { value: 4e-17, unit: 'A/cm', note: 'Current-related damage rate after annealing, 20 °C.', source: SPIELER },
  BETA_TRAPPING_CM2_NS: { value: 5e-16, unit: 'cm^2/ns', note: 'Effective trapping coefficient (order of magnitude).', source: 'Kramberger et al., NIM A 476 (2002) 645' },
  FLUENCE_HL_LHC_INNER_CM2: { value: 1e16, unit: '1 MeV n_eq/cm^2', note: 'Innermost HL-LHC pixel layers over the lifetime (order).', source: 'ATLAS / CMS ITk, Phase-2 TDRs' },
  FLUENCE_ITS3_CM2: { value: 1e13, unit: '1 MeV n_eq/cm^2', note: 'Order of the ITS3 non-ionizing dose.', source: ITS3 },
  LEAKAGE_HALVING_K: { value: 7, unit: 'K', note: 'Cooling that halves the leakage current (order).', source: SPIELER },

  /** Test beam */
  SR90_ENDPOINT_MEV: { value: 2.28, unit: 'MeV', note: '90Y daughter endpoint; electrons behave nearly as MIPs.', source: KNOLL },
  CBM_RATE_HZ: { value: 1e7, unit: 'Hz', note: 'CBM maximum interaction rate (same as HI.CBM_RATE_HZ).', source: 'CBM Collaboration, Eur. Phys. J. A 53 (2017) 60' },
} as const satisfies Record<string, ScConst>;

export type ScKey = keyof typeof SC;

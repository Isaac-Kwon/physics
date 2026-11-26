/**
 * Representative numbers for the Dark Matter page (PLAN §4.5, §6.3).
 * Order-of-magnitude values only — not measurements. Shared by all three languages and by scenes/widgets.
 * `value` is a number, or [low, high] for a range.
 */
export interface DmConst {
  value: number | readonly [number, number];
  unit: string;
  note: string;
  /** Textbook / review the order of magnitude can be checked against. */
  source: string;
}

const PLANCK = 'Planck Collaboration, Astron. Astrophys. 641 (2020) A6';
const PDG = 'Particle Data Group, Review of Particle Physics (Dark Matter; Astrophysical constants)';
const BERTONE = 'Bertone & Hooper, Rev. Mod. Phys. 90 (2018) 045002';

export const DM = {
  /** Cosmic composition (fractions of the total energy density) */
  OMEGA_BARYON: { value: 0.05, unit: '', note: 'Ordinary matter, ~5 % of the energy budget.', source: PLANCK },
  OMEGA_DM: { value: 0.27, unit: '', note: 'Dark matter, ~27 %.', source: PLANCK },
  OMEGA_LAMBDA: { value: 0.68, unit: '', note: 'Dark energy, ~68 %.', source: PLANCK },
  DM_FRACTION_OF_MATTER: { value: 0.85, unit: '', note: '0.27 / (0.27 + 0.05), about 0.85; the hook number.', source: PLANCK },

  /** Halo and local environment */
  RHO_LOCAL_GEV_CM3: { value: 0.3, unit: 'GeV/cm^3', note: 'Local dark-matter density (0.3 to 0.4 depending on the analysis).', source: PDG },
  V_SUN_KM_S: { value: 230, unit: 'km/s', note: 'Speed of the Sun around the galaxy (200 to 250 depending on the study).', source: PDG },
  V_REF_KM_S: { value: 220, unit: 'km/s', note: 'Standard reference speed used in the recoil estimate (Deeper).', source: PDG },
  V_REF_C: { value: 7.3e-4, unit: 'c', note: '220 km/s in units of c.', source: 'Unit conversion' },
  WIMP_FLUX_PER_CM2_S: { value: 7e4, unit: 'cm^-2 s^-1', note: 'n v for a 100 GeV particle: (0.3/100 cm^-3) x 2.3e7 cm/s.', source: 'Derived from the entries above' },
  GALAXY_RADIUS_KPC: { value: 15, unit: 'kpc', note: 'Visible disc radius of a Milky-Way-like galaxy; the halo extends several times further.', source: 'Astrophysics textbook (Ryden)' },
  V_FLAT_KM_S: { value: 220, unit: 'km/s', note: 'Typical flat rotation speed of a large spiral galaxy (100 to 300).', source: 'Rubin, Ford & Thonnard, ApJ 238, 471 (1980)' },

  /** Candidates (mass scale) */
  M_FUZZY_EV: { value: 1e-22, unit: 'eV', note: 'Lower end of the mass axis (fuzzy dark matter).', source: BERTONE },
  M_AXION_EV: { value: [1e-6, 1e-3], unit: 'eV', note: 'Mass range targeted by axion haloscopes (order of magnitude).', source: PDG },
  M_WIMP_GEV: { value: [1, 1e4], unit: 'GeV', note: 'Classic WIMP window, 1 GeV to 10 TeV.', source: PDG },
  M_STERILE_KEV: { value: [1, 50], unit: 'keV', note: 'Sterile-neutrino dark-matter scale.', source: PDG },
  M_PBH_G: { value: [1e17, 1e22], unit: 'g', note: 'Asteroid-mass window for primordial black holes that is not excluded (order of magnitude).', source: PDG },
  MASS_AXIS_DECADES: { value: 90, unit: 'decades', note: 'Roughly 90 powers of ten from fuzzy dark matter to solar-mass black holes.', source: BERTONE },
  SIGMAV_THERMAL_CM3_S: { value: 3e-26, unit: 'cm^3/s', note: 'Annihilation rate that gives the observed relic density ("WIMP miracle").', source: PDG },

  /** Direct detection */
  M_XENON_NUCLEUS_GEV: { value: 122, unit: 'GeV', note: 'Mass of a xenon-131 nucleus (131 x 0.931 GeV).', source: 'Atomic mass tables' },
  M_WIMP_REF_GEV: { value: 100, unit: 'GeV', note: 'Reference WIMP mass for the recoil estimate.', source: 'Convention' },
  E_RECOIL_TYPICAL_KEV: { value: 10, unit: 'keV', note: 'Typical nuclear-recoil energy for a 100 GeV WIMP on xenon; the maximum is about 25 keV.', source: 'Derived: E_R = mu^2 v^2 (1 - cos theta) / m_N' },
  E_RECOIL_MAX_KEV: { value: 25, unit: 'keV', note: 'Head-on maximum for the same case.', source: 'Derived' },
  XENON_DETECTOR_MASS_T: { value: [3, 10], unit: 't', note: 'Active liquid-xenon mass of current experiments (XENONnT, LZ, PandaX-4T); next generation 60 to 100 t.', source: 'Experiment public pages' },
  S1_PHOTONS_DETECTED: { value: 20, unit: 'photons', note: 'Order of the detected S1 photons for a few-keV nuclear recoil (tens, not thousands).', source: 'Aprile et al., Rev. Mod. Phys. 82 (2010) 2053 (qualitative)' },
  DRIFT_TIME_MAX_MS: { value: 1, unit: 'ms', note: 'Longest electron drift time in a metre-scale xenon TPC.', source: 'Same, order of magnitude' },
  DRIFT_FIELD_V_CM: { value: 200, unit: 'V/cm', note: 'Order of the drift field.', source: 'Same' },
  XENON_UV_NM: { value: 175, unit: 'nm', note: 'Scintillation wavelength of liquid xenon (vacuum ultraviolet).', source: 'Same' },
  POSITION_RESOLUTION_CM: { value: 1, unit: 'cm', note: 'Order of the 3D position resolution.', source: 'Same' },

  /** Underground labs and backgrounds */
  MUON_FLUX_SURFACE_CM2_MIN: { value: 1, unit: 'cm^-2 min^-1', note: 'Cosmic-ray muons at sea level, about 1 per cm^2 per minute.', source: PDG },
  LAB_DEPTH_KM_ROCK: { value: [1, 2], unit: 'km', note: 'Typical rock overburden of dark-matter laboratories.', source: 'Laboratory public pages' },
  MUON_REDUCTION_FACTOR: { value: 1e6, unit: '', note: 'Reduction at 1 to 2 km of rock (more with depth).', source: PDG },
  LNGS_ROCK_KM: { value: 1.4, unit: 'km', note: 'Gran Sasso overburden (about 3400 m.w.e.).', source: 'LNGS public pages' },
  YEMILAB_ROCK_KM: { value: 1.0, unit: 'km', note: 'Yemilab overburden (Jeongseon, Korea; opened 2022). Check the m.w.e. value before quoting.', source: 'IBS public pages' },

  /** Axion haloscope */
  AXION_FREQ_MHZ_PER_UEV: { value: 242, unit: 'MHz per ueV', note: 'f = m c^2 / h: 1 ueV corresponds to about 242 MHz.', source: 'Unit conversion' },
  AXION_SIGNAL_POWER_W: { value: 1e-23, unit: 'W', note: 'Order of the expected cavity signal power for benchmark couplings.', source: 'Haloscope reviews, order of magnitude' },
} as const satisfies Record<string, DmConst>;

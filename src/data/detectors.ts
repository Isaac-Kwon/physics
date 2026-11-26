/**
 * Representative numbers for the Detectors page (PLAN §4.5, §6.3).
 * Order-of-magnitude values only, not measurements. Shared by all three languages and by scenes/widgets.
 * `value` is a number, or [low, high] for a range.
 */
export interface DetConst {
  value: number | readonly [number, number];
  unit: string;
  note: string;
  /** Textbook / review the order of magnitude can be checked against. */
  source: string;
}

const PDG = 'Particle Data Group, Review of Particle Physics: "Passage of particles through matter" and the atomic and nuclear properties tables';
const GS = 'Grupen & Shwartz, Particle Detectors (2nd ed., 2008)';
const KW = 'Kolanoski & Wermes, Particle Detectors: Fundamentals and Applications (2020)';
const LHC = 'ATLAS and CMS detector and trigger papers (JINST 3 S08003, S08004; Run 3 trigger papers)';

export const DET = {
  /** Energy loss and ionization */
  MIP_DEDX_MEV_CM2_G: {
    value: [1.5, 2],
    unit: 'MeV cm²/g',
    note: 'Minimum-ionizing energy loss, nearly material independent (about 1.6 for silicon, 2 for water, 1.1 to 1.4 for heavy metals).',
    source: PDG,
  },
  BETA_GAMMA_MIN: {
    value: 3.5,
    unit: '',
    note: 'Position of the Bethe–Bloch minimum in beta times gamma (momentum over mass), typical materials. Used as the MIP point in the widget.',
    source: PDG,
  },
  W_SILICON_EV: { value: 3.6, unit: 'eV per pair', note: 'Mean energy to create one electron–hole pair in silicon.', source: KW },
  PAIRS_PER_UM_SILICON: {
    value: 80,
    unit: 'pairs/µm',
    note: 'Order of magnitude for a MIP in silicon (most probable value; the mean is higher because of the Landau tail). Same number as the silicon-sensor primer.',
    source: PDG,
  },
  W_ARGON_EV: { value: 26, unit: 'eV per pair', note: 'Mean energy per electron–ion pair in argon gas.', source: GS },
  PAIRS_PER_CM_GAS: {
    value: 100,
    unit: 'pairs/cm',
    note: 'Total electron–ion pairs per centimetre for a MIP in argon at atmospheric pressure, order of magnitude.',
    source: GS,
  },

  /** Electromagnetic interactions */
  PAIR_THRESHOLD_MEV: {
    value: 1.022,
    unit: 'MeV',
    note: 'Twice the electron mass: threshold for photon pair production in the field of a nucleus.',
    source: PDG,
  },
  X0_LEAD_CM: { value: 0.56, unit: 'cm', note: 'Radiation length of lead (the storyboard rounds this to about 0.5 cm).', source: PDG },
  X0_PBWO4_CM: { value: 0.89, unit: 'cm', note: 'Radiation length of lead tungstate scintillating crystal.', source: PDG },
  X0_IRON_CM: { value: 1.76, unit: 'cm', note: 'Radiation length of iron.', source: PDG },
  X0_SILICON_CM: { value: 9.4, unit: 'cm', note: 'Radiation length of silicon (about 10 cm).', source: PDG },
  X0_WATER_CM: { value: 36, unit: 'cm', note: 'Radiation length of water.', source: PDG },
  E_CRIT_LEAD_MEV: {
    value: 7.4,
    unit: 'MeV',
    note: 'Critical energy of lead: below it, ionization loss beats radiation loss for electrons. Roughly 600 MeV divided by Z.',
    source: PDG,
  },
  LAMBDA_I_IRON_CM: { value: 17, unit: 'cm', note: 'Nuclear interaction length of iron, about ten times its radiation length.', source: PDG },
  LAMBDA_I_LEAD_CM: { value: 18, unit: 'cm', note: 'Nuclear interaction length of lead.', source: PDG },
  MOLIERE_RADIUS_PBWO4_CM: {
    value: 2.0,
    unit: 'cm',
    note: 'Moliere radius: about 90% of an EM shower lies inside this transverse radius.',
    source: PDG,
  },
  MUON_BREMS_SUPPRESSION: {
    value: 4e4,
    unit: '',
    note: 'Bremsstrahlung scales as the inverse square of the mass: (m_mu / m_e)^2 is about 40,000, so muons radiate far less than electrons.',
    source: PDG,
  },

  /** Light */
  WATER_INDEX: { value: 1.33, unit: '', note: 'Refractive index of water.', source: PDG },
  CHERENKOV_ANGLE_WATER_DEG: { value: 41, unit: 'deg', note: 'Cherenkov angle for beta = 1 in water: arccos(1/1.33).', source: PDG },
  CHERENKOV_THRESHOLD_WATER: { value: 0.75, unit: 'beta', note: 'Speed threshold in water: 1/n.', source: PDG },
  CHERENKOV_PHOTONS_PER_CM_WATER: {
    value: [200, 400],
    unit: 'photons/cm',
    note: 'Visible-range photons from a beta = 1 singly charged particle in water. Order of magnitude.',
    source: PDG,
  },
  SCINT_PHOTONS_PER_MEV: {
    value: [1e4, 5e4],
    unit: 'photons/MeV',
    note: 'Plastic scintillator near the low end (about 10,000), NaI(Tl) and liquid noble gases near the high end.',
    source: GS,
  },
  PMT_GAIN: { value: 1e6, unit: '', note: 'Typical photomultiplier gain.', source: GS },

  /** Measurement */
  CURVATURE_CONSTANT: {
    value: 0.3,
    unit: 'GeV/c per (T m)',
    note: 'p [GeV/c] = 0.3 B [T] R [m] for a singly charged particle, momentum transverse to the field. Exact constant 0.299792458.',
    source: PDG,
  },
  B_SOLENOID_T: { value: [2, 4], unit: 'T', note: 'Solenoid fields of the large LHC general-purpose detectors.', source: LHC },
  ECAL_STOCHASTIC: { value: [0.02, 0.03], unit: 'fraction x sqrt(GeV)', note: 'Stochastic term a of a crystal EM calorimeter (2 to 3 %).', source: KW },
  SAMPLING_ECAL_STOCHASTIC: { value: 0.1, unit: 'fraction x sqrt(GeV)', note: 'Stochastic term a of a sampling EM calorimeter (about 10 %).', source: KW },
  HCAL_STOCHASTIC: { value: 0.5, unit: 'fraction x sqrt(GeV)', note: 'Stochastic term a of a hadron calorimeter (about 50 %).', source: KW },
  TOF_RESOLUTION_PS: { value: [30, 100], unit: 'ps', note: 'Time-of-flight and timing-layer resolution: tens of picoseconds.', source: KW },
  LIGHT_CM_PER_NS: { value: 30, unit: 'cm/ns', note: 'Light travels 30 cm in a nanosecond, 3 mm in 10 ps (for the clock analogy).', source: PDG },
  DRIFT_VELOCITY_GAS_CM_US: { value: 5, unit: 'cm/µs', note: 'Electron drift speed in typical drift-chamber gases: a few cm per microsecond.', source: GS },
  DRIFT_VELOCITY_MDT_CM_US: { value: 2, unit: 'cm/µs', note: 'ATLAS-type MDT tubes (Ar/CO2, 3 bar): ~700 ns maximum drift over 14.6 mm.', source: 'ATLAS Muon Spectrometer TDR (1997)' },
  SPATIAL_RES_SILICON_UM: { value: [5, 15], unit: 'µm', note: 'Position resolution of silicon pixel and strip detectors.', source: KW },
  SPATIAL_RES_DRIFT_TUBE_UM: { value: 100, unit: 'µm', note: 'Single-tube resolution of drift tubes, order of 100 µm.', source: GS },

  /** Rates and design */
  LHC_BUNCH_CROSSING_HZ: { value: 4e7, unit: 'Hz', note: 'Bunch crossings at the LHC: 40 MHz.', source: 'LHC design report, CERN-2004-003' },
  L1_ACCEPT_HZ: { value: 1e5, unit: 'Hz', note: 'First-level trigger output of the large LHC general-purpose experiments in Run 3, order 100 kHz.', source: LHC },
  STORED_EVENTS_HZ: { value: [1e3, 3e3], unit: 'Hz', note: 'Events written to permanent storage after the full selection, order kHz.', source: LHC },
  READOUT_CHANNELS_LHC: {
    value: 1e8,
    unit: 'channels',
    note: 'Order of magnitude of readout channels in a large LHC general-purpose detector, dominated by pixels and strips.',
    source: LHC,
  },
  DETECTOR_SIZE_M: { value: [15, 45], unit: 'm', note: 'Linear size of the large general-purpose detectors (CMS about 21 m long, ATLAS 44 m long).', source: LHC },
  GEANT4_FIRST_RELEASE: { value: 1998, unit: 'year', note: 'First public Geant4 release.', source: 'Agostinelli et al., NIM A 506 (2003) 250' },
} as const satisfies Record<string, DetConst>;

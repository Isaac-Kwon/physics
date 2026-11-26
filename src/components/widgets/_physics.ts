/** Shared textbook physics for the P5 widgets. Everything here is schematic / geometric; see each formula's comment. */
export const M_N = 0.938; // GeV, nucleon mass
export const D_PB_FM = 14; // fm, Pb diameter (2R, R ≈ 7 fm)
export const R_PB_FM = 7;
export const SQRTS_MIN = 2.4; // GeV, SIS18/SIS100 region
export const SQRTS_MAX = 5360; // GeV, LHC

/** Log slider: t in [0,1] <-> sqrt(s_NN) = exp(ln a + t (ln b - ln a)). */
export const sqrtsFromT = (t: number, a = SQRTS_MIN, b = SQRTS_MAX) => Math.exp(Math.log(a) + t * (Math.log(b) - Math.log(a)));
export const tFromSqrts = (s: number, a = SQRTS_MIN, b = SQRTS_MAX) => (Math.log(s) - Math.log(a)) / (Math.log(b) - Math.log(a));

/** Lorentz factor of each nucleus in the collider (= CM) frame: gamma = sqrt(s_NN) / (2 m_N). */
export const gammaOf = (sqrtS: number) => sqrtS / (2 * M_N);
/** Contracted thickness of a Pb nucleus: L = D / gamma, D = 14 fm. */
export const thicknessFm = (sqrtS: number) => D_PB_FM / gammaOf(sqrtS);
/** Schematic stopping fraction, smooth transition around ~10-20 GeV: f = 1 / (1 + (sqrt(s)/15 GeV)^2). Qualitative only. */
export const stopFraction = (sqrtS: number) => 1 / (1 + (sqrtS / 15) ** 2);

/** Overlap area of two discs of radius R at separation b: A = 2R^2 acos(b/2R) - (b/2) sqrt(4R^2 - b^2). */
export function lensArea(b: number, R = R_PB_FM) {
  if (b >= 2 * R) return 0;
  return 2 * R * R * Math.acos(b / (2 * R)) - (b / 2) * Math.sqrt(4 * R * R - b * b);
}
/** Eccentricity of the uniform-density overlap region by grid sampling: eps = (<y^2> - <x^2>) / (<y^2> + <x^2>); x along b. */
export function lensEpsilon(b: number, R = R_PB_FM, h = 0.1) {
  if (b >= 2 * R - 0.05) return 1;
  let sx = 0;
  let sy = 0;
  let n = 0;
  const half = b / 2;
  const xr = R - half;
  for (let x = -xr + h / 2; x < xr; x += h) {
    for (let y = -R + h / 2; y < R; y += h) {
      if ((x + half) ** 2 + y * y <= R * R && (x - half) ** 2 + y * y <= R * R) {
        sx += x * x;
        sy += y * y;
        n++;
      }
    }
  }
  return n === 0 ? 1 : (sy - sx) / (sy + sx);
}
/** Closed outline of the lens (px = k * fm), centred at the origin, as an SVG path. */
export function lensPath(b: number, R: number, k: number) {
  if (b >= 2 * R) return '';
  const a = Math.acos(b / (2 * R));
  const pts: string[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const th = Math.PI - a + (2 * a * i) / N;
    pts.push(`${(k * (b / 2 + R * Math.cos(th))).toFixed(2)},${(k * R * Math.sin(th)).toFixed(2)}`);
  }
  for (let i = 0; i <= N; i++) {
    const th = -a + (2 * a * i) / N;
    pts.push(`${(k * (-b / 2 + R * Math.cos(th))).toFixed(2)},${(k * R * Math.sin(th)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Freeze-out fits (Cleymans, Oeschler, Redlich, Wheaton, PRC 73, 034905): mu_B = d/(1+e sqrt(s)), T = a - b mu^2 - c mu^4 (GeV). */
export const muB = (sqrtS: number) => 1.308 / (1 + 0.273 * sqrtS);
export const Tch = (mu: number) => 0.166 - 0.139 * mu ** 2 - 0.053 * mu ** 4;

/**
 * Simplified Bethe-Bloch, z = 1:
 *   f(beta gamma) = (1/beta^2) [ln(2 m_e c^2 beta^2 gamma^2 / I) - beta^2 - delta/2], I = 188 eV (argon-like),
 * scaled so a minimum-ionising particle (beta gamma = 3.5) equals 1.
 * Density effect, schematically: the beta^2 gamma^2 inside the log saturates smoothly at (beta gamma)_sat ~ 110, which
 * gives the Fermi plateau of a gas TPC at ~1.55 x MIP (instead of an unbounded relativistic rise).
 */
const ME_EV = 0.511e6;
const I_EV = 188;
const BG_SAT = 110;
const raw = (bg: number) => {
  const b2 = (bg * bg) / (1 + bg * bg);
  const bgEff2 = (bg * bg) / (1 + (bg / BG_SAT) ** 2);
  return (Math.log((2 * ME_EV * bgEff2) / I_EV) - b2) / b2;
};
const NORM = raw(3.5);
export const dEdx = (p: number, m: number) => Math.max(raw(p / m) / NORM, 1e-3);
export const betaOf = (p: number, m: number) => p / Math.hypot(p, m);
export const SPECIES = [
  { id: 'e', sym: 'e', m: 0.000511, dash: '' },
  { id: 'pi', sym: 'π', m: 0.13957, dash: '2 3' },
  { id: 'K', sym: 'K', m: 0.49368, dash: '7 3' },
  { id: 'p', sym: 'p', m: 0.93827, dash: '' },
  { id: 'd', sym: 'd', m: 1.87561, dash: '10 3 2 3' },
] as const;

/** Small seeded PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

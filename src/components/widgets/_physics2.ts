/** Textbook physics for the semiconductor-detector and detector widgets (wave 2). Schematic where stated. */
import { rng } from './_physics';

/** Error function, Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7). */
export function erf(x: number) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

/** Standard normal deviates from a uniform generator (Box-Muller, one value per call). */
export function gauss(r: () => number) {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** Moyal density, an analytic stand-in for the Landau shape: f(l) = exp(-(l + e^-l)/2)/sqrt(2 pi), l = (x - mpv)/xi. Mode at l = 0, mean at l = gamma_E + ln 2. */
export const moyal = (l: number) => Math.exp(-(l + Math.exp(-l)) / 2) / Math.sqrt(2 * Math.PI);
export const MOYAL_MEAN = 0.5772157 + Math.LN2;

/** Moyal CDF by trapezoid integration from l = -6. */
export function moyalCdf(l: number) {
  if (l <= -6) return 0;
  const n = 400;
  const h = (l + 6) / n;
  let s = 0.5 * (moyal(-6) + moyal(l));
  for (let i = 1; i < n; i++) s += moyal(-6 + i * h);
  return s * h;
}

/* ---- Depletion (abrupt one-sided junction, n-type bulk) ---- */
export const Q_E = 1.602e-19; // C
export const EPS0 = 8.854e-14; // F/cm
export const EPS_SI = 11.9;
export const MU_N = 1350; // cm2/Vs
export const V_BI = 0.6; // V
/** N_eff [cm^-3] = 1 / (q mu_n rho), rho in ohm cm. */
export const neffFromRho = (rhoOhmCm: number) => 1 / (Q_E * MU_N * rhoOhmCm);
/** W [cm] = sqrt(2 eps0 eps_r (V_bi + V) / (q N_eff)) capped at d. */
export const depletionWidthCm = (V: number, neff: number, dCm: number) => Math.min(dCm, Math.sqrt((2 * EPS0 * EPS_SI * (V_BI + Math.max(V, 0))) / (Q_E * neff)));
/** V_fd = q N_eff d^2 / (2 eps0 eps_r) - V_bi, clamped at 0. */
export const fullDepletionV = (neff: number, dCm: number) => Math.max((Q_E * neff * dCm * dCm) / (2 * EPS0 * EPS_SI) - V_BI, 0);

/* ---- Test-beam telescope: straight-line fit of N planes, optional multiple scattering ---- */
export interface TbParams { planes: number; sigPlane: number; sigDut: number; scatter: boolean; pBeam: number; }
export const X_PLANE_X0 = 50e-4 / 9.37; // 50 um of Si, X0 = 9.37 cm
/** Highland: theta0 = 13.6 MeV/(beta c p) sqrt(x/X0) (1 + 0.038 ln(x/X0)), beta = 1; p in GeV/c; rad. */
export const highland = (p: number, x = X_PLANE_X0) => (0.0136 / p) * Math.sqrt(x) * (1 + 0.038 * Math.log(x));
export const PLANE_SPACING_MM = 30;
/** z positions [mm] of telescope planes; DUT at z = 0 with half of the planes upstream. */
export function planeZ(n: number) {
  const up = Math.ceil(n / 2);
  const z: number[] = [];
  for (let i = 0; i < n; i++) z.push(i < up ? -PLANE_SPACING_MM * (up - i) : PLANE_SPACING_MM * (i - up + 1));
  return z;
}
export interface TbEvent { res: number; pred: number; hit: boolean; hits: number[]; truth: number[]; fitSlope: number; fitInt: number; }
/** Simulate events (seeded). Units: um transverse, mm longitudinal. Beam along z, true x(0)=0, slope 0 before the first plane. */
export function simulateTb(n: number, q: TbParams, seed = 12345): TbEvent[] {
  const r = rng(seed);
  const z = planeZ(q.planes);
  const th = q.scatter ? highland(q.pBeam) : 0;
  const all = [...z, 0].sort((a, b) => a - b); // planes + DUT, scattering material at each
  const out: TbEvent[] = [];
  for (let ev = 0; ev < n; ev++) {
    let x = 0, s = 0, zc = all[0]; // x [um], s = dx/dz [um/mm]
    const xAt = new Map<number, number>();
    for (const zi of all) {
      x += s * (zi - zc);
      zc = zi;
      xAt.set(zi, x);
      s += th * 1000 * gauss(r); // theta [rad] -> slope in um per mm
    }
    const hits = z.map((zi) => xAt.get(zi)! + q.sigPlane * gauss(r));
    // least-squares line x = a + b z through the planes (equal weights)
    const N = z.length, zb = z.reduce((a, b) => a + b, 0) / N, xb = hits.reduce((a, b) => a + b, 0) / N;
    let sxx = 0, sxy = 0;
    z.forEach((zi, i) => { sxx += (zi - zb) ** 2; sxy += (zi - zb) * (hits[i] - xb); });
    const b = sxy / sxx, a = xb - b * zb;
    const pred = a; // z = 0
    const truth = xAt.get(0)!;
    const dutHit = truth + q.sigDut * gauss(r);
    out.push({ res: dutHit - pred, pred: pred - truth, hit: r() < 0.99, hits, truth: z.map((zi) => xAt.get(zi)!), fitSlope: b, fitInt: a });
  }
  return out;
}
export const stdev = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
};
/** Iterative 3-sigma-clipped width (a simple stand-in for a Gaussian fit). */
export function fitWidth(v: number[]) {
  if (v.length < 3) return stdev(v);
  let s = stdev(v), m = v.reduce((a, b) => a + b, 0) / v.length;
  for (let i = 0; i < 3; i++) {
    const c = v.filter((x) => Math.abs(x - m) < 3 * s);
    if (c.length < 3) break;
    m = c.reduce((a, b) => a + b, 0) / c.length;
    s = stdev(c) * 1.014; // restore the ~1.4% lost by a 3-sigma cut
  }
  return s;
}

/* ---- Charge sharing ---- */
/** Fraction of a Gaussian cloud (centre x0, width sigma) inside [a, b]: 1/2 [erf((b-x0)/(sigma sqrt2)) - erf((a-x0)/(sigma sqrt2))]. */
export const cloudFraction = (a: number, b: number, x0: number, sigma: number) => 0.5 * (erf((b - x0) / (sigma * Math.SQRT2)) - erf((a - x0) / (sigma * Math.SQRT2)));
/** Pixel k spans [k p, (k+1) p]; five pixels k = -2..2. Returns charges (fractions, optional noise) and both position estimates. */
export function sharing(x0: number, p: number, sigma: number, noise = 0, r?: () => number) {
  const ks = [-2, -1, 0, 1, 2];
  const q = ks.map((k) => Math.max(cloudFraction(k * p, (k + 1) * p, x0, sigma) + (r && noise ? noise * gauss(r) : 0), 0));
  const tot = q.reduce((a, b) => a + b, 0);
  const centroid = ks.reduce((a, k, i) => a + q[i] * (k + 0.5) * p, 0) / tot;
  const imax = q.indexOf(Math.max(...q));
  return { ks, q, centroid, binary: (ks[imax] + 0.5) * p };
}

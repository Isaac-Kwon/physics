/**
 * Textbook physics for the neutrino and dark-matter widgets (wave 3). Schematic where stated.
 * The rotation-curve functions (RotCurve section) are THE shared model: the dm.rotation scene should import them from here.
 */
import { erf, gauss } from './_physics2';
export { rng } from './_physics';

/* ---------------------------------------------------------------- Oscillation */
/** Two-flavour appearance probability: P = sin^2(2 theta) sin^2(1.27 dm2 L / E), dm2 in eV^2, L in km, E in GeV. */
export const oscP = (sin22: number, dm2: number, LoverE: number) => sin22 * Math.sin(1.27 * dm2 * LoverE) ** 2;
export const OSC_PAIRS = {
  atm: { dm2: 2.5e-3, sin22: 1.0 }, // atmospheric / accelerator pair (round numbers)
  sol: { dm2: 7.5e-5, sin22: 0.85 }, // solar / reactor pair (round numbers)
} as const;
/** First maximum of the oscillation: 1.27 dm2 L/E = pi/2. */
export const firstMaxLoverE = (dm2: number) => Math.PI / (2 * 1.27 * dm2);

/* ---------------------------------------------------------------- Ring classifier */
export interface RingEvent {
  muon: boolean;
  stopping: boolean;
  r0: number;
  /** PMT hits: x, y in units of the wall radius, charge in photoelectrons */
  hits: { x: number; y: number; q: number }[];
  /** radial charge density profile (bins of dr) about the charge-weighted centre */
  profile: number[];
  dr: number;
  centre: [number, number];
  /** 80 -> 20 % outer-edge width of the radial profile, in units of the ring radius */
  edgeWidth: number;
  rEdge: number;
}
export const PMT_PITCH = 0.06; // wall radius = 1

type Sub = { cx: number; cy: number; r: number; a: number };
/** Expected charge density of a Cherenkov ring. Sharp: Gaussian band sigma_s. Stopping muon: same sharp rim plus a fainter filled disc inside (the cone shrinks as it slows). Electron: 5 offset, jittered sub-rings. */
function intensity(muon: boolean, stopping: boolean, r0: number, subs: Sub[]) {
  const sigS = 0.025;
  if (muon && stopping) return (x: number, y: number) => Math.exp(-((Math.hypot(x, y) - r0) ** 2) / (2 * sigS * sigS)) + (Math.hypot(x, y) < r0 ? 0.3 : 0);
  if (muon) return (x: number, y: number) => Math.exp(-((Math.hypot(x, y) - r0) ** 2) / (2 * sigS * sigS));
  return (x: number, y: number) => subs.reduce((s, c) => s + c.a * Math.exp(-((Math.hypot(x - c.cx, y - c.cy) - c.r) ** 2) / (2 * 0.03 * 0.03)), 0);
}

export function poisson(r: () => number, mu: number) {
  if (mu <= 0) return 0;
  if (mu > 30) return Math.max(0, Math.round(mu + Math.sqrt(mu) * gauss(r)));
  const L = Math.exp(-mu);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > L);
  return k - 1;
}

/** difficulty in [0,1]: lowers brightness and raises dark noise. */
export function simulateRing(r: () => number, wantMuon: boolean, difficulty: number): RingEvent {
  const stopping = wantMuon && r() < 0.3;
  const r0 = 0.36 + 0.3 * r();
  const subs: Sub[] = Array.from({ length: 5 }, () => ({ cx: 0.09 * gauss(r), cy: 0.09 * gauss(r), r: r0 * (1 + 0.14 * gauss(r)), a: 0.35 + 0.3 * r() }));
  const f = intensity(wantMuon, stopping, r0, subs);
  const mu = 7 * (1 - 0.55 * difficulty);
  const dark = 0.03 + 0.5 * difficulty;
  const hits: RingEvent['hits'] = [];
  const h = PMT_PITCH;
  for (let gy = -1; gy <= 1; gy += h) {
    for (let gx = -1; gx <= 1; gx += h) {
      if (gx * gx + gy * gy > 0.97) continue;
      const q = poisson(r, mu * f(gx, gy) + dark);
      if (q > 0) hits.push({ x: gx, y: gy, q });
    }
  }
  const m = edgeMetric(hits);
  return { muon: wantMuon, stopping, r0, hits, ...m };
}

/**
 * Edge-sharpness metric from the displayed hits alone. Radial charge density rho(r) (charge per annulus area) about the
 * charge-weighted centre, smoothed over 3 bins. Take its peak (r > 0.1); walking outward, r80 is where rho drops below 80 % of the
 * peak and r20 where it drops below 20 %. Metric = (r20 - r80) / r80: small for a sharp edge, large for a fuzzy one.
 */
export function edgeMetric(hits: { x: number; y: number; q: number }[]) {
  let sq = 0, sx = 0, sy = 0;
  for (const p of hits) { sq += p.q; sx += p.q * p.x; sy += p.q * p.y; }
  const cx = sq ? sx / sq : 0;
  const cy = sq ? sy / sq : 0;
  const dr = 0.02, nb = 60;
  const ch = new Array<number>(nb).fill(0);
  for (const p of hits) {
    const b = Math.floor(Math.hypot(p.x - cx, p.y - cy) / dr);
    if (b < nb) ch[b] += p.q;
  }
  const rho = ch.map((c, i) => c / (Math.PI * ((i + 1) ** 2 - i ** 2) * dr * dr));
  const profile = rho.map((_, i) => {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - 1); j <= Math.min(nb - 1, i + 1); j++) { s += rho[j]; n++; }
    return s / n;
  });
  let ip = 5;
  for (let i = 5; i < nb; i++) if (profile[i] > profile[ip]) ip = i;
  const peak = profile[ip];
  let i80 = ip;
  while (i80 < nb - 1 && profile[i80] > 0.8 * peak) i80++;
  let i20 = i80;
  while (i20 < nb - 1 && profile[i20] > 0.2 * peak) i20++;
  const rEdge = (i80 + 0.5) * dr;
  const width = Math.max((i20 - i80) * dr, dr);
  return { profile, dr, centre: [cx, cy] as [number, number], edgeWidth: width / Math.max(rEdge, 0.1), rEdge };
}
export const SHARP_CUT = 0.13; // metric guide: below = sharp (muon-like)

/* ---------------------------------------------------------------- IBD coincidence */
export interface IbdEvent { t: number; e: number; kind: 'single' | 'prompt' | 'delayed'; pair: number }
export const IBD = { tauUs: 200, singlesHz: 1000, pairsHz: 20, T: 4, eDelayed: 2.2, eSigma: 0.15, eDelWin: [1.9, 2.5] as const, ePromptWin: [1, 8] as const };

/** Singles (Poisson, exponential-ish energies, mean ~1.7 MeV) plus true prompt/delayed pairs (delay ~ Exp(tau), delayed energy 2.2 MeV). */
export function simulateIbd(r: () => number): IbdEvent[] {
  const ev: IbdEvent[] = [];
  const T = IBD.T;
  const ns = poisson(r, IBD.singlesHz * T);
  for (let i = 0; i < ns; i++) ev.push({ t: r() * T, e: Math.min(-1.5 * Math.log(1 - r()) + 0.2, 10), kind: 'single', pair: -1 });
  const np = poisson(r, IBD.pairsHz * T);
  for (let i = 0; i < np; i++) {
    const t0 = r() * T;
    const dt = -IBD.tauUs * 1e-6 * Math.log(1 - r());
    ev.push({ t: t0, e: 0.6 + 7.4 * Math.sqrt(r()) * 0.8 + 0.3 * r(), kind: 'prompt', pair: i });
    ev.push({ t: t0 + dt, e: IBD.eDelayed + IBD.eSigma * gauss(r), kind: 'delayed', pair: i });
  }
  ev.sort((a, b) => a.t - b.t);
  return ev;
}
export interface IbdCount { trueKept: number; trueTotal: number; acc: number; rp: number; rd: number; pairs: [number, number][] }
/** Count pairs (i prompt-like, j delayed-like, 0 < t_j - t_i <= dt). True pair = the two halves of one generated IBD pair. */
export function countIbd(ev: IbdEvent[], dt: number, cut: boolean): IbdCount {
  const pOk = (e: IbdEvent) => !cut || (e.e >= IBD.ePromptWin[0] && e.e <= IBD.ePromptWin[1]);
  const dOk = (e: IbdEvent) => !cut || (e.e >= IBD.eDelWin[0] && e.e <= IBD.eDelWin[1]);
  let trueKept = 0, acc = 0, trueTotal = 0, np = 0, nd = 0;
  const pairs: [number, number][] = [];
  for (const e of ev) {
    if (e.kind === 'prompt') trueTotal++;
    if (e.kind !== 'delayed' && pOk(e)) np++;
    if (e.kind !== 'prompt' && dOk(e)) nd++;
  }
  for (let i = 0; i < ev.length; i++) {
    if (!pOk(ev[i])) continue;
    for (let j = i + 1; j < ev.length && ev[j].t - ev[i].t <= dt; j++) {
      if (!dOk(ev[j])) continue;
      const isTrue = ev[i].kind === 'prompt' && ev[j].kind === 'delayed' && ev[i].pair === ev[j].pair;
      if (isTrue) trueKept++;
      else acc++;
      pairs.push([i, j]);
    }
  }
  return { trueKept, trueTotal, acc, rp: np / IBD.T, rd: nd / IBD.T, pairs };
}

/* ---------------------------------------------------------------- Double-beta spectrum */
export const ME_MEV = 0.511;
export const Q_XE136_MEV = 2.458;
/** Approximate 2 nu beta beta summed-kinetic-energy shape (K, Q in units of m_e): f ~ K (Q-K)^5 (1 + 2K + 4K^2/3 + K^3/3 + K^4/30). */
export function dbd2nu(K: number, Q: number) {
  if (K <= 0 || K >= Q) return 0;
  return K * (Q - K) ** 5 * (1 + 2 * K + (4 * K * K) / 3 + K ** 3 / 3 + K ** 4 / 30);
}
export interface DbdModel { x: number[]; two: number[]; zero: number[]; total: number[]; roi: [number, number]; sOverB: number; nSig: number; nBg: number; peakOverCont: number }
/**
 * Spectra per unit E/Q (2nu area = 1 over the full range, 0nu area = ratio), convolved with a Gaussian of sigma = FWHM/2.355
 * (constant in energy, FWHM given as a fraction of Q). Region of interest ROI = Q +- FWHM.
 */
export function dbdModel(ratio: number, fwhmFrac: number, n = 480, xmax = 1.2): DbdModel {
  const Qm = Q_XE136_MEV / ME_MEV;
  const xs = Array.from({ length: n + 1 }, (_, i) => (i * xmax) / n);
  const dx = xmax / n;
  const raw = xs.map((x) => dbd2nu(x * Qm, Qm));
  const norm = raw.reduce((s, v) => s + v, 0) * dx;
  const f2 = raw.map((v) => v / norm);
  const sig = fwhmFrac / 2.3548;
  const two = xs.map((x) => {
    let s = 0;
    const lo = Math.max(0, Math.floor((x - 5 * sig) / dx)), hi = Math.min(n, Math.ceil((x + 5 * sig) / dx));
    for (let j = lo; j <= hi; j++) s += f2[j] * Math.exp(-((x - xs[j]) ** 2) / (2 * sig * sig));
    return (s * dx) / (sig * Math.sqrt(2 * Math.PI));
  });
  const zero = xs.map((x) => (ratio * Math.exp(-((x - 1) ** 2) / (2 * sig * sig))) / (sig * Math.sqrt(2 * Math.PI)));
  const total = two.map((v, i) => v + zero[i]);
  const roi: [number, number] = [1 - fwhmFrac, 1 + fwhmFrac];
  let nBg = 0;
  xs.forEach((x, i) => { if (x >= roi[0] && x <= roi[1]) nBg += two[i] * dx; });
  const nSig = ratio * erf(fwhmFrac / (sig * Math.SQRT2));
  const iQ = Math.round(1 / dx);
  return { x: xs, two, zero, total, roi, sOverB: nSig / Math.max(nBg, 1e-300), nSig, nBg, peakOverCont: zero[iQ] / Math.max(two[iQ], 1e-300) };
}

/* ---------------------------------------------------------------- RotCurve: shared by the RotationCurve widget and the dm.rotation scene */
export const G_KPC = 4.30091e-6; // kpc (km/s)^2 / Msun
export const ROT = { aKpc: 3, rcKpc: 5, MdDefault: 6e10, vFlatDefault: 200, rMax: 30 };
/** Exponential disc, spherical approximation: M(r) = M_d [1 - e^(-r/a) (1 + r/a)], v_d^2 = G M(r) / r. */
export const discMass = (r: number, Md: number, a = ROT.aKpc) => Md * (1 - Math.exp(-r / a) * (1 + r / a));
export const vDisc = (r: number, Md: number, a = ROT.aKpc) => (r <= 0 ? 0 : Math.sqrt((G_KPC * discMass(r, Md, a)) / r));
/**
 * Pseudo-isothermal halo rho = rho0 / (1 + (r/rc)^2), parametrised by v_flat^2 = 4 pi G rho0 rc^2:
 *   M_h(r) = (v_flat^2 / G) [r - rc atan(r/rc)],   v_h^2 = G M_h / r = v_flat^2 [1 - (rc/r) atan(r/rc)].
 */
export const haloMass = (r: number, vFlat: number, rc = ROT.rcKpc) => (vFlat * vFlat * (r - rc * Math.atan(r / rc))) / G_KPC;
export const vHalo = (r: number, vFlat: number, rc = ROT.rcKpc) => (r <= 0 ? 0 : vFlat * Math.sqrt(Math.max(0, 1 - (rc / r) * Math.atan(r / rc))));
export const vTotal = (r: number, Md: number, vFlat: number, a = ROT.aKpc, rc = ROT.rcKpc) => Math.hypot(vDisc(r, Md, a), vHalo(r, vFlat, rc));

/* ---------------------------------------------------------------- ER / NR bands */
export const ERNR = {
  s1Min: 3,
  s1Max: 40,
  er: { y0: 1.2, slope: -0.0025, sigma: 0.15 },
  nr: { y0: 0.7, slope: -0.0025, sigma: 0.12 },
};
export const bandMean = (b: { y0: number; slope: number }, s1: number) => b.y0 + b.slope * s1;
export interface ErNrEvent { s1: number; y: number; nr: boolean }
export function simulateErNr(r: () => number, n = 60): ErNrEvent[] {
  const out: ErNrEvent[] = [];
  for (let i = 0; i < n; i++) {
    const s1 = ERNR.s1Min + (ERNR.s1Max - ERNR.s1Min) * r();
    out.push({ s1, y: bandMean(ERNR.er, s1) + ERNR.er.sigma * gauss(r), nr: false });
  }
  for (let i = 0; i < n; i++) {
    const s1 = Math.min(ERNR.s1Min - 10 * Math.log(1 - r() * (1 - Math.exp(-(ERNR.s1Max - ERNR.s1Min) / 10))), ERNR.s1Max);
    out.push({ s1, y: bandMean(ERNR.nr, s1) + ERNR.nr.sigma * gauss(r), nr: true });
  }
  return out;
}
/** Population fraction below the cut line y = level + tilt (s1 - 20): ER uniform in S1, NR exponential (mean 10 photons). */
export function ernrFractions(level: number, tilt: number) {
  const Phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
  let wEr = 0, fEr = 0, wNr = 0, fNr = 0;
  for (let s = ERNR.s1Min + 0.5; s < ERNR.s1Max; s += 1) {
    const line = level + tilt * (s - 20);
    wEr += 1;
    fEr += Phi((line - bandMean(ERNR.er, s)) / ERNR.er.sigma);
    const w = Math.exp(-(s - ERNR.s1Min) / 10);
    wNr += w;
    fNr += w * Phi((line - bandMean(ERNR.nr, s)) / ERNR.nr.sigma);
  }
  return { leak: fEr / wEr, acc: fNr / wNr };
}

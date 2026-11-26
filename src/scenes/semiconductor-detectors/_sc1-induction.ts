/**
 * Shockley–Ramo model of a pixel sensor, shared by sc.signal-induction and sc.camera-vs-particle.
 *
 * Geometry (µm): sensor thickness d = 300, pixel pitch p = 50, electrode width 40, five pixels across;
 * z = depth below the pixel side. The central pixel is the readout electrode (weighting potential 1); neighbours and the
 * backplane are at 0. The weighting potential φ_w is the numerical solution of Laplace's equation (SOR) on this slab,
 * so E_w = −∇φ_w is concentrated near the pixel (the "small-pixel effect"; d/p = 6).
 * Induced current of a charge q moving with velocity v:  i = q v·E_w (Shockley–Ramo); ∫i dt = q Δφ_w.
 * Drift velocities come from _sc1-common (μE/(1+μE/v_sat), trapezoidal field of a sensor biased above V_fd).
 */
import { PH, driftPath } from './_sc1-common';

export const GEO = { d: PH.D_UM, pitch: 50, elec: 40, nPix: 5, dx: 2.5 };
const NX = Math.round((GEO.pitch * GEO.nPix) / GEO.dx); // cells across
const NY = Math.round(GEO.d / GEO.dx);
export const X_HALF = (GEO.pitch * GEO.nPix) / 2;

let cache: { phi: Float32Array } | null = null;

const idx = (i: number, j: number) => j * (NX + 1) + i;

/** Weighting potential on the (NX+1)×(NY+1) node grid (row j = depth, column i = lateral position). */
export function weightingPotential(): Float32Array {
  if (cache) return cache.phi;
  const phi = new Float32Array((NX + 1) * (NY + 1));
  const isElec = new Uint8Array(NX + 1); // 0 none, 1 central electrode (φ=1), 2 grounded neighbour electrode
  for (let i = 0; i <= NX; i++) {
    const x = -X_HALF + i * GEO.dx;
    const k = Math.round(x / GEO.pitch);
    if (Math.abs(x - k * GEO.pitch) <= GEO.elec / 2 + 1e-6) isElec[i] = k === 0 ? 1 : 2;
  }
  for (let i = 0; i <= NX; i++) if (isElec[i] === 1) phi[idx(i, 0)] = 1;
  const w = 1.92;
  for (let it = 0; it < 700; it++) {
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i <= NX; i++) {
        if (j === 0 && isElec[i]) continue;
        const l = i > 0 ? phi[idx(i - 1, j)] : phi[idx(i + 1, j)];
        const r = i < NX ? phi[idx(i + 1, j)] : phi[idx(i - 1, j)];
        const dn = phi[idx(i, j + 1)];
        const up = j > 0 ? phi[idx(i, j - 1)] : dn; // insulating gap at the surface (Neumann)
        const v = 0.25 * (l + r + up + dn);
        phi[idx(i, j)] += w * (v - phi[idx(i, j)]);
      }
    }
  }
  cache = { phi };
  return phi;
}

/** φ_w at (x, z) in µm by bilinear interpolation. */
export function phiAt(x: number, z: number): number {
  const phi = weightingPotential();
  const fx = Math.min(NX - 1e-9, Math.max(0, (x + X_HALF) / GEO.dx));
  const fz = Math.min(NY - 1e-9, Math.max(0, z / GEO.dx));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const a = fx - i;
  const b = fz - j;
  return (
    phi[idx(i, j)] * (1 - a) * (1 - b) + phi[idx(i + 1, j)] * a * (1 - b) + phi[idx(i, j + 1)] * (1 - a) * b + phi[idx(i + 1, j + 1)] * a * b
  );
}

/** Weighting field E_w = −∇φ_w in 1/µm (per unit potential). Returns [Ex, Ez] with z pointing into the sensor. */
export function ewAt(x: number, z: number): [number, number] {
  const h = GEO.dx;
  const ex = -(phiAt(x + h, z) - phiAt(x - h, z)) / (2 * h);
  const ez = -(phiAt(x, z + h) - phiAt(x, Math.max(0, z - h))) / (z >= h ? 2 * h : h);
  return [ex, ez];
}

export interface Pulse {
  /** time grid, ns */
  dt: number;
  n: number;
  /** electron / hole / total induced current on the central pixel, in e⁻ per ns */
  ie: Float64Array;
  ih: Float64Array;
  i: Float64Array;
  /** cumulative induced charge, e⁻ */
  q: Float64Array;
  /** total charge N (e⁻), numerically integrated charge, last-arrival times (ns) */
  Ntot: number;
  Qint: number;
  tE: number;
  tH: number;
}

let pulseCache: Pulse | null = null;

/** Induced current of the pairs of a vertical MIP track through the centre of the central pixel. */
export function pulseModel(): Pulse {
  if (pulseCache) return pulseCache;
  const M = 150; // pairs sampled along the track; each stands for Ntot/M real pairs
  const Ntot = PH.PAIRS_UM * GEO.d;
  const dt = 0.05;
  const n = Math.round(30 / dt);
  const ie = new Float64Array(n);
  const ih = new Float64Array(n);
  let tE = 0;
  let tH = 0;
  for (let k = 0; k < M; k++) {
    const z0 = ((k + 0.5) / M) * GEO.d;
    for (const c of ['e', 'h'] as const) {
      const path = driftPath(z0, c, PH.VBIAS, GEO.d, dt);
      const arr = c === 'e' ? ie : ih;
      if (c === 'e') tE = Math.max(tE, path.arrival);
      else tH = Math.max(tH, path.arrival);
      const q = Ntot / M;
      for (let s = 0; s < path.zs.length - 1 && s < n; s++) {
        // induced charge in one step = q·|Δφ_w| (exact Shockley–Ramo bookkeeping: ∫ i dt = q Δφ_w, i = q v·E_w)
        const dphi = Math.abs(phiAt(0, path.zs[s + 1]) - phiAt(0, path.zs[s]));
        arr[s] += (q * dphi) / dt;
      }
    }
  }
  const i = new Float64Array(n);
  const qc = new Float64Array(n);
  let acc = 0;
  for (let s = 0; s < n; s++) {
    i[s] = ie[s] + ih[s];
    acc += i[s] * dt;
    qc[s] = acc;
  }
  pulseCache = { dt, n, ie, ih, i, q: qc, Ntot, Qint: acc, tE, tH };
  return pulseCache;
}

/**
 * Simulated charged tracks for hi.geometry and hi.event-replay. Seeded, schematic, not real data.
 * Units: GeV/c, metres, tesla. A track of momentum p and charge q in field B turns with radius R = p_perp / (0.3 |B|).
 * Direction rotation about B̂ per unit path length: Ω = −0.3 q |B| / p  (positive charge turns clockwise looking along +B).
 */
import { gaussian } from '../shared/canvas2d';

export interface Track {
  q: 1 | -1;
  /** transverse momentum w.r.t. the beam (z) axis */
  pt: number;
  p: number;
  /** unit direction at the vertex */
  d: [number, number, number];
  /** polyline in metres, xyz triplets */
  pts: Float32Array;
}

export type Field = (x: number, y: number, z: number) => [number, number, number];
export type Inside = (x: number, y: number, z: number) => boolean;

function make(rnd: () => number, p: number, d: [number, number, number]): Track {
  return { q: rnd() < 0.5 ? 1 : -1, pt: p * Math.hypot(d[0], d[1]), p, d, pts: new Float32Array(0) };
}

/** Collider event: p_T = 0.15 + exponential (⟨p_T⟩ ≈ 0.5 GeV/c), φ uniform, η uniform in ±etaMax. */
export function sampleUniformEta(rnd: () => number, n: number, etaMax: number, meanPt = 0.5): Track[] {
  const out: Track[] = [];
  for (let i = 0; i < n; i++) {
    const pt = 0.15 - (meanPt - 0.15) * Math.log(1 - rnd());
    const eta = (2 * rnd() - 1) * etaMax;
    const ph = 2 * Math.PI * rnd();
    const pz = pt * Math.sinh(eta);
    const p = Math.hypot(pt, pz);
    out.push(make(rnd, p, [(pt * Math.cos(ph)) / p, (pt * Math.sin(ph)) / p, pz / p]));
  }
  return out;
}

/**
 * Pions emitted isotropically in the centre-of-mass frame (momentum p* ~ exponential, mean `meanP`), boosted along z by γ_cm.
 * γ_cm = 1 is the collider (CM = lab); γ_cm = 2.4 is a fixed-target collision at √s_NN ≈ 4.5 GeV.
 */
export function sampleBoosted(rnd: () => number, n: number, gammaCm: number, meanP = 0.45, m = 0.14): Track[] {
  const beta = Math.sqrt(1 - 1 / (gammaCm * gammaCm));
  const out: Track[] = [];
  for (let i = 0; i < n; i++) {
    const ps = Math.max(0.05, -meanP * Math.log(1 - rnd()));
    const c = 2 * rnd() - 1;
    const s = Math.sqrt(1 - c * c);
    const ph = 2 * Math.PI * rnd();
    const E = Math.hypot(ps, m);
    const pz = gammaCm * (ps * c + beta * E);
    const px = ps * s * Math.cos(ph);
    const py = ps * s * Math.sin(ph);
    const p = Math.hypot(px, py, pz);
    out.push(make(rnd, p, [px / p, py / p, pz / p]));
  }
  return out;
}

/** Step the track through B until `inside` fails or maxSteps; fills t.pts. */
export function trace(t: Track, B: Field, inside: Inside, dl: number, maxSteps: number, origin: [number, number, number] = [0, 0, 0]): void {
  let [x, y, z] = origin;
  let [dx, dy, dz] = t.d;
  const pts: number[] = [x, y, z];
  for (let i = 0; i < maxSteps; i++) {
    const [bx, by, bz] = B(x, y, z);
    const bm = Math.hypot(bx, by, bz);
    if (bm > 1e-6) {
      const a = (-0.3 * t.q * bm * dl) / t.p;
      const kx = bx / bm;
      const ky = by / bm;
      const kz = bz / bm;
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      const dot = kx * dx + ky * dy + kz * dz;
      const cx = ky * dz - kz * dy;
      const cy = kz * dx - kx * dz;
      const cz = kx * dy - ky * dx;
      const nx = dx * cs + cx * sn + kx * dot * (1 - cs);
      const ny = dy * cs + cy * sn + ky * dot * (1 - cs);
      const nz = dz * cs + cz * sn + kz * dot * (1 - cs);
      dx = nx;
      dy = ny;
      dz = nz;
    }
    x += dx * dl;
    y += dy * dl;
    z += dz * dl;
    pts.push(x, y, z);
    if (!inside(x, y, z)) break;
  }
  t.pts = Float32Array.from(pts);
}

/** Angle (rad) from the beam axis containing the fraction `frac` of the tracks at the vertex. */
export function coneAngle(tracks: Track[], frac = 0.9): number {
  const a = tracks.map((t) => Math.acos(Math.min(1, Math.max(-1, t.d[2])))).sort((u, v) => u - v);
  return a[Math.min(a.length - 1, Math.floor(frac * a.length))] ?? 0;
}

export { gaussian };

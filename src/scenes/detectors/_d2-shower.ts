/**
 * Toy electromagnetic shower in lead tungstate (X0 = 0.89 cm), used by det.walkthrough-calorimeter.
 * Electrons radiate photons (mean free path ~ 1 X0, fraction of energy uniform in 0.1..0.9), photons convert to pairs (mean free path 9/7 X0),
 * charged particles lose energy at E_c per X0 and scatter with theta_rms = scat * 21 MeV / E * sqrt(ds / X0). Below E_cut everything deposits locally.
 * `scat` is calibrated so that ~90 % of the energy lies inside one Moliere radius (2 cm) of the axis.
 */
export const X0 = 0.89; // cm
export const L_CRYSTAL = 25 * X0; // cm (about 22 cm)
export const E_CUT = 0.03; // GeV
const EC = 0.0093; // GeV, critical energy used for the ionization loss rate
const SCAT = 3.0;

export interface Seg {
  /** start / end position (cm): z along the crystal axis, x and y transverse */
  a: [number, number, number];
  b: [number, number, number];
  /** energy of the particle (GeV) and species */
  E: number;
  gamma: boolean;
}
export interface Dep {
  x: number;
  y: number;
  z: number;
  e: number;
}
export interface Shower {
  segs: Seg[];
  deps: Dep[];
  E0: number;
}

export function simulate(E0: number, rnd: () => number, x0 = 0, y0 = 0): Shower {
  const segs: Seg[] = [];
  const deps: Dep[] = [];
  type P = { E: number; gamma: boolean; p: [number, number, number]; d: [number, number, number] };
  const stack: P[] = [{ E: E0, gamma: false, p: [0, x0, y0], d: [1, 0, 0] }];
  const exp = (m: number) => -m * Math.log(1 - rnd());
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  let guard = 0;
  while (stack.length && guard++ < 60000) {
    const q = stack.pop()!;
    let { E, p } = q;
    const gamma = q.gamma;
    let d = q.d;
    const dep = (pt: [number, number, number], e: number) => deps.push({ z: pt[0], x: pt[1], y: pt[2], e });
    if (E < E_CUT) {
      dep(p, E);
      continue;
    }
    if (gamma) {
      const s = exp((9 / 7) * X0);
      const b: [number, number, number] = [p[0] + d[0] * s, p[1] + d[1] * s, p[2] + d[2] * s];
      segs.push({ a: p, b, E, gamma });
      if (b[0] > L_CRYSTAL + 20 || b[0] < 0) continue;
      const f = 0.1 + 0.8 * rnd();
      stack.push({ E: E * f, gamma: false, p: b, d }, { E: E * (1 - f), gamma: false, p: b, d });
    } else {
      // electron: step up to a radiation event
      const sRad = exp(0.7 * X0);
      let s = 0;
      const ds = 0.3 * X0;
      while (s < sRad && E >= E_CUT) {
        const st = Math.min(ds, sRad - s);
        const th = (SCAT * 0.021 * Math.sqrt(st / X0)) / Math.max(E, 0.005);
        let nd: [number, number, number] = [d[0] + th * gauss(), d[1] + th * gauss(), d[2] + th * gauss()];
        const n = Math.hypot(...nd);
        nd = [nd[0] / n, nd[1] / n, nd[2] / n];
        d = nd;
        const b: [number, number, number] = [p[0] + d[0] * st, p[1] + d[1] * st, p[2] + d[2] * st];
        const loss = Math.min(E, (EC * st) / X0);
        dep([(p[0] + b[0]) / 2, (p[1] + b[1]) / 2, (p[2] + b[2]) / 2], loss);
        E -= loss;
        segs.push({ a: p, b, E, gamma: false });
        p = b;
        s += st;
        if (p[0] > L_CRYSTAL + 20 || p[0] < -5) break;
      }
      if (E >= E_CUT && s >= sRad - 1e-9) {
        const f = 0.1 + 0.8 * rnd();
        stack.push({ E: E * (1 - f), gamma: false, p, d }, { E: E * f, gamma: true, p, d });
      } else if (E < E_CUT) dep(p, E);
    }
  }
  return { segs, deps, E0 };
}

/** Energy per crystal of a 3x3 array (pitch cm), crystal centres at (i, j) * pitch, i and j in -1..1. Deposits beyond z = L are lost (leakage). */
export function nineTowers(sh: Shower, pitch: number): number[] {
  const out = new Array<number>(9).fill(0);
  for (const d of sh.deps) {
    if (d.z > L_CRYSTAL || d.z < 0) continue;
    const i = Math.round(d.x / pitch);
    const j = Math.round(d.y / pitch);
    if (Math.abs(i) <= 1 && Math.abs(j) <= 1) out[(j + 1) * 3 + (i + 1)] += d.e;
  }
  return out;
}

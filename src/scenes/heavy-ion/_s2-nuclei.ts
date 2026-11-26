/**
 * Seeded Woods–Saxon nucleon positions and a Glauber-style participant count (shared by hi.collision and hi.stopping).
 * Distances in fm. x = in the reaction plane (along b), y = perpendicular, z = beam axis.
 */
import { gaussian, mulberry32 } from '../shared/canvas2d';

export interface Nucleon {
  x: number;
  y: number;
  z: number;
  /** true if it has a partner within the nucleon–nucleon interaction distance in the other nucleus. */
  part: boolean;
}

/** Pb-208 Woods–Saxon parameters (fm). */
export const WS = { A: 208, R: 6.62, a: 0.546 } as const;
/** Inelastic NN cross-section ~7 fm² (70 mb, LHC-like) → interaction distance d = sqrt(σ/π) ≈ 1.5 fm. */
export const D_NN = Math.sqrt(7 / Math.PI);

export function sampleNucleus(seed: number, A: number = WS.A): Nucleon[] {
  const rnd = mulberry32(seed);
  const rmax = WS.R + 7 * WS.a;
  const out: Nucleon[] = [];
  let guard = 0;
  while (out.length < A && guard++ < 200000) {
    const r = rmax * Math.cbrt(rnd());
    // accept with probability rho(r) (volume-uniform proposal)
    if (rnd() > 1 / (1 + Math.exp((r - WS.R) / WS.a))) continue;
    const c = 2 * rnd() - 1;
    const s = Math.sqrt(1 - c * c);
    const ph = 2 * Math.PI * rnd();
    const n: Nucleon = { x: r * s * Math.cos(ph), y: r * s * Math.sin(ph), z: r * c, part: false };
    // hard-core exclusion (0.6 fm) keeps the picture from overlapping dots
    if (out.some((o) => (o.x - n.x) ** 2 + (o.y - n.y) ** 2 + (o.z - n.z) ** 2 < 0.36) && guard < 100000) continue;
    out.push(n);
  }
  return out;
}

/** Nucleus A sits at x = +b/2, B at −b/2. Marks `part` on both. Returns the number of participants. */
export function markParticipants(a: Nucleon[], b: Nucleon[], bFm: number): number {
  a.forEach((n) => (n.part = false));
  b.forEach((n) => (n.part = false));
  const d2 = D_NN * D_NN;
  let count = 0;
  for (const na of a) {
    for (const nb of b) {
      const dx = na.x + bFm / 2 - (nb.x - bFm / 2);
      const dy = na.y - nb.y;
      if (dx * dx + dy * dy < d2) {
        if (!na.part) count++;
        if (!nb.part) count++;
        na.part = true;
        nb.part = true;
      }
    }
  }
  return count;
}

export { gaussian };

/** Parse "rgb(r, g, b)" / "#rrggbb" and return perceived luminance 0–1 (used to pick dark or light overlay ink). */
export function luminance(c: string): number {
  let r = 0;
  let g = 0;
  let b = 0;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) [r, g, b] = m[1].split(',').map((v) => parseFloat(v));
  else if (c[0] === '#') {
    const h = c.length === 4 ? c.slice(1).replace(/./g, '$&$&') : c.slice(1);
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** "3.3 × 10⁻²⁴ s" style formatter for the fm/c → seconds readout. */
export function sciSeconds(t: number, fmt: (n: number, o?: Intl.NumberFormatOptions) => string): string {
  if (Math.abs(t) < 1e-9) return '0 s';
  const s = Math.abs(t) * 3.336e-24;
  const e = Math.floor(Math.log10(s));
  const m = s / 10 ** e;
  const sup = String(e).replace(/[-0-9]/g, (ch) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(ch)]);
  return `${t < 0 ? '−' : ''}${fmt(m, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} × 10${sup} s`;
}

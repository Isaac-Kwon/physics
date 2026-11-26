/**
 * Shared drawing code for the detector "onion" (end view of a CMS-like barrel): used by det.onion, det.signatures, det.simulation.
 * Radii are schematic (outer radius of the muon system = 1, NOT to scale). Order from the inside:
 *   beam pipe, pixel layers, silicon tracker, ECAL (72 towers in phi), HCAL (36 towers), solenoid coil, iron yoke with muon chambers.
 * The solenoid field points out of the page inside the coil (B > 0 in the tracker and calorimeters) and returns into the page in
 * the yoke, so a charged track bends one way inside the coil and slightly the other way in the muon system.
 * Charged tracks are integrated numerically: dpsi/ds = -q * kappa(r), kappa = 1/R inside the coil, -0.45/R in the yoke
 * (R = p / (0.3 B), schematic units). Positive charge turns clockwise for B out of the page.
 */
import { interpolateViridis } from 'd3';
import type { SceneTheme } from '../shared/types';
import { clamp, smooth } from '../shared/canvas2d';
import { dot, fieldSymbol, line, ring } from '../common/_draw';

export const LAYERS = [
  { id: 'beam', a: 0.025, b: 0.035 },
  { id: 'vertex', a: 0.06, b: 0.13 },
  { id: 'tracker', a: 0.17, b: 0.42 },
  { id: 'ecal', a: 0.44, b: 0.52 },
  { id: 'hcal', a: 0.53, b: 0.7 },
  { id: 'magnet', a: 0.72, b: 0.765 },
  { id: 'muon', a: 0.775, b: 1.0 },
] as const;
export type LayerId = (typeof LAYERS)[number]['id'];
export const LAYER_IDS: LayerId[] = LAYERS.map((l) => l.id);
export const GAP = 0.1;
export const R_VIEW = 1 + GAP + 0.03;
export const N_ECAL = 72;
export const N_HCAL = 36;
const COIL = 0.745;
const PLATES = [
  [0.78, 0.83],
  [0.86, 0.91],
  [0.93, 0.98],
];
const CHAMBERS = [0.845, 0.92, 0.99];
const TAU = Math.PI * 2;

/** Remap a schematic radius when layers are pulled apart (ex[i] in 0..1 for each layer). */
export function rmap(r: number, ex: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < LAYERS.length; i++) {
    const e = ex[i] ?? 0;
    if (e <= 0) continue;
    s += e * GAP * (r > LAYERS[i].b + 1e-6 ? 1 : r >= LAYERS[i].a - 1e-6 ? 0.5 : 0);
  }
  return r + s;
}

function annulus(g: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, color: string, alpha: number) {
  if (alpha <= 0.004) return;
  g.save();
  g.globalAlpha = clamp(alpha);
  g.fillStyle = color;
  g.beginPath();
  g.arc(cx, cy, r1, 0, TAU);
  g.arc(cx, cy, r0, 0, TAU, true);
  g.fill();
  g.restore();
}

export interface OnionOpts {
  /** per-layer explosion level (7 numbers) */
  ex: readonly number[];
  /** per-layer emphasis (0 = ordinary, 1 = highlighted in the accent colour) */
  emph: readonly number[];
  /** alpha of non-emphasised layers */
  base: number;
  /** alpha of field symbols (0 hides them) */
  field: number;
  /** emphasis of the iron return yoke plates (magnet step) */
  yoke?: number;
}

/** Draw the concentric layers. cx, cy = centre in px, K = px per schematic radius unit. */
export function drawOnion(g: CanvasRenderingContext2D, cx: number, cy: number, K: number, th: SceneTheme, o: OnionOpts) {
  const R = (r: number) => K * rmap(r, o.ex);
  const dense = K > 150;
  const pass = (color: string, amul: (i: number) => number) => {
    const A = (i: number, v: number) => v * amul(i);
    ring(g, cx, cy, R(0.03), color, 1, A(0, 0.9));
    [0.07, 0.1, 0.125].forEach((r) => ring(g, cx, cy, R(r), color, 1.3, A(1, 0.95)));
    [0.2, 0.27, 0.34, 0.41].forEach((r) => ring(g, cx, cy, R(r), color, 1, A(2, 0.7)));
    // ECAL: two rings and tower boundaries
    ring(g, cx, cy, R(0.44), color, 1, A(3, 0.9));
    ring(g, cx, cy, R(0.52), color, 1, A(3, 0.9));
    if (dense && amul(3) > 0.02)
      for (let k = 0; k < N_ECAL; k++) {
        const a = (k / N_ECAL) * TAU;
        line(g, cx + R(0.44) * Math.cos(a), cy - R(0.44) * Math.sin(a), cx + R(0.52) * Math.cos(a), cy - R(0.52) * Math.sin(a), color, 1, A(3, 0.28));
      }
    // HCAL: absorber / scintillator sandwich indicated by two dashed rings, 36 towers
    ring(g, cx, cy, R(0.53), color, 1, A(4, 0.9));
    ring(g, cx, cy, R(0.7), color, 1, A(4, 0.9));
    [0.58, 0.64].forEach((r) => ring(g, cx, cy, R(r), color, 1, A(4, 0.3), [3, 3]));
    for (let k = 0; k < N_HCAL; k++) {
      const a = (k / N_HCAL) * TAU;
      line(g, cx + R(0.53) * Math.cos(a), cy - R(0.53) * Math.sin(a), cx + R(0.7) * Math.cos(a), cy - R(0.7) * Math.sin(a), color, 1, A(4, 0.28));
    }
    // coil
    ring(g, cx, cy, R(0.72), color, 1.2, A(5, 0.95));
    ring(g, cx, cy, R(0.765), color, 1.2, A(5, 0.95));
    // yoke plates and chambers
    PLATES.forEach(([a, b]) => {
      ring(g, cx, cy, R(a), color, 1, A(6, 0.55));
      ring(g, cx, cy, R(b), color, 1, A(6, 0.55));
    });
    CHAMBERS.forEach((r) => ring(g, cx, cy, R(r), color, 1.2, A(6, 0.95), [10, 3]));
  };
  pass(th.fg, (i) => o.base * (1 - (o.emph[i] ?? 0)));
  pass(th.accent, (i) => o.emph[i] ?? 0);
  // faint fills for the coil and the iron
  annulus(g, cx, cy, R(0.72), R(0.765), th.accent, 0.1 * (o.emph[5] ?? 0));
  PLATES.forEach(([a, b]) => {
    annulus(g, cx, cy, R(a), R(b), th.fg, 0.05 * o.base);
    if (o.yoke) {
      annulus(g, cx, cy, R(a), R(b), th.accent, 0.12 * o.yoke);
      ring(g, cx, cy, R(a), th.accent, 1, 0.8 * o.yoke);
      ring(g, cx, cy, R(b), th.accent, 1, 0.8 * o.yoke);
    }
  });
  // field symbols: out of the page inside the coil, into the page in the iron
  if (o.field > 0.02) {
    const rs = [0.3, 0.6];
    rs.forEach((r, j) => {
      const n = j ? 14 : 9;
      for (let k = 0; k < n; k++) {
        const a = ((k + 0.5 * j) / n) * TAU;
        fieldSymbol(g, cx + R(r) * Math.cos(a), cy - R(r) * Math.sin(a), true, th.fg, 0.5 * o.field, 3.8);
      }
    });
    [0.805, 0.885, 0.955].forEach((r) => {
      for (let k = 0; k < 12; k++) {
        const a = ((k + 0.5) / 12) * TAU;
        fieldSymbol(g, cx + R(r) * Math.cos(a), cy - R(r) * Math.sin(a), false, th.fg, 0.5 * o.field, 3.4);
      }
    });
  }
}

/** Energy colour (viridis) for a calorimeter tower. */
export const eColor = (e: number) => interpolateViridis(0.12 + 0.88 * clamp(e));

/** Fill calorimeter towers (ring 'ecal' or 'hcal') with energies in [0, 1]. */
export function drawTowers(g: CanvasRenderingContext2D, cx: number, cy: number, K: number, ex: readonly number[], which: 'ecal' | 'hcal', en: ArrayLike<number>, alpha = 1) {
  const L = LAYERS.find((l) => l.id === which)!;
  const n = which === 'ecal' ? N_ECAL : N_HCAL;
  const r0 = K * rmap(L.a, ex);
  const r1 = K * rmap(L.b, ex);
  for (let k = 0; k < n; k++) {
    const e = en[k] ?? 0;
    if (e < 0.02) continue;
    const a0 = (k / n) * TAU;
    const a1 = ((k + 1) / n) * TAU;
    g.save();
    g.globalAlpha = clamp(alpha);
    g.fillStyle = eColor(e);
    g.beginPath();
    g.arc(cx, cy, r1, -a1, -a0);
    g.arc(cx, cy, r0, -a0, -a1, true);
    g.closePath();
    g.fill();
    g.restore();
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Particle signatures

export type Kind = 'photon' | 'electron' | 'muon' | 'charged-hadron' | 'neutral-hadron' | 'neutrino';
export type Pt = [number, number];

/** Integrate a charge-q track of radius-of-curvature R from the origin until it reaches rEnd. */
export function integrate(phi: number, q: 1 | -1, R: number, rEnd: number): Pt[] {
  const pts: Pt[] = [[0, 0]];
  let x = 0;
  let y = 0;
  let psi = phi;
  const ds = 0.004;
  for (let i = 0; i < 2400; i++) {
    const r = Math.hypot(x, y);
    if (r >= rEnd) break;
    const kappa = (r < COIL ? 1 : -0.45) / R;
    psi -= q * kappa * ds;
    x += Math.cos(psi) * ds;
    y += Math.sin(psi) * ds;
    pts.push([x, y]);
  }
  return pts;
}

export interface Sig {
  kind: Kind;
  track: boolean;
  path: Pt[];
  /** straight inferred flight line of a neutral particle (not a measurement) */
  guide: Pt[] | null;
  ecal: number[];
  hcal: number[];
  /** muon chamber crossings: radius index and polar angle */
  mu: { r: number; ang: number }[];
  /** arrival fractions (0..1 of the whole path length) at ECAL, HCAL, muon system */
  tE: number;
  tH: number;
  tM: number;
}

const angOf = (p: Pt) => (Math.atan2(p[1], p[0]) + TAU) % TAU;
function crossing(path: Pt[], r: number): { p: Pt; f: number } | null {
  let len = 0;
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    cum.push(len);
  }
  for (let i = 1; i < path.length; i++)
    if (Math.hypot(path[i][0], path[i][1]) >= r) return { p: path[i], f: cum[i] / Math.max(len, 1e-6) };
  return null;
}
const gauss = (n: number, centre: number, sigma: number, amp: number) => {
  const out = new Array<number>(n).fill(0);
  for (let k = 0; k < n; k++) {
    let d = Math.abs(k + 0.5 - centre);
    d = Math.min(d, n - d);
    out[k] = amp * Math.exp(-(d * d) / (2 * sigma * sigma));
  }
  return out;
};

/**
 * Build the signature of one particle leaving the vertex at polar angle phi.
 * e: deposit amplitude (0..1) of the shower, standing for the energy.
 */
export function makeSig(kind: Kind, phi: number, q: 1 | -1, R: number, e = 0.9): Sig {
  const sig: Sig = { kind, track: false, path: [], guide: null, ecal: new Array(N_ECAL).fill(0), hcal: new Array(N_HCAL).fill(0), mu: [], tE: 0.8, tH: 0.9, tM: 1 };
  const tower = (th: number, N: number) => (th / TAU) * N;
  const line2 = (rEnd: number): Pt[] => [
    [0, 0],
    [Math.cos(phi) * rEnd, Math.sin(phi) * rEnd],
  ];
  if (kind === 'photon' || kind === 'neutral-hadron') {
    const rEnd = kind === 'photon' ? 0.47 : 0.6;
    sig.guide = line2(rEnd);
    const th = (phi + TAU) % TAU;
    if (kind === 'photon') {
      sig.ecal = gauss(N_ECAL, tower(th, N_ECAL), 0.8, e);
      sig.tE = 1;
    } else {
      sig.hcal = gauss(N_HCAL, tower(th, N_HCAL), 1.2, 0.9 * e);
      sig.tH = 1;
    }
    return sig;
  }
  if (kind === 'neutrino') return sig;
  sig.track = true;
  const rEnd = kind === 'electron' ? 0.46 : kind === 'charged-hadron' ? 0.6 : 1.0;
  sig.path = integrate(phi, q, R, rEnd);
  const ce = crossing(sig.path, 0.48);
  const ch = crossing(sig.path, 0.6);
  if (kind === 'electron' && ce) {
    sig.ecal = gauss(N_ECAL, tower(angOf(sig.path[sig.path.length - 1]), N_ECAL), 0.8, e);
    sig.tE = 1;
  } else if (kind === 'charged-hadron' && ce && ch) {
    sig.ecal = gauss(N_ECAL, tower(angOf(ce.p), N_ECAL), 0.45, 0.18);
    sig.hcal = gauss(N_HCAL, tower(angOf(ch.p), N_HCAL), 1.2, 0.9 * e);
    sig.tE = ce.f;
    sig.tH = 1;
  } else if (kind === 'muon' && ce && ch) {
    sig.ecal = gauss(N_ECAL, tower(angOf(ce.p), N_ECAL), 0.45, 0.12);
    sig.hcal = gauss(N_HCAL, tower(angOf(ch.p), N_HCAL), 0.45, 0.14);
    sig.tE = ce.f;
    sig.tH = ch.f;
    CHAMBERS.forEach((r, i) => {
      const c = crossing(sig.path, r);
      if (c) sig.mu.push({ r: i, ang: angOf(c.p) });
    });
    sig.tM = 1;
  }
  return sig;
}

/** Draw a signature up to progress prog (0..1 along the path); deposits fade in as the particle arrives. */
export function drawSig(g: CanvasRenderingContext2D, cx: number, cy: number, K: number, th: SceneTheme, sig: Sig, prog: number, color: string, ex: readonly number[] = []) {
  const P = (p: Pt): Pt => [cx + p[0] * K, cy - p[1] * K];
  const draw = (pts: Pt[], dash: number[], alpha: number, w: number) => {
    if (pts.length < 2 || prog <= 0) return;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let acc = 0;
    g.save();
    g.strokeStyle = color;
    g.lineWidth = w;
    g.globalAlpha = alpha;
    g.setLineDash(dash);
    g.beginPath();
    const [x0, y0] = P(pts[0]);
    g.moveTo(x0, y0);
    for (let i = 1; i < pts.length; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc / len > prog) break;
      const [x, y] = P(pts[i]);
      g.lineTo(x, y);
    }
    g.stroke();
    g.restore();
  };
  if (sig.track) draw(sig.path, [], 1, 1.6);
  if (sig.guide) draw(sig.guide, [4, 4], 0.55, 1);
  const fe = smooth(sig.tE - 0.04, sig.tE + 0.06, prog);
  const fh = smooth(sig.tH - 0.04, sig.tH + 0.06, prog);
  drawTowers(g, cx, cy, K, ex, 'ecal', sig.ecal, fe);
  drawTowers(g, cx, cy, K, ex, 'hcal', sig.hcal, fh);
  const fm = smooth(0.88, 1, prog);
  sig.mu.forEach((m) => {
    const r = K * rmap(CHAMBERS[m.r], ex);
    const a = m.ang;
    g.save();
    g.globalAlpha = fm;
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, r, -(a + 0.025), -(a - 0.025));
    g.stroke();
    g.restore();
    dot(g, cx + r * Math.cos(a), cy - r * Math.sin(a), 2.5, color, fm);
  });
}

/** Silicon points at the vertex/tracker layers where a track crosses them (hits), as radius and angle. */
export function trackHits(path: Pt[], radii: number[]): Pt[] {
  const out: Pt[] = [];
  radii.forEach((r) => {
    const c = crossing(path, r);
    if (c) out.push(c.p);
  });
  return out;
}
export const TRACKER_HIT_RADII = [0.07, 0.1, 0.125, 0.2, 0.27, 0.34, 0.41];
export const CHAMBER_RADII = CHAMBERS;

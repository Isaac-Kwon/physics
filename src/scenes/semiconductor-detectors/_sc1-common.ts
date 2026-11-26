/**
 * Private helpers for bundle SC1 (sc.hook, sc.charge-ladder, sc.camera-vs-particle, sc.mip-charge, sc.band-gap,
 * sc.junction, sc.drift, sc.signal-induction). Not a scene (leading underscore). No window/document access at module top level.
 *
 * Shared physics so that every panel and scene quotes the same numbers:
 *   pair energy w = 3.6 eV, band gap 1.12 eV, 80 pairs/µm (most probable), N_eff = 1e12 cm⁻³, V_bi = 0.6 V,
 *   depletion width W = √(2ε(V_bi+V)/(q N_eff)), drift v = μE/(1+μE/v_sat), D = μ kT/q.
 */
import type { SceneContext, SceneInstance, SetStateOptions } from '../shared/types';
import { approach, createCanvas2D, type Canvas2D, type FrameState } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { dprCap } from '../../lib/device';

export type G = CanvasRenderingContext2D;
export { FONT_MONO, FONT_SANS };

let fgColor = '#ffffff';

/* ------------------------------------------------------------------ constants (from src/data/semiconductor.ts) */
const n = (c: { value: number | readonly [number, number] }) => c.value as number;
export const PH = {
  EG: n(SC.EG_SI_EV),
  W_PAIR: n(SC.W_PAIR_SI_EV),
  W_GAS: n(SC.W_PAIR_GAS_EV),
  EPS_R: n(SC.EPS_R_SI),
  VBI: n(SC.V_BI_V),
  NEFF: n(SC.NEFF_REF_CM3),
  MU_E: n(SC.MU_E_CM2_VS),
  MU_H: n(SC.MU_H_CM2_VS),
  VSAT: n(SC.V_SAT_CM_S),
  PAIRS_UM: n(SC.PAIRS_PER_UM_MPV),
  PAIRS_MEAN_UM: n(SC.PAIRS_PER_UM_MEAN),
  D_UM: n(SC.SENSOR_THICKNESS_UM),
  Q_MIP: n(SC.MIP_CHARGE_300UM_E),
  Q: 1.602e-19, // C
  EPS0: 8.854e-14, // F/cm
  KT_Q: 0.02585, // V at 300 K
  VBIAS: 150, // working bias used in the drift / induction scenes (above V_fd, as in a real sensor)
} as const;
export const EPS = PH.EPS_R * PH.EPS0;

/** Depletion model of an abrupt one-sided junction (BiasDepletion widget model). Lengths in µm, fields in V/cm. */
export function junctionModel(Vbias: number, d = PH.D_UM, N = PH.NEFF) {
  const dcm = d * 1e-4;
  const Vt = Math.max(0, Vbias + PH.VBI);
  const Vfd0 = (PH.Q * N * dcm * dcm) / (2 * EPS); // = V_fd + V_bi
  const full = Vt >= Vfd0;
  const W = full ? d : Math.sqrt((2 * EPS * Vt) / (PH.Q * N)) * 1e4;
  /** |E| at distance x (µm) from the junction. */
  const E = (x: number) => {
    if (x < 0 || x > W) return 0;
    const slope = (PH.Q * N) / EPS; // V/cm per cm
    if (!full) return slope * (W - x) * 1e-4;
    return slope * (d - x) * 1e-4 + (Vt - Vfd0) / dcm;
  };
  return { W, E, full, Vfd: Vfd0 - PH.VBI };
}

/** Drift velocity in µm/ns (mobility μ in cm²/Vs, field in V/cm) with velocity saturation. */
export const vDrift = (mu: number, E: number) => ((mu * E) / (1 + (mu * E) / PH.VSAT)) * 1e-5;

/**
 * Drift of one electron or hole in the fully depleted sensor (field from junctionModel).
 * z = distance from the electron-collecting (junction) side in µm. Electrons go toward z = 0, holes toward z = d.
 * Returns z(t) sampled every dt ns and the arrival time.
 */
export function driftPath(z0: number, carrier: 'e' | 'h', V = PH.VBIAS, d = PH.D_UM, dt = 0.05) {
  const jm = junctionModel(V, d);
  const mu = carrier === 'e' ? PH.MU_E : PH.MU_H;
  const sgn = carrier === 'e' ? -1 : 1;
  const zs = [z0];
  let z = z0;
  let t = 0;
  while (t < 80) {
    const v = vDrift(mu, jm.E(Math.min(d, Math.max(0, z))));
    z += sgn * v * dt;
    t += dt;
    if (z <= 0 || z >= d) {
      zs.push(sgn < 0 ? 0 : d);
      break;
    }
    zs.push(z);
  }
  const at = (tt: number) => {
    const i = tt / dt;
    const k = Math.floor(i);
    if (k >= zs.length - 1) return zs[zs.length - 1];
    return zs[k] + (zs[k + 1] - zs[k]) * (i - k);
  };
  return { dt, zs, arrival: (zs.length - 1) * dt, at };
}

/* ------------------------------------------------------------------ stage (named states, eased parameters) */
export interface Env {
  state: string;
  /** Seconds since the current state was entered (1e3 when the final frame is wanted). */
  ts: number;
  t: number;
  reduced: boolean;
}

export interface StageConfig<P extends Record<string, number>> {
  states: readonly string[];
  targets: Record<string, P>;
  tau?: number;
  loop?: readonly string[];
  anim?: Record<string, number>;
  draw(g: G, s: FrameState, P: P, env: Env): void;
}

export function createStage<P extends Record<string, number>>(ctx: SceneContext, cfg: StageConfig<P>): SceneInstance & { c: Canvas2D } {
  fgColor = ctx.theme.fg;
  const first = cfg.states[0];
  const cur: P = { ...cfg.targets[first] };
  let tgt: P = cfg.targets[first];
  let state = first;
  let ts = ctx.reducedMotion ? 1e3 : 0;
  let fresh = false;
  const c: Canvas2D = createCanvas2D(ctx, (g, s) => {
    const dt = s.dt > 0 ? s.dt : fresh ? 1 / 60 : 0;
    fresh = false;
    let settled = true;
    for (const k of Object.keys(tgt) as (keyof P)[]) {
      cur[k] = approach(cur[k], tgt[k], dt, cfg.tau ?? 0.45) as P[keyof P];
      if (Math.abs(cur[k] - tgt[k]) > 1e-3) settled = false;
      else cur[k] = tgt[k];
    }
    ts = dt === 0 ? 1e3 : ts + dt;
    cfg.draw(g, s, cur, { state, ts, t: s.t, reduced: ctx.reducedMotion });
    c.animate = !settled || !!cfg.loop?.includes(state) || ts < (cfg.anim?.[state] ?? 0);
  });
  return {
    c,
    setState(st: string, opts: SetStateOptions) {
      if (!cfg.targets[st]) return;
      state = st;
      tgt = cfg.targets[st];
      if (opts.immediate || ctx.reducedMotion) {
        Object.assign(cur, tgt);
        ts = 1e3;
        c.animate = false;
      } else {
        ts = 0;
        fresh = true;
        c.animate = true;
      }
      c.invalidate();
    },
    resize: c.resize,
    setActive: c.setActive,
    dispose: c.dispose,
  };
}

/* ------------------------------------------------------------------ drawing primitives */
export function txt(
  g: G,
  s: string,
  x: number,
  y: number,
  o: { mono?: boolean; align?: CanvasTextAlign; base?: CanvasTextBaseline; alpha?: number; color?: string } = {},
) {
  g.save();
  g.font = o.mono ? FONT_MONO : FONT_SANS;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = o.base ?? 'middle';
  g.globalAlpha = o.alpha ?? 0.85;
  g.fillStyle = o.color ?? fgColor;
  g.fillText(s, x, y);
  g.restore();
}

/** Width of a string in the figure fonts. */
export function textWidth(g: G, s: string, mono = false) {
  g.save();
  g.font = mono ? FONT_MONO : FONT_SANS;
  const w = g.measureText(s).width;
  g.restore();
  return w;
}

export function arrow(g: G, x0: number, y0: number, x1: number, y1: number, o: { color: string; width?: number; alpha?: number; head?: number; dash?: number[] }) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const hd = Math.min(o.head ?? 7, len * 0.6);
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  g.strokeStyle = o.color;
  g.fillStyle = o.color;
  g.lineWidth = o.width ?? 1.25;
  g.setLineDash(o.dash ?? []);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1 - ux * hd * 0.7, y1 - uy * hd * 0.7);
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x1 - ux * hd - uy * hd * 0.4, y1 - uy * hd + ux * hd * 0.4);
  g.lineTo(x1 - ux * hd + uy * hd * 0.4, y1 - uy * hd - ux * hd * 0.4);
  g.closePath();
  g.fill();
  g.restore();
}

export function line(g: G, x0: number, y0: number, x1: number, y1: number, color: string, alpha = 1, width = 1, dash: number[] = []) {
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.setLineDash(dash);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.restore();
}

/** Electron: filled dot. */
export function electronDot(g: G, x: number, y: number, color: string, r = 3, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Hole: open ring. */
export function holeRing(g: G, x: number, y: number, color: string, r = 3, alpha = 1, width = 1.3) {
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

/** Zig-zag wiggle (lattice vibrations). */
export function wiggle(g: G, x0: number, y0: number, x1: number, y1: number, amp: number, color: string, alpha = 0.7, waves = 6) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const nx = -dy / len;
  const ny = dx / len;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.beginPath();
  const steps = Math.max(8, Math.round(len / 2));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const o = Math.sin(u * Math.PI * 2 * waves) * amp * Math.sin(u * Math.PI);
    const px = x0 + dx * u + nx * o;
    const py = y0 + dy * u + ny * o;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.stroke();
  g.restore();
}

/** Horizontal or vertical scale bar with end ticks and a label (mono). */
export function scaleBar(g: G, x: number, y: number, px: number, label: string, vertical = false, alpha = 0.8) {
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = fgColor;
  g.lineWidth = 1;
  g.beginPath();
  if (vertical) {
    g.moveTo(x, y);
    g.lineTo(x, y - px);
    g.moveTo(x - 4, y);
    g.lineTo(x + 4, y);
    g.moveTo(x - 4, y - px);
    g.lineTo(x + 4, y - px);
  } else {
    g.moveTo(x, y);
    g.lineTo(x + px, y);
    g.moveTo(x, y - 4);
    g.lineTo(x, y + 4);
    g.moveTo(x + px, y - 4);
    g.lineTo(x + px, y + 4);
  }
  g.stroke();
  g.restore();
  if (vertical) txt(g, label, x + 9, y - px / 2, { mono: true, alpha });
  else txt(g, label, x + px / 2, y + 12, { mono: true, align: 'center', alpha });
}

/** Dimension line between two points (both end ticks), label at the middle. */
export function dimLine(g: G, x0: number, y0: number, x1: number, y1: number, color: string, alpha = 0.7) {
  line(g, x0, y0, x1, y1, color, alpha, 1);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 4;
  const ny = (dx / len) * 4;
  line(g, x0 - nx, y0 - ny, x0 + nx, y0 + ny, color, alpha, 1);
  line(g, x1 - nx, y1 - ny, x1 + nx, y1 + ny, color, alpha, 1);
}

export const sup = (s: string | number) => String(s).replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
/** 2.4×10⁴ style. */
export function sci(v: number, digits = 2) {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  return `${m.toFixed(digits - 1).replace(/\.0+$/, '')}×10${sup(e)}`;
}

/** 'rgba' string from hex or rgb() colour with alpha. */
export function withAlpha(c: string, a: number): string {
  let r = 255,
    gg = 255,
    b = 255;
  if (c.startsWith('#')) {
    const h = c.length === 4 ? c.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : c;
    r = parseInt(h.slice(1, 3), 16);
    gg = parseInt(h.slice(3, 5), 16);
    b = parseInt(h.slice(5, 7), 16);
  } else {
    const m = c.match(/[\d.]+/g) ?? ['255', '255', '255'];
    r = +m[0];
    gg = +m[1];
    b = +m[2];
  }
  return `rgba(${r | 0},${gg | 0},${b | 0},${a})`;
}

export function roundRectPath(g: G, x: number, y: number, w: number, h: number, r = 2) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Off-screen layer composited with an alpha (plot() fixes its own alphas, so fade the whole layer). */
export function makeLayer() {
  let cv: HTMLCanvasElement | null = null;
  return (g: G, w: number, h: number, alpha: number, fn: (g2: G) => void) => {
    if (alpha <= 0.004) return;
    cv ??= document.createElement('canvas');
    const dpr = dprCap();
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    const g2 = cv.getContext('2d')!;
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    g2.clearRect(0, 0, w, h);
    fn(g2);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = Math.min(1, alpha);
    g.drawImage(cv, 0, 0);
    g.restore();
  };
}

/** Word-wrapped text; returns the y after the last line. */
export function wrapText(g: G, s: string, x: number, y: number, maxW: number, lineH: number, o: { mono?: boolean; alpha?: number; color?: string } = {}) {
  const words = s.split(' ');
  let ln = '';
  let yy = y;
  for (const w of words) {
    const t = ln ? `${ln} ${w}` : w;
    if (ln && textWidth(g, t, o.mono) > maxW) {
      txt(g, ln, x, yy, o);
      yy += lineH;
      ln = w;
    } else ln = t;
  }
  if (ln) {
    txt(g, ln, x, yy, o);
    yy += lineH;
  }
  return yy;
}

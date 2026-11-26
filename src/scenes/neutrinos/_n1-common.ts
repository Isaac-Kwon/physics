/**
 * Private helpers for bundle N1 (nu.hook, nu.beta-decay, nu.flavours, nu.oscillation, nu.sources, nu.interactions, nu.site).
 * Not a scene (leading underscore). No window/document access at module top level.
 */
import { interpolateViridis } from 'd3-scale-chromatic';
import type { SceneContext, SceneInstance, SetStateOptions } from '../shared/types';
import { approach, createCanvas2D, type Canvas2D, type FrameState } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS } from '../shared/plot';
import { dprCap } from '../../lib/device';
import { NU } from '../../data/neutrinos';

export type G = CanvasRenderingContext2D;
export { FONT_MONO, FONT_SANS };

let fgColor = '#ffffff';

/** Flavour colours (viridis samples 0.4 / 0.65 / 0.9: the 0.15 end is too dark on the dark figure panel), always also labelled with text. */
export const FLAVOUR_COLORS = [interpolateViridis(0.4), interpolateViridis(0.65), interpolateViridis(0.9)] as const;

/* ---------- oscillation physics, shared by every N1 scene (and numerically identical to the page's text) ---------- */
export const DM2_ATM = NU.DM2_ATM_EV2.value; // eV²
export const DM2_SOL = NU.DM2_SOL_EV2.value;
export const S22_ATM = NU.SIN2_2THETA_ATM.value;
export const S22_SOL = NU.SIN2_2THETA_SOL.value;
export const K_OSC = NU.OSC_COEFF.value; // 1.27
/** Two-flavour transition probability P = sin²2θ · sin²(1.27 Δm² L/E); x = L/E in km/GeV. */
export const pTransition = (s22: number, dm2: number, x: number) => s22 * Math.sin(K_OSC * dm2 * x) ** 2;

/* ---------- number formatting ---------- */
const SUP = '⁻⁰¹²³⁴⁵⁶⁷⁸⁹';
export const sup = (n: number) => String(n).replace(/[-0-9]/g, (c) => SUP['-0123456789'.indexOf(c)]);
/** 6e10 → "6×10¹⁰", 1e-4 → "10⁻⁴". */
export function sci(v: number, digits = 1): string {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  const ms = Number(m.toPrecision(digits));
  if (ms === 1) return `10${sup(e)}`;
  if (ms >= 10) return `1×10${sup(e + 1)}`;
  return `${ms}×10${sup(e)}`;
}

/* ---------- stage: Canvas2D scene driven by named states with eased numeric parameters ---------- */
export interface Env {
  state: string;
  /** Seconds since the current state was entered (1e3 when the final frame is wanted). */
  ts: number;
  /** Scene clock in seconds (frozen under reduced motion). */
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

/* ---------- drawing primitives ---------- */
export interface TxtOpts {
  mono?: boolean;
  align?: CanvasTextAlign;
  base?: CanvasTextBaseline;
  alpha?: number;
  color?: string;
}
const FONT_SUB = FONT_SANS.replace('12px', '9px');
/** Split "ν_μ" style text into runs: base text and one-character subscripts. */
function runs(s: string): { t: string; sub: boolean }[] {
  const out: { t: string; sub: boolean }[] = [];
  let i = 0;
  let cur = '';
  while (i < s.length) {
    if (s[i] === '_' && i + 1 < s.length) {
      if (cur) out.push({ t: cur, sub: false });
      cur = '';
      out.push({ t: s[i + 1], sub: true });
      i += 2;
    } else cur += s[i++];
  }
  if (cur) out.push({ t: cur, sub: false });
  return out;
}
export function txt(g: G, s: string, x: number, y: number, o: TxtOpts = {}) {
  if ((o.alpha ?? 0.85) <= 0.01) return;
  g.save();
  g.textBaseline = o.base ?? 'middle';
  g.globalAlpha = o.alpha ?? 0.85;
  g.fillStyle = o.color ?? fgColor;
  if (!o.mono && s.includes('_')) {
    const rs = runs(s);
    const wd = (r: { t: string; sub: boolean }) => {
      g.font = r.sub ? FONT_SUB : FONT_SANS;
      return g.measureText(r.t).width;
    };
    const total = rs.reduce((acc, r) => acc + wd(r), 0);
    let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    g.textAlign = 'left';
    for (const r of rs) {
      g.font = r.sub ? FONT_SUB : FONT_SANS;
      g.fillText(r.t, cx, y + (r.sub ? 3 : 0));
      cx += g.measureText(r.t).width;
    }
  } else {
    g.font = o.mono ? FONT_MONO : FONT_SANS;
    g.textAlign = o.align ?? 'left';
    g.fillText(s, x, y);
  }
  g.restore();
}

export function textWidth(g: G, s: string, mono = false): number {
  g.save();
  let w = 0;
  if (!mono && s.includes('_')) {
    for (const r of runs(s)) {
      g.font = r.sub ? FONT_SUB : FONT_SANS;
      w += g.measureText(r.t).width;
    }
  } else {
    g.font = mono ? FONT_MONO : FONT_SANS;
    w = g.measureText(s).width;
  }
  g.restore();
  return w;
}

/** Greedy word wrap to maxW pixels. */
export function wrap(g: G, s: string, maxW: number, mono = false): string[] {
  const words = s.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (line && textWidth(g, t, mono) > maxW) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/** Wrapped text block; returns the y after the last line. */
export function para(g: G, s: string, x: number, y: number, maxW: number, o: TxtOpts & { lh?: number } = {}): number {
  const lh = o.lh ?? 16;
  const lines = wrap(g, s, maxW, o.mono);
  lines.forEach((l, i) => txt(g, l, x, y + i * lh, { ...o, base: 'top' }));
  return y + lines.length * lh;
}

export function line(g: G, x0: number, y0: number, x1: number, y1: number, o: { color?: string; width?: number; alpha?: number; dash?: number[]; offset?: number } = {}) {
  g.save();
  g.strokeStyle = o.color ?? fgColor;
  g.lineWidth = o.width ?? 1.25;
  g.globalAlpha = o.alpha ?? 1;
  g.setLineDash(o.dash ?? []);
  g.lineDashOffset = o.offset ?? 0;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.restore();
}

/** A neutrino path: thin dashed line at reduced alpha (it leaves no trace). */
export function nuLine(g: G, x0: number, y0: number, x1: number, y1: number, alpha = 0.6, offset = 0) {
  line(g, x0, y0, x1, y1, { color: fgColor, width: 1.25, alpha, dash: [5, 4], offset });
}

export function arrow(g: G, x0: number, y0: number, x1: number, y1: number, o: { color?: string; width?: number; alpha?: number; head?: number; dash?: number[] } = {}) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const hd = Math.min(o.head ?? 7, len * 0.6);
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  g.strokeStyle = o.color ?? fgColor;
  g.fillStyle = o.color ?? fgColor;
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

/** Wavy line (Feynman gauge boson) from (x0,y0) to (x1,y1); `grow` 0–1 draws the first fraction. */
export function wavy(g: G, x0: number, y0: number, x1: number, y1: number, o: { color?: string; alpha?: number; width?: number; amp?: number; wl?: number; grow?: number } = {}) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const grow = o.grow ?? 1;
  if (len < 2 || grow <= 0) return;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const amp = o.amp ?? 4;
  const n = Math.max(2, Math.round((len * grow) / 2));
  const turns = Math.max(1, Math.round(len / (o.wl ?? 12)));
  g.save();
  g.strokeStyle = o.color ?? fgColor;
  g.globalAlpha = o.alpha ?? 1;
  g.lineWidth = o.width ?? 1.4;
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * grow;
    const w = Math.sin(u * turns * Math.PI * 2) * amp * Math.min(1, u * 8, (1 - u) * 8 + 0.0);
    const x = x0 + ux * len * u - uy * w;
    const y = y0 + uy * len * u + ux * w;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  g.restore();
}

export function dot(g: G, x: number, y: number, r: number, color: string, alpha = 1, hollow = false) {
  g.save();
  g.globalAlpha = alpha;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (hollow) {
    g.strokeStyle = color;
    g.lineWidth = 1.25;
    g.stroke();
  } else {
    g.fillStyle = color;
    g.fill();
  }
  g.restore();
}

/** Horizontal log axis along the bottom of a rectangle: ticks at the given powers of ten (labels from `labels`). */
export function logAxis(
  g: G,
  x: number,
  y: number,
  w: number,
  min: number,
  max: number,
  ticks: { v: number; label: string }[],
  color: string,
): (v: number) => number {
  const X = (v: number) => x + ((Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * w;
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = 0.45;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y);
  g.stroke();
  g.globalAlpha = 0.6;
  g.fillStyle = color;
  g.font = FONT_MONO;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  for (const t of ticks) {
    const px = X(t.v);
    g.beginPath();
    g.moveTo(px, y);
    g.lineTo(px, y + 4);
    g.stroke();
    g.fillText(t.label, px, y + 7);
  }
  g.restore();
  return X;
}

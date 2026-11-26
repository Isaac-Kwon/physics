/**
 * Private helpers for detector bundle D1 (det.hook, det.history, det.cloud-chamber, det.matter-block, det.photon-regions,
 * det.signal-chain, det.energy-resolution). Not a scene (leading underscore). No window/document access at module top level.
 */
import { interpolateInferno, interpolateViridis, rgb as d3rgb } from 'd3';
import type { SceneContext, SceneInstance, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, type Canvas2D, type FrameState } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS, type Rect } from '../shared/plot';
import { dprCap } from '../../lib/device';

export type G = CanvasRenderingContext2D;
export { interpolateInferno, interpolateViridis, clamp, FONT_MONO, FONT_SANS };
export type { Rect };

let fgColor = '#ffffff';

/** CSS colour (hex or rgb()) with an alpha. */
export const rgba = (c: string, a: number) => {
  const o = d3rgb(c);
  return `rgba(${Math.round(o.r)},${Math.round(o.g)},${Math.round(o.b)},${a})`;
};
/** Perceptual colours that stay visible on the dark figure ground. */
export const viridisLit = (t: number) => interpolateViridis(0.12 + 0.88 * clamp(t));
export const infernoLit = (t: number) => interpolateInferno(0.3 + 0.67 * clamp(t));

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
  /** States that animate continuously (physical motion). */
  loop?: readonly string[];
  /** Seconds of timed animation after entering a state. */
  anim?: Record<string, number>;
  draw(g: G, s: FrameState, P: P, env: Env): void;
}

/** Canvas2D scene driven by named states with eased numeric parameters (cross-fades) and a per-state clock. */
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
      cur[k] = approach(cur[k], tgt[k], dt, cfg.tau ?? 0.4) as P[keyof P];
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

/** Off-screen layer composited with an alpha (plot() sets its own alphas, so fade the whole layer). */
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

export function txt(
  g: G,
  s: string,
  x: number,
  y: number,
  o: { mono?: boolean; align?: CanvasTextAlign; base?: CanvasTextBaseline; alpha?: number; color?: string; bold?: boolean } = {},
) {
  g.save();
  g.font = (o.bold ? '600 ' : '') + (o.mono ? FONT_MONO : FONT_SANS);
  g.textAlign = o.align ?? 'left';
  g.textBaseline = o.base ?? 'middle';
  g.globalAlpha = o.alpha ?? 0.85;
  g.fillStyle = o.color ?? fgColor;
  const cw = g.canvas.width / dprCap();
  const tw = g.measureText(s).width;
  const al = o.align ?? 'left';
  const left = al === 'left' ? x : al === 'center' ? x - tw / 2 : x - tw;
  if (left + tw > cw - 6) x -= left + tw - (cw - 6);
  if (left < 6 && x - left + 6 + tw < cw) x += 6 - left;
  g.fillText(s, x, y);
  g.restore();
}

/** Word-wrapped text block; returns the y after the last line. */
export function para(g: G, s: string, x: number, y: number, maxW: number, o: { lh?: number; alpha?: number; color?: string; align?: CanvasTextAlign } = {}) {
  g.save();
  g.font = FONT_SANS;
  const words = s.split(' ');
  let line = '';
  let yy = y;
  const lh = o.lh ?? 16;
  const lines: string[] = [];
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  lines.push(line);
  g.textAlign = o.align ?? 'left';
  g.textBaseline = 'middle';
  g.fillStyle = o.color ?? fgColor;
  g.globalAlpha = o.alpha ?? 0.85;
  for (const l of lines) {
    g.fillText(l, x, yy);
    yy += lh;
  }
  g.restore();
  return yy;
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

/** Photon: a sinusoidal line from (x0,y0) toward (x1,y1); `frac` draws only the first fraction. wl = wavelength in px. */
export function wavy(g: G, x0: number, y0: number, x1: number, y1: number, o: { color: string; wl?: number; amp?: number; alpha?: number; width?: number; frac?: number }) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const f = o.frac ?? 1;
  if (len < 1 || f <= 0) return;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const wl = o.wl ?? 12;
  const amp = o.amp ?? 3.5;
  g.save();
  g.strokeStyle = o.color;
  g.globalAlpha = o.alpha ?? 1;
  g.lineWidth = o.width ?? 1.25;
  g.beginPath();
  const n = Math.max(2, Math.ceil((len * f) / 1.5));
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * len * f;
    const off = amp * Math.sin((2 * Math.PI * s) / wl);
    const px = x0 + ux * s - uy * off;
    const py = y0 + uy * s + ux * off;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.stroke();
  g.restore();
}

export function dot(g: G, x: number, y: number, r: number, color: string, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
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

/** Additive soft disc: light emission (scintillation / Cherenkov / a flash on a screen). */
export function glow(g: G, x: number, y: number, r: number, color: string, alpha: number) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(color, alpha));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Circle of a magnetic-field marker: out of the page (dot) or into it (cross). */
export function fieldMark(g: G, x: number, y: number, out: boolean, color: string, alpha = 0.7) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, 6, 0, Math.PI * 2);
  g.stroke();
  if (out) {
    g.beginPath();
    g.arc(x, y, 1.6, 0, Math.PI * 2);
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(x - 3.2, y - 3.2);
    g.lineTo(x + 3.2, y + 3.2);
    g.moveTo(x + 3.2, y - 3.2);
    g.lineTo(x - 3.2, y + 3.2);
    g.stroke();
  }
  g.restore();
}

/** Sample a circular arc starting at (x,y) heading `ang` (screen angle, y down) with signed radius R (+ = turns clockwise on screen). */
export function arcPoints(x: number, y: number, ang: number, R: number, len: number, step = 1): [number, number][] {
  const pts: [number, number][] = [[x, y]];
  const n = Math.max(1, Math.ceil(len / step));
  const ds = len / n;
  let px = x;
  let py = y;
  let a = ang;
  for (let i = 0; i < n; i++) {
    a += ds / R;
    px += Math.cos(a) * ds;
    py += Math.sin(a) * ds;
    pts.push([px, py]);
  }
  return pts;
}

export function poly(g: G, pts: [number, number][], color: string, alpha = 1, width = 1.25, dash: number[] = []) {
  if (pts.length < 2) return;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.setLineDash(dash);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.restore();
}

/** Deterministic hash → [0,1) for stateless per-index randomness. */
export const hash01 = (n: number) => {
  let t = (Math.imul(n | 0, 0x9e3779b1) + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

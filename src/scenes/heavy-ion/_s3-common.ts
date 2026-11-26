/**
 * Private helpers for bundle S3 (hi.flow, hi.jet, hi.quarkonium, hi.thermometers, hi.bes-signals).
 * Not a scene (leading underscore). No window/document access at module top level.
 */
import { interpolateInferno } from 'd3-scale-chromatic';
import type { SceneContext, SceneInstance, SetStateOptions } from '../shared/types';
import { approach, createCanvas2D, type Canvas2D, type FrameState } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS, type Rect } from '../shared/plot';
import { dprCap } from '../../lib/device';

export type G = CanvasRenderingContext2D;
let fgColor = '#ffffff';
export { interpolateInferno };

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
  /** Numeric parameters per state; they ease toward these (approach). */
  targets: Record<string, P>;
  /** Time constant for the easing (s). */
  tau?: number;
  /** States that animate continuously (physical motion). */
  loop?: readonly string[];
  /** Seconds of timed animation after entering a state (keeps the loop alive). */
  anim?: Record<string, number>;
  draw(g: G, s: FrameState, P: P, env: Env): void;
}

/** Canvas2D scene driven by named states with eased numeric parameters. */
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

/** Off-screen layer that is composited with an alpha (plot() fixes its own alphas, so fade the whole layer). */
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

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

/** Figure area split into a drawing panel and a plot area. L = 0: drawing fills everything; L = 1: drawing shrunk beside/above the plot. */
export function splitLayout(w: number, h: number, L: number) {
  const wide = w >= 560 && w > h * 1.05;
  const full: Rect = { x: 0, y: 0, w, h };
  const small: Rect = wide ? { x: 0, y: 0, w: w * 0.4, h } : { x: 0, y: 0, w, h: h * 0.42 };
  const plotR: Rect = wide
    ? { x: w * 0.4 + 52, y: 40, w: w * 0.6 - 52 - 40, h: h - 40 - 56 }
    : { x: 52, y: h * 0.42 + 32, w: w - 52 - 30, h: h * 0.58 - 32 - 54 };
  return { wide, panel: lerpRect(full, small, L), plotR };
}

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

/** Radius (in nuclear radii) of the overlap lens boundary of two unit discs at separation b, in direction angle phi. */
export function lensRadius(b: number, phi: number): number {
  const c = Math.cos(phi);
  return (-Math.abs(b * c) + Math.sqrt(b * b * c * c - b * b + 4)) / 2;
}

/** Participant-like density of the overlap of two hard spheres (product of the two thickness functions), 0..1. */
export function lensDensity(b: number, x: number, y: number): number {
  const T = (px: number) => Math.sqrt(Math.max(0, 1 - px * px - y * y));
  const peak = Math.sqrt(Math.max(1e-9, 1 - (b / 2) ** 2));
  return (T(x + b / 2) * T(x - b / 2)) / (peak * peak);
}

function rgbOf(c: string): [number, number, number] {
  if (c.startsWith('#')) return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const m = c.match(/\d+/g) ?? ['0', '0', '0'];
  return [+m[0], +m[1], +m[2]];
}
const lensCache = new Map<number, HTMLCanvasElement>();
/** Pre-rendered overlap density, world square [-1,1]^2, inferno colours, alpha ∝ density. */
export function lensImage(b: number): HTMLCanvasElement {
  const key = Math.round(b * 1000);
  const hit = lensCache.get(key);
  if (hit) return hit;
  const N = 160;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = ((i + 0.5) / N) * 2 - 1;
      const y = 1 - ((j + 0.5) / N) * 2;
      const d = Math.min(1, lensDensity(b, x, y));
      const k = (j * N + i) * 4;
      if (d <= 0) continue;
      const col = rgbOf(interpolateInferno(0.1 + 0.62 * Math.pow(d, 0.7)));
      img.data[k] = col[0];
      img.data[k + 1] = col[1];
      img.data[k + 2] = col[2];
      img.data[k + 3] = 255 * Math.min(1, d * 3.2);
    }
  }
  g.putImageData(img, 0, 0);
  lensCache.set(key, cv);
  return cv;
}

export function drawLens(g: G, b: number, cx: number, cy: number, S: number, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.imageSmoothingEnabled = true;
  g.drawImage(lensImage(b), cx - S, cy - S, 2 * S, 2 * S);
  g.restore();
}

/** Hot disc with an inferno radial temperature profile (hot centre, cool rim). */
export function drawFireball(g: G, cx: number, cy: number, R: number, alpha = 1, hot = 0.78) {
  g.save();
  g.globalAlpha = alpha;
  const steps = 24;
  for (let i = steps; i >= 1; i--) {
    const u = i / steps;
    const T = hot * (1 - u * u) + 0.1;
    g.fillStyle = interpolateInferno(Math.max(0.05, T));
    g.beginPath();
    g.arc(cx, cy, R * u, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

export const gauss = (x: number, c: number, w: number) => Math.exp(-((x - c) ** 2) / (2 * w * w));
export const FG = '#ffffff';
export { FONT_MONO, FONT_SANS };

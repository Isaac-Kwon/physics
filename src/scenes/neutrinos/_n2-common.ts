/**
 * Private helpers for bundle N2 (nu.radiochem, nu.water-cherenkov, nu.ibd, nu.lartpc, nu.neutrino-telescope, nu.cevns,
 * nu.frontier, nu.dbd-spectrum). Not a scene (leading underscore). No window/document access at module top level.
 */
import { interpolateInferno, interpolateViridis } from 'd3-scale-chromatic';
import type { SceneContext, SceneInstance, SetStateOptions } from '../shared/types';
import { approach, createCanvas2D, type Canvas2D, type FrameState } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS } from '../shared/plot';

export { interpolateInferno, interpolateViridis };
export { arrow, dot, line, ring, txt, rect } from '../common/_draw';
export type G = CanvasRenderingContext2D;

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
  /** Seconds of timed animation after entering a state. */
  anim?: Record<string, number>;
  draw(g: G, s: FrameState, P: P, env: Env): void;
}

/** Canvas2D scene driven by named states with eased numeric levels. */
export function createStage<P extends Record<string, number>>(ctx: SceneContext, cfg: StageConfig<P>): SceneInstance & { c: Canvas2D } {
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

/** Additive soft light spot (scintillation / Cherenkov emission only). */
export function glow(g: G, x: number, y: number, r: number, color: string, a: number) {
  if (a <= 0.005 || r <= 0.5) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(1, a);
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Additive thin line (a light ray). */
export function ray(g: G, x0: number, y0: number, x1: number, y1: number, color: string, a: number, w = 1) {
  if (a <= 0.005) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(1, a);
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.restore();
}

/** Dimension line with end ticks and a centred label above it. */
export function dim(g: G, x0: number, y0: number, x1: number, y1: number, label: string, color: string, alpha = 0.7, mono = true, off = 8) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
  const tx = Math.cos(a) * 4;
  const ty = Math.sin(a) * 4;
  g.moveTo(x0 - tx, y0 - ty);
  g.lineTo(x0 + tx, y0 + ty);
  g.moveTo(x1 - tx, y1 - ty);
  g.lineTo(x1 + tx, y1 + ty);
  g.stroke();
  g.font = mono ? FONT_MONO : FONT_SANS;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const horizontal = Math.abs(y1 - y0) < Math.abs(x1 - x0);
  if (horizontal) g.fillText(label, (x0 + x1) / 2, (y0 + y1) / 2 - off - 2);
  else {
    g.textAlign = 'right';
    g.fillText(label, (x0 + x1) / 2 - off, (y0 + y1) / 2);
  }
  g.restore();
}

export const flavourColor = (i: 0 | 1 | 2) => interpolateViridis([0.15, 0.5, 0.85][i]);

/** Text width in px for the figure fonts. */
export function tw(g: G, s: string, mono = false) {
  g.save();
  g.font = mono ? FONT_MONO : FONT_SANS;
  const w = g.measureText(s).width;
  g.restore();
  return w;
}

/** Filled polygon / path stroke helper from points. */
export function poly(g: G, pts: [number, number][], color: string, w = 1, alpha = 1, close = false, fill = 0) {
  if (pts.length < 2) return;
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = w;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (close) g.closePath();
  if (fill > 0) {
    g.globalAlpha = fill;
    g.fill();
  }
  if (alpha > 0.005) {
    g.globalAlpha = alpha;
    g.stroke();
  }
  g.restore();
}


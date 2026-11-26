/**
 * Private helpers for bundle SC3 (sc.lab-pipeline, sc.iv-curve, sc.testbeam, sc.radiation-damage, sc.its3, sc.its3-bending,
 * sc.walkthrough-its3-heavyflavour, sc.cbm-silicon, sc.future). Not a scene (leading underscore).
 * No window/document access at module top level.
 */
import type { SceneContext, SceneInstance, SetStateOptions } from '../shared/types';
import { approach, createCanvas2D, type Canvas2D, type FrameState } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS } from '../shared/plot';
import { dprCap } from '../../lib/device';

export type G = CanvasRenderingContext2D;
export { FONT_MONO, FONT_SANS };

/** What a per-state draw function receives. */
export interface Fr {
  w: number;
  h: number;
  /** Scene clock (s), frozen under reduced motion. */
  t: number;
  /** Seconds since this state was entered (1e3 = "final frame"). */
  ts: number;
  /** Scrub progress of this state: 1 for states already passed, 0 for states ahead, the scroll progress for the current one. */
  p: number;
  reduced: boolean;
}
export type DrawFn = (g: G, f: Fr) => void;

export interface FadeCfg {
  states: readonly string[];
  draws: Record<string, DrawFn>;
  /** States that animate continuously (physical motion). */
  loop?: readonly string[];
  /** Seconds a state keeps animating after entry (timed animations). Default 3. */
  anim?: number;
  /** Seconds for the cross-fade between states. */
  tau?: number;
}

let fgColor = '#ffffff';

/** Canvas2D scene whose states are separate draw functions that cross-fade (via off-screen layers). */
export function fadeStage(ctx: SceneContext, cfg: FadeCfg): SceneInstance {
  fgColor = ctx.theme.fg;
  const n = cfg.states.length;
  const wt = cfg.states.map((_, i) => (i === 0 ? 1 : 0));
  const ts = cfg.states.map(() => (ctx.reducedMotion ? 1e3 : 0));
  const layers: (HTMLCanvasElement | null)[] = cfg.states.map(() => null);
  let cur = 0;
  let prog = 1;
  let fresh = false;

  const c: Canvas2D = createCanvas2D(ctx, (g, s: FrameState) => {
    const dt = s.dt > 0 ? s.dt : fresh ? 1 / 60 : 0;
    fresh = false;
    let settled = true;
    for (let i = 0; i < n; i++) {
      const tgt = i === cur ? 1 : 0;
      wt[i] = approach(wt[i], tgt, dt, cfg.tau ?? 0.3);
      if (Math.abs(wt[i] - tgt) > 1e-3) settled = false;
      else wt[i] = tgt;
      ts[i] = dt === 0 ? 1e3 : wt[i] > 0.004 ? ts[i] + dt : ts[i];
    }
    const visible = wt.map((x, i) => (x > 0.004 ? i : -1)).filter((i) => i >= 0);
    const frame = (i: number): Fr => ({
      w: s.w,
      h: s.h,
      t: s.t,
      ts: ts[i],
      p: i < cur ? 1 : i > cur ? 0 : prog,
      reduced: ctx.reducedMotion,
    });
    if (visible.length === 1 && wt[visible[0]] === 1) {
      cfg.draws[cfg.states[visible[0]]](g, frame(visible[0]));
    } else {
      const dpr = dprCap();
      for (const i of visible) {
        const cv = (layers[i] ??= document.createElement('canvas'));
        const W = Math.round(s.w * dpr);
        const H = Math.round(s.h * dpr);
        if (cv.width !== W || cv.height !== H) {
          cv.width = W;
          cv.height = H;
        }
        const g2 = cv.getContext('2d')!;
        g2.setTransform(dpr, 0, 0, dpr, 0, 0);
        g2.clearRect(0, 0, s.w, s.h);
        cfg.draws[cfg.states[i]](g2, frame(i));
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = Math.min(1, wt[i]);
        g.drawImage(cv, 0, 0);
        g.restore();
      }
    }
    const loops = cfg.loop?.includes(cfg.states[cur]) ?? false;
    c.animate = !settled || loops || ts[cur] < (cfg.anim ?? 3);
  });

  return {
    setState(st: string, opts: SetStateOptions) {
      const i = cfg.states.indexOf(st);
      if (i < 0) return;
      const changed = i !== cur;
      cur = i;
      if (opts.immediate || ctx.reducedMotion) {
        for (let k = 0; k < n; k++) {
          wt[k] = k === i ? 1 : 0;
          ts[k] = 1e3;
        }
        c.animate = false;
      } else {
        if (changed) ts[i] = 0;
        fresh = true;
        c.animate = true;
      }
      c.invalidate();
    },
    setProgress(p: number) {
      prog = Math.min(1, Math.max(0, p));
      c.invalidate();
    },
    resize: c.resize,
    setActive: c.setActive,
    dispose: c.dispose,
  };
}

// ---------------------------------------------------------------- drawing helpers

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

/** Text width in the figure fonts (for fitting labels). */
export function tw(g: G, s: string, mono = false) {
  g.save();
  g.font = mono ? FONT_MONO : FONT_SANS;
  const w = g.measureText(s).width;
  g.restore();
  return w;
}

export function ln(g: G, x0: number, y0: number, x1: number, y1: number, o: { color?: string; width?: number; alpha?: number; dash?: number[] } = {}) {
  g.save();
  g.strokeStyle = o.color ?? fgColor;
  g.lineWidth = o.width ?? 1;
  g.globalAlpha = o.alpha ?? 0.5;
  g.setLineDash(o.dash ?? []);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.restore();
}

export function poly(g: G, pts: [number, number][], o: { color?: string; width?: number; alpha?: number; dash?: number[]; fill?: string; fillAlpha?: number; close?: boolean } = {}) {
  g.save();
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (o.close) g.closePath();
  if (o.fill) {
    g.globalAlpha = o.fillAlpha ?? 0.15;
    g.fillStyle = o.fill;
    g.fill();
  }
  if (o.color || !o.fill) {
    g.globalAlpha = o.alpha ?? 0.6;
    g.strokeStyle = o.color ?? fgColor;
    g.lineWidth = o.width ?? 1;
    g.setLineDash(o.dash ?? []);
    g.stroke();
  }
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

/** Open ring (holes, predicted points, vacancies). */
export function ring(g: G, x: number, y: number, r: number, color: string, alpha = 1, width = 1.25) {
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

export function rect(g: G, x: number, y: number, w: number, h: number, o: { fill?: string; fillAlpha?: number; stroke?: string; alpha?: number; width?: number; dash?: number[] } = {}) {
  g.save();
  if (o.fill) {
    g.globalAlpha = o.fillAlpha ?? 0.12;
    g.fillStyle = o.fill;
    g.fillRect(x, y, w, h);
  }
  if (o.stroke) {
    g.globalAlpha = o.alpha ?? 0.5;
    g.strokeStyle = o.stroke;
    g.lineWidth = o.width ?? 1;
    g.setLineDash(o.dash ?? []);
    g.strokeRect(x + 0.5, y + 0.5, w, h);
  }
  g.restore();
}

export function arrow(g: G, x0: number, y0: number, x1: number, y1: number, o: { color?: string; width?: number; alpha?: number; head?: number; dash?: number[] } = {}) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const hd = Math.min(o.head ?? 6, len * 0.6);
  g.save();
  g.globalAlpha = o.alpha ?? 0.8;
  g.strokeStyle = o.color ?? fgColor;
  g.fillStyle = o.color ?? fgColor;
  g.lineWidth = o.width ?? 1;
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

/** Dimension line with end ticks and a centred label (above by default). */
export function dim(g: G, x0: number, y0: number, x1: number, y1: number, label: string, o: { mono?: boolean; off?: number; alpha?: number; color?: string } = {}) {
  const a = o.alpha ?? 0.7;
  const col = o.color ?? fgColor;
  ln(g, x0, y0, x1, y1, { alpha: a, color: col });
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  for (const [x, y] of [[x0, y0], [x1, y1]]) ln(g, x - nx * 4, y - ny * 4, x + nx * 4, y + ny * 4, { alpha: a, color: col });
  const off = o.off ?? -12;
  txt(g, label, (x0 + x1) / 2 + nx * off, (y0 + y1) / 2 + ny * off, { align: 'center', mono: o.mono ?? true, alpha: a + 0.1, color: col });
}

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** Segment of a 0..1 progress: 0 before `a`, 1 after `b`. */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const ease = (t: number) => t * t * (3 - 2 * t);

/** Silicon slab (cross-section). */
export function slab(g: G, x: number, y: number, w: number, h: number, color: string, alpha = 0.12) {
  rect(g, x, y, w, h, { fill: color, fillAlpha: alpha, stroke: color, alpha: 0.55 });
}

/** Hatching inside a rectangle (carbon foam, supports). */
export function hatch(g: G, x: number, y: number, w: number, h: number, color: string, gap = 5, alpha = 0.35) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineWidth = 1;
  g.beginPath();
  for (let k = -h; k < w; k += gap) {
    g.moveTo(x + k, y + h);
    g.lineTo(x + k + h, y);
  }
  g.stroke();
  g.restore();
}

/** Superscript digits for exponents in mono labels. */
export const sup = (n: number) => String(n).replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
/** "3.2 × 10¹⁴" */
export function sci(v: number, digits = 1): string {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  return `${m.toFixed(digits)} × 10${sup(e)}`;
}

// ---------------------------------------------------------------- shared physics (display model, indicative)

/** Radiation length of silicon in mm (9.37 cm). */
export const X0_SI_MM = 93.7;
/** Highland: θ0 (rad) for momentum p (GeV/c), β = 1, thickness fraction x/X0. */
export const theta0 = (p: number, xX0: number) => (0.0136 / p) * Math.sqrt(xX0);

export interface Geom {
  /** Beam-pipe radius (mm) and its material (fraction of X0). */
  rPipe: number;
  xPipe: number;
  /** Silicon layer radii (mm) and material per layer (fraction of X0). */
  r: number[];
  x: number;
}
/** ITS2 inner barrel (Run 3) and ITS3 (design values as of 2025). Beam-pipe numbers are indicative. */
export const ITS2: Geom = { rPipe: 18.2, xPipe: 0.0023, r: [22.4, 30.1, 37.8], x: 0.0035 };
export const ITS3: Geom = { rPipe: 16, xPipe: 0.0014, r: [19, 25, 31], x: 0.0007 };
/** Intrinsic hit resolution (µm) used by the display model. */
export const SIGMA_HIT = 5;

/** Variance factor of a straight-line fit through the layers, evaluated at radius x: σ²·(1/n + (x − r̄)²/Sxx). */
export function fitVarFactor(r: number[], x: number) {
  const n = r.length;
  const m = r.reduce((a, b) => a + b, 0) / n;
  const sxx = r.reduce((a, b) => a + (b - m) ** 2, 0);
  return 1 / n + (x - m) ** 2 / sxx;
}
/** Hit-resolution part of the extrapolation error at radius x (µm). */
export const sigmaHit = (gm: Geom, x: number) => SIGMA_HIT * Math.sqrt(fitVarFactor(gm.r, x));
/** Scattering part (µm) at radius x for momentum p: kinks in the first layer and in the beam pipe. */
export function sigmaMs(gm: Geom, x: number, p: number) {
  const a = Math.max(0, gm.r[0] - x) * theta0(p, gm.x);
  const b = Math.max(0, gm.rPipe - x) * theta0(p, gm.xPipe);
  return Math.hypot(a, b) * 1000;
}
/** Impact-parameter resolution (µm) at the vertex for momentum p (GeV/c). */
export const sigmaD0 = (gm: Geom, p: number) => Math.hypot(sigmaHit(gm, 0), sigmaMs(gm, 0, p));

/** Side-by-side layout only for landscape stages (the in-page stage is portrait on narrow viewports). */
export const wideOf = (f: { w: number; h: number }) => f.w >= 640 && f.w > f.h * 1.1;

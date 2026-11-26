/**
 * Schematic plot helper for Canvas2D scenes (PLAN §3.4 P8, §4.5: shapes from textbook formulas, never real data points).
 *
 *   const p = plot(g, ctx, { x: 48, y: 16, w: 400, h: 260 },
 *                 { min: 0, max: 5, label: 'p_T (GeV/c)' },
 *                 { min: 0, max: 0.25, label: 'v₂' });
 *   p.axes();                                  // frame, ticks, axis labels
 *   p.curve((x) => f(x), { color: ctx.theme.accent, progress: 0.7 });   // draws the first 70 % of the curve
 *   p.text(2.5, 0.2, 'π'); p.hline(1, { dash: [4, 4] });
 *
 * Axis labels/ticks use the mono face for numbers and the sans face for words; colours come from ctx.theme.
 */
import type { SceneContext } from './types';

export interface AxisSpec {
  min: number;
  max: number;
  label?: string;
  log?: boolean;
  /** Explicit ticks; default: 5 linear ticks or one per decade on log axes. Pass [] for none. */
  ticks?: { v: number; label?: string }[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LineStyle {
  color?: string;
  width?: number;
  dash?: number[];
  alpha?: number;
  /** 0–1: draw only the first fraction of the curve (for progressive reveal). */
  progress?: number;
}

export const FONT_SANS = "12px 'Pretendard Variable', 'Inter Variable', system-ui, sans-serif";
export const FONT_MONO = "11px 'JetBrains Mono Variable', ui-monospace, monospace";

export function plot(g: CanvasRenderingContext2D, ctx: SceneContext, r: Rect, xa: AxisSpec, ya: AxisSpec) {
  const map = (a: AxisSpec, v: number, lo: number, len: number, flip: boolean) => {
    const f = a.log ? (Math.log10(v) - Math.log10(a.min)) / (Math.log10(a.max) - Math.log10(a.min)) : (v - a.min) / (a.max - a.min);
    return flip ? lo + len - f * len : lo + f * len;
  };
  const X = (v: number) => map(xa, v, r.x, r.w, false);
  const Y = (v: number) => map(ya, v, r.y, r.h, true);
  const fmt = (v: number) => ctx.formatNumber(v, { maximumSignificantDigits: 3 });
  const sup = (n: number) => String(n).replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);

  const defaultTicks = (a: AxisSpec) => {
    if (a.ticks) return a.ticks;
    if (a.log) {
      const out = [];
      for (let e = Math.ceil(Math.log10(a.min)); e <= Math.floor(Math.log10(a.max)); e++) out.push({ v: 10 ** e, label: `10${sup(e)}` });
      return out;
    }
    return Array.from({ length: 5 }, (_, i) => {
      const v = a.min + ((a.max - a.min) * i) / 4;
      return { v, label: fmt(v) };
    });
  };

  const stroke = (s: LineStyle = {}) => {
    g.strokeStyle = s.color ?? ctx.theme.fg;
    g.lineWidth = s.width ?? 1.5;
    g.globalAlpha = s.alpha ?? 1;
    g.setLineDash(s.dash ?? []);
  };
  const reset = () => {
    g.globalAlpha = 1;
    g.setLineDash([]);
  };

  return {
    X,
    Y,
    rect: r,
    /** Frame (left + bottom axis lines), ticks and axis labels. */
    axes() {
      g.save();
      g.strokeStyle = ctx.theme.fg;
      g.globalAlpha = 0.45;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(r.x, r.y);
      g.lineTo(r.x, r.y + r.h);
      g.lineTo(r.x + r.w, r.y + r.h);
      g.stroke();
      g.globalAlpha = 0.6;
      g.fillStyle = ctx.theme.fg;
      g.font = FONT_MONO;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      for (const t of defaultTicks(xa)) {
        const x = X(t.v);
        g.beginPath();
        g.moveTo(x, r.y + r.h);
        g.lineTo(x, r.y + r.h + 4);
        g.stroke();
        if (t.label) g.fillText(t.label, x, r.y + r.h + 6);
      }
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      for (const t of defaultTicks(ya)) {
        const y = Y(t.v);
        g.beginPath();
        g.moveTo(r.x - 4, y);
        g.lineTo(r.x, y);
        g.stroke();
        if (t.label) g.fillText(t.label, r.x - 7, y);
      }
      g.globalAlpha = 0.85;
      g.font = FONT_SANS;
      if (xa.label) {
        g.textAlign = 'right';
        g.textBaseline = 'top';
        g.fillText(xa.label, r.x + r.w, r.y + r.h + 22);
      }
      if (ya.label) {
        g.textAlign = 'left';
        g.textBaseline = 'bottom';
        g.fillText(ya.label, r.x + 4, r.y - 6);
      }
      g.restore();
    },
    /** y = f(x) sampled across the x range. */
    curve(f: (x: number) => number, s: LineStyle = {}, samples = 200) {
      const p = s.progress ?? 1;
      if (p <= 0) return;
      stroke(s);
      g.beginPath();
      const n = Math.max(2, Math.round(samples * p));
      for (let i = 0; i <= n; i++) {
        const u = (i / samples) * 1;
        const xv = xa.log ? xa.min * (xa.max / xa.min) ** u : xa.min + (xa.max - xa.min) * u;
        const yv = f(xv);
        if (!Number.isFinite(yv)) continue;
        const py = Math.min(r.y + r.h, Math.max(r.y, Y(yv)));
        if (i === 0) g.moveTo(X(xv), py);
        else g.lineTo(X(xv), py);
      }
      g.stroke();
      reset();
    },
    /** Polyline through data-space points. */
    path(points: [number, number][], s: LineStyle = {}) {
      stroke(s);
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
      g.stroke();
      reset();
    },
    /** Shaded band between lo(x) and hi(x). */
    band(lo: (x: number) => number, hi: (x: number) => number, color: string, alpha = 0.18, samples = 120) {
      g.save();
      g.globalAlpha = alpha;
      g.fillStyle = color;
      g.beginPath();
      for (let i = 0; i <= samples; i++) {
        const xv = xa.min + ((xa.max - xa.min) * i) / samples;
        i ? g.lineTo(X(xv), Y(hi(xv))) : g.moveTo(X(xv), Y(hi(xv)));
      }
      for (let i = samples; i >= 0; i--) {
        const xv = xa.min + ((xa.max - xa.min) * i) / samples;
        g.lineTo(X(xv), Y(lo(xv)));
      }
      g.closePath();
      g.fill();
      g.restore();
    },
    hline(v: number, s: LineStyle = {}) {
      stroke({ alpha: 0.5, width: 1, ...s });
      g.beginPath();
      g.moveTo(r.x, Y(v));
      g.lineTo(r.x + r.w, Y(v));
      g.stroke();
      reset();
    },
    vline(v: number, s: LineStyle = {}) {
      stroke({ alpha: 0.5, width: 1, ...s });
      g.beginPath();
      g.moveTo(X(v), r.y);
      g.lineTo(X(v), r.y + r.h);
      g.stroke();
      reset();
    },
    /** Label at data coordinates. */
    text(x: number, y: number, label: string, opts: { color?: string; align?: CanvasTextAlign; mono?: boolean; alpha?: number } = {}) {
      g.save();
      g.font = opts.mono ? FONT_MONO : FONT_SANS;
      g.fillStyle = opts.color ?? ctx.theme.fg;
      g.globalAlpha = opts.alpha ?? 0.9;
      g.textAlign = opts.align ?? 'left';
      g.textBaseline = 'middle';
      g.fillText(label, X(x), Y(y));
      g.restore();
    },
    dot(x: number, y: number, radius = 3, color?: string) {
      g.save();
      g.fillStyle = color ?? ctx.theme.accent;
      g.beginPath();
      g.arc(X(x), Y(y), radius, 0, Math.PI * 2);
      g.fill();
      g.restore();
    },
  };
}

/** Inner plot rectangle with room for ticks/labels, inside a w×h canvas. */
export function plotRect(w: number, h: number, pad = { l: 56, r: 20, t: 28, b: 44 }): Rect {
  return { x: pad.l, y: pad.t, w: Math.max(10, w - pad.l - pad.r), h: Math.max(10, h - pad.t - pad.b) };
}

/**
 * Private helpers for bundle SC2 (sc.charge-sharing, sc.strip, sc.walkthrough-*, sc.zoo-more).
 * Not a scene (leading underscore). No window/document access at module top level.
 */
import type { SceneContext } from '../shared/types';
import type { Rect } from '../shared/plot';
import { interpolateInferno, createStage, txt, arrow, makeLayer, FONT_MONO, FONT_SANS, type G, type Env } from '../heavy-ion/_s3-common';

export { interpolateInferno, createStage, txt, arrow, makeLayer, FONT_MONO, FONT_SANS };
export type { G, Env, Rect };

const SUP = '⁻⁰¹²³⁴⁵⁶⁷⁸⁹';
export const sup = (n: number) => String(n).replace(/[-0-9]/g, (c) => SUP['-0123456789'.indexOf(c)]);
/** "3.4×10⁵" */
export const sci = (v: number, digits = 2) => {
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  return `${m.toFixed(digits - 1)}×10${sup(e)}`;
};

/** Standard normal CDF. */
export function Phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function box(g: G, x: number, y: number, w: number, h: number, o: { fill?: string; stroke?: string; alpha?: number; lw?: number; dash?: number[]; fa?: number } = {}) {
  g.save();
  if (o.fill) {
    g.globalAlpha = (o.alpha ?? 1) * (o.fa ?? 1);
    g.fillStyle = o.fill;
    g.fillRect(x, y, w, h);
  }
  if (o.stroke) {
    g.globalAlpha = o.alpha ?? 1;
    g.strokeStyle = o.stroke;
    g.lineWidth = o.lw ?? 1;
    g.setLineDash(o.dash ?? []);
    g.strokeRect(x, y, w, h);
  }
  g.restore();
}

export function line(g: G, x0: number, y0: number, x1: number, y1: number, color: string, o: { lw?: number; alpha?: number; dash?: number[] } = {}) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = o.lw ?? 1;
  g.globalAlpha = o.alpha ?? 1;
  g.setLineDash(o.dash ?? []);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
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
    g.lineWidth = 1;
    g.stroke();
  } else {
    g.fillStyle = color;
    g.fill();
  }
  g.restore();
}

/** Text on a background-coloured plate (keeps labels readable over lines). */
export function plate(g: G, bg: string, s: string, x: number, y: number, o: { mono?: boolean; align?: CanvasTextAlign; alpha?: number; color?: string } = {}) {
  g.save();
  g.font = o.mono ? FONT_MONO : FONT_SANS;
  const w = g.measureText(s).width;
  const al = o.align ?? 'left';
  const x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
  g.globalAlpha = 0.78 * (o.alpha ?? 1);
  g.fillStyle = bg;
  g.fillRect(x0 - 3, y - 8, w + 6, 16);
  g.restore();
  txt(g, s, x, y, o);
}

/** Vertical dimension line (ticks at both ends) with a mono label beside it. */
export function dimV(g: G, x: number, y0: number, y1: number, label: string, color: string, o: { side?: 1 | -1; alpha?: number } = {}) {
  const side = o.side ?? -1;
  const a = o.alpha ?? 0.8;
  line(g, x, y0, x, y1, color, { alpha: a });
  line(g, x - 4, y0, x + 4, y0, color, { alpha: a });
  line(g, x - 4, y1, x + 4, y1, color, { alpha: a });
  txt(g, label, x + side * 8, (y0 + y1) / 2, { mono: true, align: side < 0 ? 'right' : 'left', alpha: a });
}

/** Horizontal dimension line with a mono label above or below. */
export function dimH(g: G, x0: number, x1: number, y: number, label: string, color: string, o: { below?: boolean; alpha?: number } = {}) {
  const a = o.alpha ?? 0.8;
  line(g, x0, y, x1, y, color, { alpha: a });
  line(g, x0, y - 4, x0, y + 4, color, { alpha: a });
  line(g, x1, y - 4, x1, y + 4, color, { alpha: a });
  txt(g, label, (x0 + x1) / 2, y + (o.below === false ? -11 : 12), { mono: true, align: 'center', alpha: a });
}

/** Main drawing area + auxiliary area (side by side on wide figures, stacked on narrow ones). */
export function dualLayout(w: number, h: number, mainFrac = 0.58): { wide: boolean; main: Rect; aux: Rect } {
  const wide = w >= 560 && w > h * 1.05;
  if (wide) {
    const mw = w * mainFrac;
    return { wide, main: { x: 14, y: 14, w: mw - 14, h: h - 28 }, aux: { x: mw + 18, y: 14, w: w - mw - 18 - 14, h: h - 28 } };
  }
  const mh = h * 0.56;
  return { wide, main: { x: 10, y: 10, w: w - 20, h: mh - 10 }, aux: { x: 10, y: mh + 10, w: w - 20, h: h - mh - 20 } };
}

export const ctxKit = (ctx: SceneContext) => ({
  L: (k: string) => ctx.label(k),
  F: (v: number, o?: Intl.NumberFormatOptions) => ctx.formatNumber(v, o),
  ...ctx.theme,
});

/** Shared helpers for bundle DM2 scenes (private, not registered). */
import { clamp, approach } from '../shared/canvas2d';
import { FONT_SANS } from '../shared/plot';

/** Pale violet-white used for scintillation light (additive). */
export const PALE = '216,210,255';

/** Additive radial glow: scintillation light only. */
export function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
  if (alpha <= 0.01 || r <= 0.5) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${PALE},${clamp(alpha)})`);
  gr.addColorStop(1, `rgba(${PALE},0)`);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Move every level toward its target (dt = 0 snaps). */
export function stepLevels(lv: Record<string, number>, tg: Record<string, number>, dt: number, tau = 0.45) {
  for (const k of Object.keys(tg)) lv[k] = approach(lv[k] ?? 0, tg[k], dt, tau);
}

/** Word-wrapped text (sans 12 px); returns the y after the last line. */
export function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, color: string, alpha = 0.85, lh = 16, align: CanvasTextAlign = 'left'): number {
  g.save();
  g.font = FONT_SANS;
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.textAlign = align;
  g.textBaseline = 'top';
  const words = text.split(' ');
  let ln = '';
  let yy = y;
  for (const w of words) {
    const t = ln ? ln + ' ' + w : w;
    if (g.measureText(t).width > maxW && ln) {
      g.fillText(ln, x, yy);
      yy += lh;
      ln = w;
    } else ln = t;
  }
  if (ln) {
    g.fillText(ln, x, yy);
    yy += lh;
  }
  g.restore();
  return yy;
}

/** Looping phase p in [0,1] for a state animation: plays over `dur` seconds, holds, repeats. Reduced motion: end frame. */
export function loopPhase(ts: number, dur: number, hold: number, reduced: boolean): number {
  if (reduced) return 1;
  return clamp((ts % (dur + hold)) / dur);
}

/** Gaussian pdf (unit height). */
export const gauss = (x: number, mu: number, s: number) => Math.exp(-0.5 * ((x - mu) / s) ** 2);

/** Two panels: side by side in landscape, stacked in portrait. */
export function twoPanels(w: number, h: number, gap = 16, pad = 14, split = 0.5) {
  const portrait = w / h < 1.0;
  const iw = w - 2 * pad;
  const ih = h - 2 * pad;
  if (portrait) {
    const h1 = (ih - gap) * split;
    return { portrait, a: { x: pad, y: pad, w: iw, h: h1 }, b: { x: pad, y: pad + h1 + gap, w: iw, h: ih - h1 - gap } };
  }
  const w1 = (iw - gap) * split;
  return { portrait, a: { x: pad, y: pad, w: w1, h: ih }, b: { x: pad + w1 + gap, y: pad, w: iw - w1 - gap, h: ih } };
}

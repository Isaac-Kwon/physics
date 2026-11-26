/** Small Canvas2D drawing helpers shared by the S2 scenes. */
import { FONT_MONO, FONT_SANS } from '../shared/plot';

export function arrow(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, lw = 1.2, alpha = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  if (L < 1) return;
  const ux = dx / L;
  const uy = dy / L;
  const hs = Math.min(7, L * 0.5);
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1 - ux * hs * 0.6, y1 - uy * hs * 0.6);
  g.stroke();
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x1 - ux * hs - uy * hs * 0.45, y1 - uy * hs + ux * hs * 0.45);
  g.lineTo(x1 - ux * hs + uy * hs * 0.45, y1 - uy * hs - ux * hs * 0.45);
  g.closePath();
  g.fill();
  g.restore();
}

export function label(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color: string,
  o: { mono?: boolean; align?: CanvasTextAlign; alpha?: number; size?: number; base?: CanvasTextBaseline } = {},
) {
  g.save();
  g.font = (o.mono ? FONT_MONO : FONT_SANS).replace(/\d+px/, `${o.size ?? (o.mono ? 11 : 12)}px`);
  g.fillStyle = color;
  g.globalAlpha = o.alpha ?? 0.85;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = o.base ?? 'alphabetic';
  g.fillText(s, x, y);
  g.restore();
}

/** Positive / negative charge colours: accent amber and a cool blue (distinguishable without relying on hue alone: also labelled). */
export const CHARGE_POS = '#ffb547';
export const CHARGE_NEG = '#6fa8ff';

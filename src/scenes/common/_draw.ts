/** Small Canvas2D drawing helpers shared by the S4 scenes (private: not registered as a scene). */
import { FONT_MONO, FONT_SANS } from '../shared/plot';
import { clamp } from '../shared/canvas2d';

export interface TextOpts {
  mono?: boolean;
  color: string;
  align?: CanvasTextAlign;
  base?: CanvasTextBaseline;
  alpha?: number;
}

/** Draw text (sans 12 px for words, mono 11 px for numbers). */
export function txt(g: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts) {
  g.save();
  g.font = o.mono ? FONT_MONO : FONT_SANS;
  g.fillStyle = o.color;
  g.globalAlpha = o.alpha ?? 0.9;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = o.base ?? 'middle';
  g.fillText(s, x, y);
  g.restore();
}

/** Thin line with optional dash and alpha. */
export function line(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, w = 1, alpha = 1, dash: number[] = []) {
  if (alpha <= 0.005) return;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = w;
  g.globalAlpha = clamp(alpha);
  g.setLineDash(dash);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.restore();
}

export function arrow(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, w = 1.2, alpha = 1, head = 6) {
  if (alpha <= 0.005) return;
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = w;
  g.globalAlpha = clamp(alpha);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6);
  g.stroke();
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4));
  g.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4));
  g.closePath();
  g.fill();
  g.restore();
}

export function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  if (alpha <= 0.005) return;
  g.save();
  g.fillStyle = color;
  g.globalAlpha = clamp(alpha);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function ring(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, w = 1, alpha = 1, dash: number[] = []) {
  if (alpha <= 0.005) return;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = w;
  g.globalAlpha = clamp(alpha);
  g.setLineDash(dash);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

/** Magnetic field symbol: out of the page (dot in circle) or into it (cross in circle). */
export function fieldSymbol(g: CanvasRenderingContext2D, x: number, y: number, out: boolean, color: string, alpha = 0.6, r = 5) {
  ring(g, x, y, r, color, 1, alpha);
  if (out) dot(g, x, y, 1.4, color, alpha);
  else {
    const d = r * 0.65;
    line(g, x - d, y - d, x + d, y + d, color, 1, alpha);
    line(g, x - d, y + d, x + d, y - d, color, 1, alpha);
  }
}

/** Rotated rectangle outline helper (axis aligned here). */
export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, lw = 1, alpha = 1, fill = 0) {
  g.save();
  if (fill > 0) {
    g.globalAlpha = clamp(fill);
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  }
  if (alpha > 0.005) {
    g.globalAlpha = clamp(alpha);
    g.strokeStyle = color;
    g.lineWidth = lw;
    g.strokeRect(x, y, w, h);
  }
  g.restore();
}

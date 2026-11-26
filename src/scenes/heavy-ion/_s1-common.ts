/** Shared helpers for bundle S1 scenes (private, not registered). */
import { interpolateInferno, rgb as d3rgb } from 'd3';
import { clamp } from '../shared/canvas2d';

/** Colour-charge notation (textbook convention). Antiquarks are drawn as rings in the anticolour. */
export const QCOL = { r: '#ef6a6a', g: '#5fcf8a', b: '#6a96f2', ar: '#4fd2dc', ag: '#d36bd0', ab: '#e6c24f' } as const;

export const sup = (s: string) => s.replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);

/** Hot-body colour: t=1 white-hot, 0.5 orange, ~0.2 deep red (perceptual Inferno, with a white lift at the top). */
export function hotColor(t: number): [number, number, number] {
  const c = clamp(t);
  const base = interpolateInferno(0.28 + 0.7 * c); // "rgb(r, g, b)"
  const o = d3rgb(base);
  const m: [number, number, number] = [o.r, o.g, o.b];
  const w = clamp((c - 0.85) / 0.15);
  return [m[0] + (255 - m[0]) * w, m[1] + (255 - m[1]) * w, m[2] + (255 - m[2]) * w];
}
export const rgba = (c: [number, number, number], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export function arrowHead(g: CanvasRenderingContext2D, x: number, y: number, ang: number, size = 7) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x - size * Math.cos(ang - 0.4), y - size * Math.sin(ang - 0.4));
  g.lineTo(x - size * Math.cos(ang + 0.4), y - size * Math.sin(ang + 0.4));
  g.closePath();
  g.fill();
}

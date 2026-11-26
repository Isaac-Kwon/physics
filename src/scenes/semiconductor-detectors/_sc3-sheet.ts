/**
 * Oblique drawing of a thin silicon sheet that bends from flat (c = 0) to a half-cylinder (c = 1).
 * End-view shape is a circular arc of fixed arc length Ws (= π R at c = 1); the beam direction (26 cm) is drawn along a
 * foreshortened depth vector. Thickness is drawn ≥ 2 px (not to scale).
 */
import { dim, ln, poly, txt, type G } from './_sc3-common';

export interface SheetGeo {
  /** Screen position of the arc's lowest point of the front edge (c = 1) / centre of the flat sheet (c = 0). */
  pts: [number, number][];
  rpx: number;
  centre: [number, number];
  depth: [number, number];
}

export function drawSheet(g: G, cx: number, cy: number, Ws: number, c: number, color: string, fg: string, opts: { depth?: [number, number]; lines?: number } = {}): SheetGeo {
  const theta = Math.max(1e-4, Math.PI * c);
  const r = Ws / theta;
  const N = 48;
  const raw: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const ph = -theta / 2 + (theta * i) / N;
    raw.push([r * Math.sin(ph), r * (1 - Math.cos(ph))]);
  }
  // centre the bounding box vertically around cy
  const ymax = Math.max(...raw.map((p) => p[1]));
  const front = raw.map(([x, y]) => [cx + x, cy + y - ymax / 2] as [number, number]);
  const d = opts.depth ?? [Ws * 0.36, -Ws * 0.2];
  const back = front.map(([x, y]) => [x + d[0], y + d[1]] as [number, number]);
  poly(g, [...front, ...back.slice().reverse()], { close: true, fill: color, fillAlpha: 0.1, alpha: 0 });
  poly(g, back, { color, alpha: 0.35, width: 1 });
  const nl = opts.lines ?? 10;
  for (let k = 0; k <= nl; k++) {
    const i = Math.round((k / nl) * N);
    ln(g, front[i][0], front[i][1], back[i][0], back[i][1], { color, alpha: 0.22 });
  }
  poly(g, front, { color, alpha: 0.95, width: 2.5 });
  void fg;
  void dim;
  void txt;
  return { pts: front, rpx: r, centre: [cx, cy - ymax / 2 + r], depth: d };
}

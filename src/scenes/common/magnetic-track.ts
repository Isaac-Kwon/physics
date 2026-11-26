/**
 * shared.magnetic-track — Canvas2D principle drawing: charged particles in a uniform magnetic field B (out of the page).
 * Topic-neutral. Radius of curvature R = p / (0.3 B)  [R in m, p in GeV/c, B in T], drawn to scale with B = 1 T:
 * the p = 1.8 GeV/c track has exactly twice the radius of the p = 0.9 GeV/c track. Positive charge bends one way,
 * negative the other (F = q v x B).
 *   tracks : soft positive, soft negative and stiff positive tracks leave the origin.
 *   fit    : a tracker (four planes) records hits on the soft positive track; the fitted circle gives R, hence p.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, clamp, smooth } from '../shared/canvas2d';
import { dot, fieldSymbol, line, ring, txt } from './_draw';

const STATES = ['tracks', 'fit'] as const;
const B = 1; // T
const R_OF = (p: number) => p / (0.3 * B); // m
const PLANES = [0.7, 1.3, 1.9, 2.5]; // m, tracker planes (x)
const X_MAX = 2.9;

interface Trk {
  q: 1 | -1;
  p: number;
}
const TRACKS: Trk[] = [
  { q: 1, p: 0.9 },
  { q: -1, p: 0.9 },
  { q: 1, p: 1.8 },
];

/** Position (physical coords, y up) after transverse arc length s, starting at origin along +x. Positive charge bends toward -y. */
const posAt = (t: Trk, s: number) => {
  const R = R_OF(t.p);
  const a = s / R;
  return { x: R * Math.sin(a), y: -t.q * R * (1 - Math.cos(a)) };
};
const sAtX = (t: Trk, x: number) => R_OF(t.p) * Math.asin(Math.min(1, x / R_OF(t.p)));

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    let fit = 0;
    let target = 0;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      fit = approach(fit, target, s.dt, 0.5);
      const ks = Math.min((w * 0.74) / X_MAX, h / 3.1); // px per metre
      const ox = Math.max(40, (w - X_MAX * ks) / 2);
      const oy = h * 0.46;
      const P = (x: number, y: number): [number, number] => [ox + x * ks, oy - y * ks];
      const tc = ctx.reducedMotion ? 99 : s.t % 7;
      const u = clamp(tc / 3.2);

      // field symbols (B out of the page)
      for (let gx = ox + 30; gx < w - 12; gx += 44)
        for (let gy = 18; gy < h - 30; gy += 44) fieldSymbol(g, gx, gy, true, th.fg, 0.13, 4);
      txt(g, 'B', w - 18, 14, { color: th.fg, align: 'right', alpha: 0.8 });
      fieldSymbol(g, w - 36, 14, true, th.fg, 0.8, 5);

      // tracker planes
      for (const x of PLANES) {
        const [px, py0] = P(x, 1.35);
        const [, py1] = P(x, -1.35);
        line(g, px, py0, px, py1, th.accent2, 1.5, 0.15 + 0.6 * fit);
      }
      if (fit > 0.05) txt(g, L('tracker'), P(PLANES[3], 1.35)[0] + 8, P(0, 1.35)[1] + 8, { color: th.accent2, alpha: fit });

      // origin
      dot(g, ox, oy, 2.5, th.fg, 0.9);
      txt(g, L('source'), ox - 4, oy + 16, { color: th.fg, align: 'right', alpha: 0.7 });

      // fitted circle for track 0
      if (fit > 0.02) {
        const t0 = TRACKS[0];
        const R = R_OF(t0.p);
        const [cx, cy] = P(0, -t0.q * R);
        g.save();
        g.beginPath();
        g.rect(ox - 10, 4, w - ox, h - 46);
        g.clip();
        ring(g, cx, cy, R * ks, th.fg, 1, 0.4 * fit, [4, 4]);
        // radius line to the track point at x = 1.6 m
        const sp = sAtX(t0, 1.6);
        const q = posAt(t0, sp);
        const [qx, qy] = P(q.x, q.y);
        line(g, cx, cy, qx, qy, th.fg, 1, 0.7 * fit);
        dot(g, cx, cy, 2, th.fg, 0.7 * fit);
        g.restore();
        txt(g, 'R', (cx + qx) / 2 + 8, (cy + qy) / 2 - 2, { mono: true, color: th.fg, alpha: fit });
      }

      // tracks
      TRACKS.forEach((t, i) => {
        const col = t.q > 0 ? th.accent : th.accent2;
        const sMax = sAtX(t, X_MAX);
        const sEnd = sMax * u;
        g.save();
        g.strokeStyle = col;
        g.lineWidth = i === 0 ? 1.8 : 1.3;
        g.globalAlpha = i === 0 ? 1 : 0.8;
        g.beginPath();
        const n = 60;
        for (let k = 0; k <= n; k++) {
          const q = posAt(t, (sEnd * k) / n);
          const [x, y] = P(q.x, q.y);
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.restore();
        const q = posAt(t, sEnd);
        const [hx, hy] = P(q.x, q.y);
        if (u < 1) dot(g, hx, hy, 3, col, 1);
        // labels at the end of the track
        const e = posAt(t, sMax);
        const [ex, ey] = P(e.x, e.y);
        const sign = t.q > 0 ? '+' : '−';
        const yoff = t.q > 0 ? 11 : -11;
        txt(g, `${sign}  p = ${f1(t.p)} GeV/c`, Math.min(ex + 6, w - 4), ey + yoff, { mono: true, color: col, align: ex + 6 > w - 110 ? 'right' : 'left', alpha: smooth(0.8, 1, u) });
      });

      // hits on the fitted track
      if (fit > 0.05) {
        const t0 = TRACKS[0];
        for (const x of PLANES) {
          const q = posAt(t0, sAtX(t0, x));
          const [hx, hy] = P(q.x, q.y);
          if (x / X_MAX <= u + 0.02) dot(g, hx, hy, 3.2, th.fg, fit);
        }
      }

      // relation text
      const R0 = R_OF(TRACKS[0].p);
      txt(g, `p [GeV/c] ≈ 0.3 · B [T] · R [m]`, 12, h - 30, { mono: true, color: th.fg, alpha: 0.85 });
      if (fit > 0.05)
        txt(g, `R = ${f1(R0)} m  →  p = 0.3 × ${ctx.formatNumber(B)} × ${f1(R0)} = ${f1(0.3 * B * R0)} GeV/c`, 12, h - 12, { mono: true, color: th.accent, alpha: fit });
      else txt(g, L('bendhint'), 12, h - 12, { color: th.fg, alpha: 0.75 });
    });
    c.animate = true;

    return {
      setState(state: string, o: SetStateOptions) {
        target = state === 'fit' ? 1 : 0;
        if (o.immediate || ctx.reducedMotion) fit = target;
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

/**
 * det.frontier — three directions.
 *   timing4d: tracks of two collision vertices in the (z, t) plane. The vertices are 0.3 mm apart in z (closer than the 0.2 mm per-track z resolution
 *     at the beam line) but 160 ps apart in time; the per-track time resolution is 30 ps (DET.TOF_RESOLUTION_PS low end). Colour = arrival time (viridis).
 *     With time collapsed (sep = 0) the two groups overlap; with time (sep = 1) they separate. Projections are histograms of the drawn points.
 *   ml: simulated hits on six layers: the true helices plus random extra hits (combinatorial background); a network keeps the true ones.
 *   next: timeline now / about 2030 / later, "as of 2025", no dates beyond those in the text.
 */
import { interpolateViridis } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, gaussian, mulberry32, approach } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, dot, line, ring, txt } from '../common/_draw';
import { integrate, trackHits } from './_d2-onion';
import { makeClock } from './_d2-common';

const STATES = ['timing4d', 'ml', 'next'] as const;
type St = (typeof STATES)[number];
const SIG_Z = 0.2; // mm
const SIG_T = 30; // ps
const V = [
  { z: -0.15, t: -80 },
  { z: 0.15, t: 80 },
];

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const clk = makeClock(ctx);
    let state: St = 'timing4d';
    let sep = 0;
    const rnd = mulberry32(14);
    const pts = V.flatMap((v, vi) => Array.from({ length: 22 }, () => ({ vi, z: v.z + SIG_Z * gaussian(rnd), t: v.t + SIG_T * gaussian(rnd) })));
    // ml hits
    const RAD = [0.12, 0.22, 0.32, 0.43, 0.55, 0.68];
    const trk = Array.from({ length: 6 }, (_, i) => {
      const phi = (i / 6) * Math.PI * 2 + 0.4 + 0.3 * rnd();
      const R = 0.5 + 2.2 * rnd();
      const q: 1 | -1 = rnd() < 0.5 ? 1 : -1;
      const path = integrate(phi, q, R, 0.74);
      return { path, hits: trackHits(path, RAD) };
    });
    const fake = RAD.flatMap((r) => Array.from({ length: 11 }, () => {
      const a = rnd() * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
    }));

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      sep = approach(sep, state === 'timing4d' && clk.t > 0.6 ? 1 : 0, s.dt, 0.5);
      if (ctx.reducedMotion) sep = state === 'timing4d' ? 1 : 0;
      const wide = w >= 640 && w > h * 1.15;
      const narrow = w < 560;

      if (state === 'timing4d') {
        const R = wide
          ? { x: 70, y: 40, w: Math.min(w * 0.55, w - 260), h: h - 40 - 120 }
          : { x: 58, y: 36, w: w - 58 - 70, h: Math.max(100, h - 36 - 130 - 40) };
        const pl = plot(g, ctx, R, { min: -1, max: 1, label: L('zAxis'), ticks: [-1, -0.5, 0, 0.5, 1].map((v) => ({ v, label: ctx.formatNumber(v, { minimumFractionDigits: v === 0 ? 0 : 1 }) })) }, { min: -200, max: 200, label: L('tAxis'), ticks: [-150, 0, 150].map((v) => ({ v, label: String(v) })) });
        pl.axes();
        // per-track z/t uncertainty kept implicit; the points are the tracks
        pts.forEach((p) => {
          const col = sep > 0.15 ? interpolateViridis(0.12 + 0.76 * ((p.t + 200) / 400)) : th.fg;
          const y = p.t * sep;
          dot(g, pl.X(p.z), pl.Y(y), 3, col, 0.9);
        });
        // truth marks of the two vertices
        V.forEach((v) => {
          if (sep > 0.8) ring(g, pl.X(v.z), pl.Y(v.t), 9, th.fg, 1, 0.55 * (sep - 0.8) * 5, [3, 3]);
        });
        // z projection (below the plot)
        const nb = 24;
        const hz = new Array(nb).fill(0);
        pts.forEach((p) => {
          const b = Math.floor(((p.z + 1) / 2) * nb);
          if (b >= 0 && b < nb) hz[b]++;
        });
        const hmax = Math.max(...hz);
        const hy = R.y + R.h + 46;
        const hhgt = 36;
        for (let b = 0; b < nb; b++) {
          const bw = R.w / nb;
          g.save();
          g.fillStyle = th.fg;
          g.globalAlpha = 0.5;
          g.fillRect(R.x + b * bw + 1, hy + hhgt - (hz[b] / hmax) * hhgt, bw - 2, (hz[b] / hmax) * hhgt);
          g.restore();
        }
        txt(g, L('oneBlob'), R.x, hy - 4, { color: th.fg, alpha: 0.75 });
        // t projection (right)
        const ht = new Array(nb).fill(0);
        pts.forEach((p) => {
          const b = Math.floor(((p.t + 200) / 400) * nb);
          if (b >= 0 && b < nb) ht[b]++;
        });
        const tmax = Math.max(...ht);
        const hx = R.x + R.w + 16;
        const hw = Math.min(70, w - hx - 10);
        for (let b = 0; b < nb; b++) {
          const bh = R.h / nb;
          const val = sep > 0.05 ? (ht[b] / tmax) * hw * sep : 0;
          g.save();
          g.fillStyle = interpolateViridis(0.12 + 0.76 * ((b + 0.5) / nb));
          g.globalAlpha = 0.85;
          g.fillRect(hx, R.y + R.h - (b + 1) * bh + 1, val, bh - 2);
          g.restore();
        }
        txt(g, L('twoBlobs'), w - 8, R.y - 12, { color: th.fg, align: 'right', alpha: 0.75 * sep });
        txt(g, `σ_t = ${SIG_T} ps  ·  ${L('dz')}`, R.x, hy + hhgt + 16, { mono: true, color: th.fg, alpha: 0.8 });
        return;
      }

      if (state === 'ml') {
        const S = wide ? Math.min(h - 70, w * 0.4) : Math.min(w * 0.46, (h - 90) / 1);
        const gap = wide ? (w - 2 * S) / 3 : 16;
        const cxA = wide ? gap + S / 2 : w * 0.26;
        const cxB = wide ? 2 * gap + 1.5 * S : w * 0.74;
        const cy = 40 + S / 2;
        const K = (S / 2 - 6) / 0.74;
        const sel = clk.p(0.9, 0.9);
        [cxA, cxB].forEach((cx, pi) => {
          RAD.forEach((r) => ring(g, cx, cy, r * K, th.fg, 1, 0.22));
          dot(g, cx, cy, 2, th.fg, 0.8);
          if (pi === 1) {
            trk.forEach((t) => {
              g.save();
              g.strokeStyle = th.accent;
              g.globalAlpha = 0.9 * sel;
              g.lineWidth = 1.2;
              g.beginPath();
              t.path.forEach((p, k) => (k ? g.lineTo(cx + p[0] * K, cy - p[1] * K) : g.moveTo(cx + p[0] * K, cy - p[1] * K)));
              g.stroke();
              g.restore();
            });
          }
          // hits: true (all panels) and combinatorial extras (fade on the right)
          trk.forEach((t) => t.hits.forEach((p) => dot(g, cx + p[0] * K, cy - p[1] * K, 2.6, pi === 1 && sel > 0.1 ? th.accent : th.fg, pi === 1 ? 0.55 + 0.45 * sel : 0.9)));
          fake.forEach((p) => dot(g, cx + p[0] * K, cy - p[1] * K, 2.6, th.fg, pi === 1 ? 0.9 * (1 - sel) : 0.9));
        });
        txt(g, L('allHits'), cxA, 20, { color: th.fg, align: 'center', alpha: 0.9 });
        txt(g, L('selected'), cxB, 20, { color: th.accent, align: 'center', alpha: 0.9 });
        // network arrow between the panels
        const ax0 = cxA + S / 2 + 8;
        const ax1 = cxB - S / 2 - 8;
        arrow(g, ax0, cy, ax1, cy, th.fg, 1.4, 0.9, 8);
        txt(g, L('network'), (ax0 + ax1) / 2, cy - 14, { color: th.fg, align: 'center', alpha: 0.9 });
        txt(g, `${trk.length} ${L('true')} · ${fake.length} ${L('extra')}`, w / 2, cy + S / 2 + 34, { mono: true, color: th.fg, align: 'center', alpha: 0.8 });
        txt(g, L('dimmed'), w / 2, cy + S / 2 + 56, { color: th.fg, align: 'center', alpha: 0.6 });
        return;
      }

      // next: timeline
      const items = [
        { k: 'now', lines: 3, pos: 0.0 },
        { k: 'y2030', lines: 3, pos: 5 },
        { k: 'later', lines: 4, pos: 9 },
      ];
      const q = clk.p(0.1, 0.9);
      if (wide) {
        const pad = 40;
        const W = w - 2 * pad;
        const y0 = h * 0.36;
        const X = (yr: number) => pad + 20 + (yr / 9) * (W * 0.66);
        arrow(g, pad, y0, pad + W * q, y0, th.fg, 1.4, 0.8, 8);
        line(g, X(9), y0, pad + W, y0, th.fg, 1, 0.5, [3, 5]);
        items.forEach((it, i) => {
          const x = X(it.pos);
          const a = clk.p(0.2 + i * 0.35, 0.5);
          dot(g, x, y0, 5, th.accent, a);
          txt(g, L(it.k + '.t'), x, y0 - 30, { color: th.accent, alpha: a });
          txt(g, L(it.k + '.s'), x, y0 - 14, { mono: true, color: th.fg, alpha: 0.7 * a });
          for (let j = 1; j <= it.lines; j++) txt(g, L(`${it.k}.${j}`), x, y0 + 22 + (j - 1) * 20, { color: th.fg, alpha: 0.9 * a });
        });
        txt(g, L('asof'), pad + W, y0 - 14, { color: th.fg, align: 'right', alpha: 0.7 });
      } else {
        const pad = 22;
        const x0 = pad + 8;
        const yTop = 40;
        const yBot = h - 30;
        const Yq = (v: number) => yTop + ((yBot - yTop) * v) / 3.4;
        arrow(g, x0, yTop - 12, x0, yTop - 12 + (yBot - yTop + 12) * q, th.fg, 1.4, 0.8, 8);
        items.forEach((it, i) => {
          const y = Yq(i * 1.1 + 0.1);
          const a = clk.p(0.2 + i * 0.35, 0.5);
          dot(g, x0, y, 5, th.accent, a);
          txt(g, `${L(it.k + '.t')}  ·  ${L(it.k + '.s')}`, x0 + 16, y - 2, { color: th.accent, alpha: a });
          for (let j = 1; j <= it.lines; j++) txt(g, L(`${it.k}.${j}`), x0 + 16, y + 20 + (j - 1) * 17, { color: th.fg, alpha: 0.9 * a });
        });
        txt(g, L('asof'), w - pad, 18, { color: th.fg, align: 'right', alpha: 0.7 });
      }
      void narrow;
    });
    c.animate = true;
    return {
      setState(st: string, o: SetStateOptions) {
        state = (STATES as readonly string[]).includes(st) ? (st as St) : 'timing4d';
        clk.reset();
        if (state !== 'timing4d') sep = 0;
        if (o.immediate || ctx.reducedMotion) clk.finish();
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

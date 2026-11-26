/**
 * hi.pid — P8 Schematic plot: dE/dx versus momentum for e, pi, K, p, d from the simplified Bethe-Bloch function shared with the
 * BetheBloch widget (src/components/widgets/_physics.ts: z = 1, no density effect, argon-like I = 188 eV, MIP = 1, arbitrary units).
 * Bands ordered by mass at low p; they converge in the relativistic rise. The point cloud is a seeded smear (about 7 % in dE/dx)
 * around the curves — illustration, not data. Overlap regions: where two curves are within 8 % of each other.
 *   momentum-axis : unlabelled points; bands : points and curves by species; overlap : shaded regions "need TOF".
 */
import { interpolateViridis } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32, gaussian, clamp } from '../shared/canvas2d';
import { plot, plotRect } from '../shared/plot';
import { dEdx, SPECIES } from '../../components/widgets/_physics';
import { dot, txt } from '../common/_draw';

const STATES = ['momentum-axis', 'bands', 'overlap'] as const;
type St = (typeof STATES)[number];
const P_MIN = 0.1;
const P_MAX = 10;
const TARGET: Record<St, { bands: number; ov: number }> = {
  'momentum-axis': { bands: 0, ov: 0 },
  bands: { bands: 1, ov: 0 },
  overlap: { bands: 1, ov: 1 },
};
/** Where each curve's direct label sits (momentum in GeV/c) and its pixel nudge. */
const LABEL_AT: Record<string, [number, number, number]> = { e: [0.11, 8, -9], pi: [0.5, 8, 8], K: [0.35, 8, -6], p: [0.5, 8, -6], d: [0.9, 8, -6] };
const P_RANGE: Record<string, [number, number]> = { e: [0.1, 3], pi: [0.1, 10], K: [0.2, 10], p: [0.3, 10], d: [0.5, 10] };
const COUNT: Record<string, number> = { e: 45, pi: 150, K: 55, p: 70, d: 22 };

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const colorOf = (id: string) => (id === 'e' ? th.fg : id === 'pi' ? interpolateViridis(0.8) : id === 'K' ? interpolateViridis(0.55) : id === 'p' ? th.accent : interpolateViridis(0.3));
    const rnd = mulberry32(8);
    const pts = SPECIES.flatMap((sp) => {
      const n = Math.round(COUNT[sp.id] * Math.max(0.4, ctx.quality));
      const [a, b] = P_RANGE[sp.id];
      return Array.from({ length: n }, () => {
        const p = a * (b / a) ** rnd();
        return { id: sp.id, p, y: dEdx(p, sp.m) * Math.exp(0.07 * gaussian(rnd)) };
      });
    });
    // overlap intervals: momenta where two of e, pi, K, p (curves within 12 %) are indistinguishable
    const sel = SPECIES.filter((s) => s.id !== 'd');
    const flags: boolean[] = [];
    const NS = 300;
    for (let i = 0; i <= NS; i++) {
      const p = P_MIN * (P_MAX / P_MIN) ** (i / NS);
      const v = sel.map((s) => dEdx(p, s.m));
      let close = false;
      for (let a = 0; a < v.length; a++) for (let b = a + 1; b < v.length; b++) if (Math.abs(Math.log(v[a] / v[b])) < 0.08) close = true;
      flags.push(close);
    }
    const intervals: [number, number][] = [];
    let start = -1;
    flags.forEach((f, i) => {
      if (f && start < 0) start = i;
      if ((!f || i === NS) && start >= 0) {
        const end = f ? i : i - 1;
        intervals.push([P_MIN * (P_MAX / P_MIN) ** (start / NS), P_MIN * (P_MAX / P_MIN) ** (end / NS)]);
        start = -1;
      }
    });

    const lv = { bands: 0, ov: 0 };
    let tgt = { ...TARGET['momentum-axis'] };

    const c = createCanvas2D(ctx, (g, s) => {
      lv.bands = approach(lv.bands, tgt.bands, s.dt, 0.6);
      lv.ov = approach(lv.ov, tgt.ov, s.dt, 0.5);
      const r = plotRect(s.w, s.h, { l: 62, r: 56, t: 34, b: 52 });
      const pl = plot(
        g,
        ctx,
        r,
        { min: P_MIN, max: P_MAX, log: true, label: L('pax'), ticks: [0.1, 0.3, 1, 3, 10].map((v) => ({ v, label: String(v) })) },
        { min: 0.7, max: 100, log: true, label: L('dedx'), ticks: [{ v: 1, label: '1' }, { v: 10, label: '10' }, { v: 100, label: '100' }] },
      );
      // overlap shading first (behind)
      if (lv.ov > 0.02) {
        g.save();
        g.fillStyle = th.accent2;
        g.globalAlpha = 0.06 * lv.ov;
        intervals.forEach(([a, b]) => {
          const x0 = pl.X(a);
          const x1 = pl.X(b);
          g.fillRect(x0, r.y, Math.max(2, x1 - x0), r.h);
        });
        g.restore();
      }
      pl.axes();
      // points
      for (const q of pts) {
        const x = pl.X(q.p);
        const y = pl.Y(q.y);
        if (y < r.y || y > r.y + r.h) continue;
        dot(g, x, y, 1.9, th.fg, 0.5 * (1 - lv.bands));
        dot(g, x, y, 1.9, colorOf(q.id), 0.85 * lv.bands);
      }
      if (lv.bands > 0.02) {
        SPECIES.forEach((sp) => {
          const col = colorOf(sp.id);
          pl.curve((p) => dEdx(p, sp.m), { color: col, width: 1.2, alpha: 0.9, progress: clamp(lv.bands * 1.2) });
          const [lp, dx, dy] = LABEL_AT[sp.id];
          txt(g, sp.sym, pl.X(lp) + dx, pl.Y(dEdx(lp, sp.m)) + dy, { color: col, alpha: clamp((lv.bands - 0.5) * 2) });
        });
        txt(g, L('mass'), r.x + r.w, r.y + r.h - 12, { color: th.fg, align: 'right', alpha: 0.75 * lv.bands });
      }
      if (lv.ov > 0.02) {
        intervals
          .filter(([a, b]) => pl.X(b) - pl.X(a) > 26 || b / a > 2)
          .forEach(([a, b]) => {
            const x = (pl.X(a) + pl.X(b)) / 2;
            txt(g, L('needtof'), x, r.y + 12, { color: th.accent2, align: 'center', alpha: lv.ov });
          });
      }
    });

    return {
      setState(st: string, o: SetStateOptions) {
        const k = (STATES as readonly string[]).includes(st) ? (st as St) : 'momentum-axis';
        tgt = { ...TARGET[k] };
        if (o.immediate || ctx.reducedMotion) Object.assign(lv, tgt);
        // run the transition loop; it stops itself once the levels have settled
        c.animate = !(o.immediate || ctx.reducedMotion);
        c.invalidate();
        if (c.animate)
          setTimeout(() => {
            c.animate = false;
            c.invalidate();
          }, 1800);
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

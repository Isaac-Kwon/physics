/**
 * det.momentum-resolution — P8 schematic: relative momentum resolution of a solenoid tracker versus p_T.
 *   curvature term  a * p   (Gluckstern: sigma_x p / (0.3 B L^2) * sqrt(720 / (N + 4)), illustrative a = 1e-4 per GeV/c)
 *   multiple scattering  b / beta  (0.0136 / (0.3 B L beta) * sqrt(L / X0), illustrative b = 1.5 %; beta from the pion mass, so it rises below ~ 1 GeV/c)
 *   sum in quadrature: sqrt((a p)^2 + (b / beta)^2), which has a broad minimum.
 * lever-arm: the tracker radius is doubled: curvature term / 4 (1 / L^2). The scattering term is kept as it is (same material budget assumed).
 * Numbers are illustrative; only the shapes and the factor 4 are meaningful.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D } from '../shared/canvas2d';
import { plot, plotRect } from '../shared/plot';
import { txt } from '../common/_draw';
import { makeClock } from './_d2-common';

const STATES = ['terms', 'lever-arm'] as const;
type St = (typeof STATES)[number];
const A = 1e-4;
const B = 0.015;
const M_PI = 0.13957;
const beta = (p: number) => p / Math.hypot(p, M_PI);
const curv = (a: number) => (p: number) => (a * p < 1.2e-4 ? NaN : a * p);
const ms = (p: number) => B / beta(p);
const sum = (a: number) => (p: number) => Math.hypot(a * p, ms(p));

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const clk = makeClock(ctx);
    let state: St = 'terms';
    let lever = 0;

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      lever += ((state === 'lever-arm' ? 1 : 0) - lever) * (s.dt > 0 ? 1 - Math.exp(-s.dt / 0.4) : 1);
      const narrow = w < 560;
      const r = plotRect(w, h, { l: 64, r: narrow ? 20 : 150, t: 34, b: 52 });
      const pct = [1e-4, 1e-3, 1e-2, 1e-1, 1].map((v) => ({ v, label: `${ctx.formatNumber(v * 100)} %` }));
      const pl = plot(g, ctx, r, { min: 0.1, max: 1000, log: true, label: L('pT') }, { min: 1e-4, max: 1, log: true, label: L('res'), ticks: pct });
      pl.axes();
      const p1 = clk.p(0.0, 0.9);
      const p2 = clk.p(0.7, 0.9);
      const p3 = clk.p(1.4, 0.9);
      const full = state === 'lever-arm';
      // multiple scattering: flat at high p
      pl.curve(ms, { color: th.fg, width: 1.3, alpha: 0.75, progress: full ? 1 : p1 }, 240);
      pl.curve(curv(A), { color: th.fg, width: 1.3, alpha: 0.75, dash: [5, 4], progress: full ? 1 : p2 }, 240);
      pl.curve(sum(A), { color: th.accent, width: 2, progress: full ? 1 : p3 }, 240);
      if (lever > 0.02) {
        pl.curve(curv(A / 4), { color: th.fg, width: 1.2, alpha: 0.5 * lever, dash: [2, 4], progress: 1 }, 240);
        pl.curve(sum(A / 4), { color: th.accent, width: 1.6, alpha: 0.55 * lever, dash: [6, 4], progress: 1 }, 240);
      }
      // direct labels
      const ex = narrow ? r.x + r.w - 4 : r.x + r.w + 8;
      const al: CanvasTextAlign = narrow ? 'right' : 'left';
      const yMs = pl.Y(ms(1000));
      const yCv = pl.Y(curv(A)(1000));
      txt(g, L('ms'), ex, narrow ? yMs - 12 : yMs, { color: th.fg, align: al, alpha: (full ? 1 : p1) * 0.9 });
      txt(g, L('curv'), narrow ? pl.X(40) : ex, narrow ? pl.Y(curv(A)(40)) + 22 : yCv + 12, { color: th.fg, align: al, alpha: (full ? 1 : p2) * 0.9 });
      txt(g, L('sum'), ex, narrow ? pl.Y(sum(A)(1000)) - 14 : pl.Y(sum(A)(1000)) - 12, { color: th.accent, align: al, alpha: full ? 1 : p3 });
      if (lever > 0.02) {
        txt(g, L('big'), narrow ? r.x + r.w - 4 : ex, pl.Y(sum(A / 4)(1000)) - 6, { color: th.fg, align: al, alpha: 0.7 * lever });
        txt(g, L('quarter'), r.x + 8, pl.Y(2e-3), { color: th.fg, alpha: 0.75 * lever });
      }
      txt(g, L('illustrative'), r.x + r.w, r.y - 14, { color: th.fg, align: 'right', alpha: 0.55 });
      if (full || p3 > 0.5) {
        // minimum of the quadrature sum
        let pm = 1;
        let ym = Infinity;
        for (let p = 0.2; p < 500; p *= 1.03) if (sum(A)(p) < ym) ((ym = sum(A)(p)), (pm = p));
        pl.dot(pm, ym, 3.5, th.accent);
        txt(g, L('minimum'), pl.X(pm), pl.Y(ym) + 20, { color: th.accent, align: 'center', alpha: full ? 1 : p3 });
      }
    });
    c.animate = true;
    return {
      setState(st: string, o: SetStateOptions) {
        state = (STATES as readonly string[]).includes(st) ? (st as St) : 'terms';
        clk.reset();
        if (o.immediate || ctx.reducedMotion) {
          clk.finish();
          lever = state === 'lever-arm' ? 1 : 0;
        }
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

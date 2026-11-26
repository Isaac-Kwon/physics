/**
 * det.energy-resolution — σ/E = a/√E ⊕ b ⊕ c/E (log–log), one term per state, then the quadrature sum.
 * Illustrative parameters: a = 3 % √GeV (crystal ECAL, DET.ECAL_STOCHASTIC), b = 0.5 %, c = 0.05 GeV (noise).
 * The three terms cross at E = (c/a)² ≈ 2.8 GeV (noise = stochastic) and E = (a/b)² = 36 GeV (stochastic = constant), so each one dominates
 * in its own band. The sum at 100 GeV is 0.58 %, the same number as the MDX example (0.03/10 ⊕ 0.005 ≈ 0.6 %).
 */
import type { SceneModule } from '../shared/types';
import { plot } from '../shared/plot';
import { createStage, line, para, rgba, txt, type G } from './_d1-common';

const STATES = ['stochastic', 'noise', 'constant', 'sum'] as const;
type P = { s: number; n: number; c: number; t: number };
const TARGETS: Record<string, P> = {
  stochastic: { s: 1, n: 0, c: 0, t: 0 },
  noise: { s: 1, n: 1, c: 0, t: 0 },
  constant: { s: 1, n: 1, c: 1, t: 0 },
  sum: { s: 1, n: 1, c: 1, t: 1 },
};
const A = 0.03;
const B = 0.005;
const C = 0.05;
const stoch = (E: number) => A / Math.sqrt(E);
const noise = (E: number) => C / E;
const cons = () => B;
const total = (E: number) => Math.hypot(A / Math.sqrt(E), B, C / E);
const E_NS = (C / A) ** 2;
const E_SC = (A / B) ** 2;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const { accent, fg } = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const draw = (g: G, s: { w: number; h: number }, p: P) => {
      const { w, h } = s;
      const small = w < 520;
      const rr = small ? 92 : 150;
      const r = { x: 58, y: 30, w: w - 58 - rr, h: h - 30 - 84 - (small ? 22 : 0) };
      const xa = { min: 0.1, max: 1000, label: L('x'), ticks: [0.1, 1, 10, 100, 1000].map((v) => ({ v, label: String(v) })) };
      const ya = { min: 3e-5, max: 0.3, label: 'σ/E', log: true, ticks: [0.001, 0.01, 0.1].map((v) => ({ v, label: ctx.formatNumber(v * 100) + ' %' })) };
      const pl = plot(g, ctx, { ...r }, { ...xa, log: true }, ya);
      pl.axes();
      const curve = (f: (E: number) => number, o: { color: string; width: number; alpha: number; prog: number }) => {
        if (o.prog <= 0.003) return;
        g.save();
        g.beginPath();
        g.rect(r.x, r.y, r.w, r.h);
        g.clip();
        g.strokeStyle = o.color;
        g.globalAlpha = o.alpha;
        g.lineWidth = o.width;
        g.beginPath();
        const n = 240;
        const m = Math.round(n * Math.min(1, o.prog));
        for (let i = 0; i <= m; i++) {
          const E = 0.1 * 10000 ** (i / n);
          i ? g.lineTo(pl.X(E), pl.Y(f(E))) : g.moveTo(pl.X(E), pl.Y(f(E)));
        }
        g.stroke();
        g.restore();
      };
      const thin = p.t > 0.5 ? 0.45 : 0.95;
      curve(stoch, { color: fg, width: 1.5, alpha: thin, prog: p.s });
      curve(noise, { color: fg, width: 1.5, alpha: thin * 0.8, prog: p.n });
      curve(cons, { color: fg, width: 1.5, alpha: thin * 0.65, prog: p.c });
      curve(total, { color: accent, width: 2, alpha: 1, prog: p.t });
      // direct labels at the curve ends
      const lx = r.x + r.w + 10;
      const lab = (name: string, formula: string, E: number, f: (E: number) => number, a: number, dy = 0, color?: string) => {
        if (a < 0.02) return;
        const y = pl.Y(Math.max(f(E), 3.2e-5)) + dy;
        txt(g, name, lx, y - 7, { alpha: a * 0.9, color });
        txt(g, formula, lx, y + 8, { mono: true, alpha: a * 0.8, color });
      };
      const base = p.t > 0.5 ? 0.6 : 1;
      lab(L('stochastic'), 'a/√E', 1000, stoch, p.s * base, 0);
      lab(L('noise'), 'c/E', 1000, noise, p.n * base, 0);
      lab(L('constant'), 'b', 1000, cons, p.c * base, 20);
      lab(L('total'), 'a/√E ⊕ b ⊕ c/E', 1000, total, p.t, -22, accent);
      // dominance bands (sum state)
      if (p.t > 0.02) {
        g.save();
        g.globalAlpha = p.t * 0.5;
        for (const E of [E_NS, E_SC]) line(g, pl.X(E), r.y, pl.X(E), r.y + r.h, fg, 0.35, 1, [3, 4]);
        g.restore();
        const yb = pl.Y(8e-5);
        txt(g, L('domNoise'), pl.X(Math.sqrt(0.1 * E_NS)), yb, { align: 'center', alpha: 0.8 * p.t });
        txt(g, L('domStoch'), pl.X(Math.sqrt(E_NS * E_SC)), yb, { align: 'center', alpha: 0.8 * p.t });
        txt(g, L('domConst'), pl.X(Math.sqrt(E_SC * 1000)), yb, { align: 'center', alpha: 0.8 * p.t });
      }
      para(g, L('illustrative') + ': a = 3 %·√GeV, b = 0.5 %, c = 0.05 GeV', r.x, h - 22 - (small ? 10 : 0), w - r.x - 16, { alpha: 0.65 });
      void rgba;
    };
    return createStage<P>(ctx, { states: STATES, targets: TARGETS, tau: 0.6, draw: (g, s, p) => draw(g, s, p) });
  },
};
export default mod;

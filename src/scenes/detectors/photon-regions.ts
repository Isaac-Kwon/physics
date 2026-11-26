/**
 * det.photon-regions — which photon process dominates, in the (E_γ, Z) plane. Schematic: boundaries are smooth parametrisations
 * anchored on the textbook crossover values, not a computation of cross sections.
 *   photoelectric = Compton:  E_A(Z) = 0.5 MeV (Z/82)^1.4        (lead ≈ 0.5 MeV, silicon ≈ 40 keV, carbon ≈ 13 keV)
 *   Compton = pair:           E_B(Z) = 5 MeV × (82/Z)            (lead ≈ 5 MeV, silicon ≈ 30 MeV, carbon ≈ 70 MeV)
 * (σ_C ∝ Z falls slowly with E, σ_pair ∝ Z² grows like ln E, so the Compton–pair crossover moves down roughly as 1/Z; σ_pe ∝ Z⁴–⁵ E^−3 …
 * E^−3.5 against σ_C ∝ Z/E moves the photoelectric crossover up with Z.) The pair threshold 2 mₑc² = 1.022 MeV is marked.
 */
import type { SceneModule } from '../shared/types';
import { plot } from '../shared/plot';
import { clamp, smooth } from '../shared/canvas2d';
import { createStage, dot, line, rgba, txt, type G } from './_d1-common';

const STATES = ['regions'] as const;
type P = { r: number };
const TARGETS: Record<string, P> = { regions: { r: 1 } };

const E_MIN = 0.01; // MeV
const E_MAX = 1e5;
const eA = (Z: number) => 0.5 * (Z / 82) ** 1.4;
const eB = (Z: number) => 5 * (82 / Z);

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const { accent, accent2, fg } = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const draw = (g: G, s: { w: number; h: number }, p: P) => {
      const { w, h } = s;
      const small = w < 520;
      const r = { x: 54, y: 40, w: w - 54 - 24, h: h - 40 - 70 };
      const allT = [
        { v: 0.01, label: '10 keV' },
        { v: 0.1, label: '100 keV' },
        { v: 1, label: '1 MeV' },
        { v: 10, label: '10 MeV' },
        { v: 100, label: '100 MeV' },
        { v: 1e3, label: '1 GeV' },
        { v: 1e4, label: '10 GeV' },
        { v: 1e5, label: '100 GeV' },
      ];
      const xt = small ? allT.filter((_, i) => i % 2 === 0) : allT;
      const pl = plot(
        g,
        ctx,
        r,
        { min: E_MIN, max: E_MAX, log: true, label: L('x'), ticks: xt },
        { min: 1, max: 100, log: true, label: 'Z', ticks: [{ v: 1, label: '1' }, { v: 6, label: 'C' }, { v: 14, label: 'Si' }, { v: 26, label: 'Fe' }, { v: 82, label: 'Pb' }] },
      );
      const zs = Array.from({ length: 61 }, (_, i) => 10 ** ((2 * i) / 60));
      const a1 = smooth(0, 0.35, p.r);
      const a2 = smooth(0.25, 0.6, p.r);
      const a3 = smooth(0.5, 0.85, p.r);
      const a4 = smooth(0.8, 1, p.r);
      const poly = (pts: [number, number][], fill: string, a: number) => {
        g.save();
        g.fillStyle = fill;
        g.globalAlpha = a;
        g.beginPath();
        pts.forEach(([E, Z], i) => (i ? g.lineTo(pl.X(E), pl.Y(Z)) : g.moveTo(pl.X(E), pl.Y(Z))));
        g.closePath();
        g.fill();
        g.restore();
      };
      const pe: [number, number][] = [[E_MIN, 1], ...zs.map((Z) => [Math.max(E_MIN, eA(Z)), Z] as [number, number]), [E_MIN, 100]];
      const pair: [number, number][] = [[E_MAX, 1], ...zs.map((Z) => [Math.min(E_MAX, eB(Z)), Z] as [number, number]), [E_MAX, 100]];
      const comp: [number, number][] = [...zs.map((Z) => [Math.max(E_MIN, eA(Z)), Z] as [number, number]), ...[...zs].reverse().map((Z) => [Math.min(E_MAX, eB(Z)), Z] as [number, number])];
      poly(pe, accent, 0.2 * a1);
      poly(comp, fg, 0.07 * a2);
      poly(pair, accent2, 0.16 * a3);
      pl.axes();
      // boundaries
      g.save();
      g.beginPath();
      g.rect(r.x, r.y, r.w, r.h);
      g.clip();
      g.strokeStyle = fg;
      g.lineWidth = 1.25;
      for (const [f, a] of [[eA, a2], [eB, a3]] as [(Z: number) => number, number][]) {
        g.globalAlpha = 0.85 * a;
        g.beginPath();
        zs.forEach((Z, i) => (i ? g.lineTo(pl.X(f(Z)), pl.Y(Z)) : g.moveTo(pl.X(f(Z)), pl.Y(Z))));
        g.stroke();
      }
      g.restore();
      // pair threshold
      pl.vline(1.022, { color: fg, dash: [3, 4], alpha: 0.5 * a3 });
      txt(g, '2mₑc² = 1.022 MeV', pl.X(1.022), r.y - 12, { mono: true, align: 'center', alpha: 0.75 * a3 });
      // region names
      txt(g, L('pe'), pl.X(0.0125), pl.Y(48), { color: accent, alpha: a1, align: 'left' });
      txt(g, L('compton'), pl.X(0.8), pl.Y(5), { alpha: 0.85 * a2, align: 'right' });
      txt(g, L('pair'), pl.X(2000), pl.Y(30), { color: accent2, alpha: a3, align: 'center' });
      // anchor values
      const mark = (E: number, Z: number, label: string, dx: number, dy: number, al: number, align: CanvasTextAlign = 'left') => {
        dot(g, pl.X(E), pl.Y(Z), 3, fg, 0.9 * al);
        txt(g, label, pl.X(E) + dx, pl.Y(Z) + dy, { mono: true, alpha: 0.85 * al, align });
      };
      mark(0.5, 82, '0.5 MeV', -8, 12, a2, 'right');
      mark(5, 82, '5 MeV', 8, 12, a3);
      mark(eB(14), 14, '30 MeV', 8, -11, a3);
      line(g, pl.X(E_MIN), pl.Y(82), pl.X(E_MAX), pl.Y(82), fg, 0.12 * a4, 1, [2, 4]);
      line(g, pl.X(E_MIN), pl.Y(14), pl.X(E_MAX), pl.Y(14), fg, 0.12 * a4, 1, [2, 4]);
      txt(g, L('approx'), r.x, h - 16, { alpha: 0.7 });
      void clamp;
      void rgba;
    };
    return createStage<P>(ctx, { states: STATES, targets: TARGETS, tau: 0.7, draw: (g, s, p) => draw(g, s, p) });
  },
};
export default mod;

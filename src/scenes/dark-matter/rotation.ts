/**
 * dm.rotation — schematic plot v(r): visible disc alone (rises, peaks, falls ~ r^(−1/2)) versus disc + dark halo (flat).
 * Model functions: _dm1-rotation.ts (exponential disc, spherical approximation; pseudo-isothermal halo). No data points.
 */
import type { SceneModule } from '../shared/types';
import { FONT_MONO, plot } from '../shared/plot';
import { createStage, makeLayer, txt } from './_dm1-common';
import { vDisc, vHalo, vKepler, vTotal } from './_dm1-rotation';

const STATES = ['disc-only', 'with-halo'] as const;
type P = { halo: number; kep: number };
const TARGETS: Record<string, P> = { 'disc-only': { halo: 0, kep: 1 }, 'with-halo': { halo: 1, kep: 0 } };

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const layer = makeLayer();
    const L = (k: string) => ctx.label(k);
    const { accent, fg } = ctx.theme;
    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      draw(g, s, p) {
        const { w, h } = s;
        const narrow = w < 520;
        const r = { x: narrow ? 46 : 58, y: 34, w: Math.max(80, w - (narrow ? 46 : 58) - (narrow ? 84 : 128)), h: Math.max(80, h - 34 - 54) };
        const pl = plot(
          g,
          ctx,
          r,
          { min: 0, max: 30, label: L('radius'), ticks: [0, 10, 20, 30].map((v) => ({ v, label: String(v) })) },
          { min: 0, max: 300, label: L('speed'), ticks: [0, 100, 200, 300].map((v) => ({ v, label: String(v) })) },
        );
        pl.axes();
        // Keplerian guide v ∝ r^(−1/2), anchored on the disc curve at 12 kpc
        layer(g, w, h, p.kep, (g2) => {
          const q = plot(g2, ctx, r, { min: 0, max: 30 }, { min: 0, max: 300 });
          const pts: [number, number][] = [];
          for (let x = 12; x <= 30; x += 1) pts.push([x, vKepler(x, 12)]);
          q.path(pts, { color: fg, dash: [3, 4], width: 1, alpha: 0.7 });
          txt(g2, L('kepler'), q.X(30) - 4, q.Y(vKepler(30, 12)) + 24, { align: 'right', alpha: 0.8 });
        });
        // visible disc
        pl.curve(vDisc, { color: fg, width: 1.5, alpha: 0.9 });
        pl.text(30.6, vDisc(30), L('disc'), { alpha: 0.9 });
        // halo and total
        layer(g, w, h, p.halo, (g2) => {
          const q = plot(g2, ctx, r, { min: 0, max: 30 }, { min: 0, max: 300 });
          q.curve(vHalo, { color: accent, width: 1.25, dash: [5, 4], alpha: 0.9 });
          q.curve(vTotal, { color: accent, width: 2 });
          q.text(30.6, vHalo(30), L('halo'), { color: accent, alpha: 0.95 });
          q.text(30.6, vTotal(30) + 14, L('total'), { color: accent, alpha: 1 });
        });
        txt(g, 'v² = G M(r) / r', r.x + 12, r.y + 16, { mono: true, alpha: 0.75 });
        void FONT_MONO;
      },
    });
  },
};
export default mod;

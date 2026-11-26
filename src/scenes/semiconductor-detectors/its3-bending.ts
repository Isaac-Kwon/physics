/**
 * sc.its3-bending — a flat, thinned wafer-scale sensor bends into a half-cylinder (schematic, not to scale).
 * Width = half the circumference of layer 0: π R with R = 19 mm → ≈ 60 mm; length ≈ 26 cm along the beam; thickness ≲ 50 µm
 * (drawn ≥ 2 px). The end-view curve is a circular arc of constant arc length.
 */
import type { SceneModule } from '../shared/types';
import { ease, clamp, dim, fadeStage, ln, txt, tw, type Fr, type G } from './_sc3-common';
import { drawSheet } from './_sc3-sheet';
import { ITS3 } from './_sc3-common';

const STATES = ['wafer', 'half-cylinder'] as const;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const R0 = ITS3.r[0];
    const draw = (g: G, f: Fr, to: number) => {
      const c = to === 1 ? ease(clamp(f.ts / 1.8)) : 1 - ease(clamp(f.ts / 1.8));
      const Ws = Math.min(f.w * 0.5, f.h * 0.78 * (Math.PI / 2) * 0.9, 420);
      const cx = f.w / 2 - Ws * 0.1;
      const cy = f.h / 2 + f.h * 0.04;
      const geo = drawSheet(g, cx, cy, Ws, c, accent, fg);
      const [dx, dy] = geo.depth;
      const first = geo.pts[0];
      const last = geo.pts[geo.pts.length - 1];
      // length along the beam (right edge, along the depth vector)
      dim(g, last[0] + 14, last[1] + 6, last[0] + 14 + dx, last[1] + 6 + dy, L('length'), { off: 16, alpha: 0.85 });
      // thickness callout at the left front edge
      const lw = Math.max(tw(g, L('thinNote')), tw(g, L('thickness'), true));
      const lx = Math.max(10, first[0] - 38 - lw);
      ln(g, first[0] - 2, first[1], lx + lw + 4, first[1] - 34, { alpha: 0.6 });
      txt(g, L('thickness'), lx, first[1] - 44, { mono: true, color: accent, alpha: 1 });
      txt(g, L('thinNote'), lx, first[1] - 28, { alpha: 0.7 });
      // width / radius
      const below = Math.max(...geo.pts.map((p) => p[1])) + 26;
      if (c < 0.05) {
        dim(g, geo.pts[0][0], below, last[0], below, `π R ≈ ${ctx.formatNumber(Math.PI * R0, { maximumFractionDigits: 0 })} mm`, { off: 16, alpha: 0.8 });
      } else if (c > 0.97) {
        txt(g, `R = ${ctx.formatNumber(R0)} mm`, cx, below + 6, { align: 'center', mono: true, color: accent2, alpha: 1 });
        txt(g, L('keepsShape'), cx, below + 26, { align: 'center', alpha: 0.7 });
      }
      txt(g, L('direction'), f.w - 16, f.h - 14, { align: 'right', alpha: 0.55 });
    };
    return fadeStage(ctx, { states: STATES, draws: { wafer: (g, f) => draw(g, f, 0), 'half-cylinder': (g, f) => draw(g, f, 1) }, anim: 2.2 });
  },
};
export default mod;

/**
 * nu.site — why neutrino detectors go underground: the cosmic-ray muon rate against depth of rock.
 * Curve: vertical-equivalent muon rate through a horizontal surface, I(h) = I₀ (1 + h/0.6)^-5.8 · exp(−h/1.48), h in km water-equivalent,
 * I₀ = 1.7×10⁻² cm⁻² s⁻¹ = 170 m⁻² s⁻¹ (≈ 1 per cm² per minute at sea level). The shape and constants were fitted to typical published rates
 * (Super-Kamiokande ≈ 2.7 km w.e. ≈ 1.6×10⁻⁷ cm⁻² s⁻¹; Gran Sasso ≈ 3.4 km w.e. ≈ 3×10⁻⁸; Homestake ≈ 4.2 km w.e. ≈ 4×10⁻⁹; SNOLAB ≈ 6 km w.e. ≈ 3×10⁻¹⁰;
 * Mei & Hime 2006, PDG cosmic-ray review): a schematic through those values, not a measurement. Rock density 2.7 g/cm³, so 1 km of rock = 2.7 km w.e.
 * Neutrinos are not attenuated by any of this rock (dashed line at the right).
 */
import type { SceneModule } from '../shared/types';
import { clamp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { createStage, line, nuLine, para, sci, txt, type G } from './_n1-common';

const STATES = ['surface-background'] as const;
type P = { a: number };
const I0 = 170; // m⁻² s⁻¹
const RHO = 2.7; // km w.e. per km of rock
export const muonRate = (km: number) => {
  const h = km * RHO;
  return I0 * (1 + h / 0.6) ** -5.8 * Math.exp(-h / 1.48);
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, fg } = ctx.theme;
    return createStage<P>(ctx, {
      states: STATES,
      targets: { 'surface-background': { a: 1 } },
      anim: { 'surface-background': 2.4 },
      draw(g: G, s, _p, env) {
        const { w, h } = s;
        const rv = smooth(0, 1, clamp(env.ts / 2.0));
        const R = { x: 52, y: 40, w: w - 52 - 40, h: h - 40 - 62 };
        const pl = plot(
          g,
          ctx,
          R,
          {
            min: 1e-6,
            max: 1e3,
            log: true,
            label: L('xLabel'),
            ticks: [
              { v: 1e-6, label: '10⁻⁶' },
              { v: 1e-3, label: '10⁻³' },
              { v: 1, label: '1' },
              { v: 1e3, label: '10³' },
            ],
          },
          { min: 2, max: 0, label: L('yLabel'), ticks: [0, 1, 2].map((v) => ({ v, label: String(v) })) },
        );
        // rock
        g.save();
        g.fillStyle = fg;
        g.globalAlpha = 0.06;
        g.fillRect(R.x, R.y, R.w, R.h);
        g.restore();
        txt(g, L('rock'), R.x + 8, R.y + R.h - 12, { alpha: 0.5 });
        pl.axes();
        line(g, R.x, R.y, R.x + R.w, R.y, { color: fg, alpha: 0.7, width: 1 });
        txt(g, L('surface'), R.x + 8, R.y + 12, { alpha: 0.7 });

        // curve
        const pts: [number, number][] = [];
        const N = 100;
        for (let i = 0; i <= N * rv; i++) {
          const km = (2 * i) / N;
          pts.push([muonRate(km), km]);
        }
        if (pts.length > 1) pl.path(pts, { color: accent, width: 1.9 });
        txt(g, L('muons'), pl.X(muonRate(0.38)) + 12, pl.Y(0.38), { color: accent, alpha: 0.95 * rv });

        // surface rate
        txt(g, `${sci(I0, 2)} ${L('unit')}`, pl.X(I0) - 2, R.y - 28, { mono: true, align: 'right', alpha: 0.95 * rv });
        txt(g, L('perCm'), pl.X(I0) - 2, R.y - 12, { align: 'right', alpha: 0.7 * rv });

        // two sites
        const sites = [
          { km: 1, key: 'superk' },
          { km: 1.5, key: 'homestake' },
        ];
        sites.forEach((st, i) => {
          if (rv < st.km / 2) return;
          const I = muonRate(st.km);
          pl.dot(I, st.km, 3.8, accent);
          const x = pl.X(I) + 10;
          txt(g, L(st.key), x, pl.Y(st.km) - 8, { alpha: 0.95 });
          txt(g, `${sci(I, 1)} ${L('unit')}`, x, pl.Y(st.km) + 8, { mono: true, alpha: 0.9 });
          if (i === 0 && R.h > 300) txt(g, `= ${sci(I / I0, 1)} ${L('ofSurface')}`, x, pl.Y(st.km) + 24, { alpha: 0.75 });
        });

        // neutrinos pass through unchanged
        const xn = R.x + R.w + 18;
        nuLine(g, xn, R.y - 22, xn, R.y + R.h, 0.85, env.reduced ? 0 : -s.t * 30);
        const tw = Math.min(150, R.w * 0.45);
        para(g, L('nuPass'), xn - 12 - tw, pl.Y(1.85), tw, { align: 'left', alpha: 0.85, lh: 15 });
        txt(g, 'ν', xn, R.y - 32, { align: 'center', alpha: 0.9 });
      },
    });
  },
} satisfies SceneModule;
export default mod;

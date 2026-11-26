/**
 * sc.iv-curve — schematic I–V and C–V of a reversed-biased silicon diode.
 *  iv: I ∝ √V (depleted volume grows, I ∝ W) until V_fd, then a plateau (volume fixed), then avalanche breakdown at V_bd.
 *      Log current axis, only "low"/"high" ticks. V_fd = 70 V from SC.VFD_REF_V (N_eff = 10¹² cm⁻³, 300 µm).
 *  cv: C = εA/W ∝ 1/√V below V_fd, constant (εA/d) above; 1/C² ∝ V up to V_fd, then flat. The knee is the intersection of the
 *      two straight lines (dashed extrapolations).
 * Shapes only; no measured points.
 */
import type { SceneModule } from '../shared/types';
import { plot, plotRect } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { fadeStage, txt, clamp, type Fr, type G, wideOf } from './_sc3-common';

const STATES = ['iv', 'cv'] as const;
const VFD = SC.VFD_REF_V.value as number;
const VBD = 230;
const VMAX = 300;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const vTicks = [
      { v: 0, label: '0' },
      { v: VFD, label: L('vfd') },
      { v: VBD, label: L('vbd') },
    ];

    // I(V): relative units; I0 = leakage at V_fd. The √V rise and the plateau are the textbook shapes.
    const I = (V: number) => {
      const bulk = 0.12 + 0.88 * Math.sqrt(Math.min(V, VFD) / VFD) * (1 + 0.0006 * Math.max(0, V - VFD));
      return bulk + 0.5 * Math.exp((V - VBD) / 9);
    };
    // C(V)/C_d (C_d = εA/d): W/d = √(V/V_fd) → C/C_d = √(V_fd/V) below V_fd, 1 above.
    const C = (V: number) => (V >= VFD ? 1 : Math.sqrt(VFD / Math.max(V, 1e-3)));
    const invC2 = (V: number) => (V >= VFD ? 1 : V / VFD);

    const drawIV = (g: G, f: Fr) => {
      const r = plotRect(f.w, f.h, { l: 52, r: 24, t: 34, b: 52 });
      const pl = plot(
        g,
        ctx,
        r,
        { min: 0, max: VMAX, label: L('bias'), ticks: vTicks },
        { min: 0.1, max: 300, log: true, label: L('current'), ticks: [{ v: 1, label: L('low') }, { v: 100, label: L('high') }] },
      );
      const prog = clamp(f.ts / 2.2);
      // regions
      g.save();
      g.globalAlpha = 0.07;
      g.fillStyle = accent;
      g.fillRect(pl.X(VFD), r.y, pl.X(VBD) - pl.X(VFD), r.h);
      g.restore();
      pl.vline(VFD, { dash: [3, 4], color: fg });
      pl.vline(VBD, { dash: [3, 4], color: fg });
      pl.axes();
      pl.curve(I, { color: accent, width: 1.75, progress: prog }, 300);
      txt(g, L('partial'), pl.X(VFD / 2), r.y + 14, { align: 'center' });
      txt(g, L('full'), pl.X((VFD + VBD) / 2), r.y + 14, { align: 'center' });
      txt(g, L('breakdown'), pl.X(VBD) + 8, r.y + 14);
      txt(g, L('plateau'), pl.X((VFD + VBD) / 2), pl.Y(I(150)) - 14, { align: 'center', color: accent, alpha: 0.9 * prog });
      txt(g, L('sqrtV'), pl.X(VFD * 0.45), pl.Y(I(VFD * 0.45)) - 16, { align: 'center', color: accent, alpha: 0.9 * prog });
    };

    const drawCV = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const rA = wide ? plotRect(f.w / 2, f.h, { l: 48, r: 18, t: 34, b: 52 }) : plotRect(f.w, f.h / 2, { l: 52, r: 24, t: 30, b: 40 });
      const rB = wide
        ? { ...rA, x: rA.x + f.w / 2 }
        : { ...rA, y: rA.y + f.h / 2 };
      const prog = clamp(f.ts / 2.2);
      const xa = { min: 0, max: VMAX, ticks: vTicks.slice(0, 2) };

      // C(V)
      const pa = plot(g, ctx, rA, { ...xa, label: wide ? L('bias') : undefined }, { min: 0, max: 3, label: 'C / C_d', ticks: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }] });
      pa.hline(1, { dash: [3, 4], color: fg, alpha: 0.35 });
      pa.vline(VFD, { dash: [3, 4], color: fg });
      pa.axes();
      pa.curve((V) => C(Math.max(V, 8)), { color: accent2, width: 1.75, progress: prog }, 300);
      pa.text(VFD + 8, 1.35, L('capFlat'), { color: accent2, alpha: 0.9 * prog });
      pa.text(VFD * 0.28, 2.65, '∝ 1/√V', { color: accent2, mono: true, align: 'left', alpha: 0.9 * prog });

      // 1/C²
      const pb = plot(g, ctx, rB, { ...xa, label: L('bias') }, { min: 0, max: 1.3, label: '1/C² (a.u.)', ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }] });
      pb.vline(VFD, { dash: [3, 4], color: fg });
      pb.axes();
      // extrapolated straight lines meeting at the knee
      pb.path([[VFD, 1], [1.3 * VFD, 1.3]], { color: fg, dash: [3, 4], alpha: 0.4 });
      pb.curve(invC2, { color: accent, width: 1.75, progress: prog }, 300);
      pb.dot(VFD, 1, 3.5, accent2);
      pb.text(VFD + 10, 0.88, L('knee'), { color: accent2, alpha: 0.95 });
      pb.text(VFD * 0.45, 0.22, L('slope'), { align: 'left', color: accent, alpha: 0.9 * prog });
    };

    return fadeStage(ctx, { states: STATES, draws: { iv: drawIV, cv: drawCV }, anim: 3 });
  },
};
export default mod;

/**
 * nu.flavours — three charged-lepton/neutrino pairs, then what makes a neutrino different.
 *   three:   (νₑ, e), (ν_μ, μ), (ν_τ, τ). Open circle = no electric charge, filled = charged. The charged-lepton masses sit on a
 *            log axis (0.511, 105.7, 1776.9 MeV; PDG). Neutrino masses are not on this axis: they are far below it.
 *   neutral: a neutrino path (dashed) goes through an atom untouched; log axis in eV: neutrino mass < 0.45 eV (KATRIN, NU.M_NU_KATRIN_EV)
 *            against the electron at 511 000 eV (ratio < 10⁻⁶).
 */
import type { SceneModule } from '../shared/types';
import { NU } from '../../data/neutrinos';
import { arrow, createStage, dot, FLAVOUR_COLORS, line, logAxis, nuLine, para, sup, txt, type G } from './_n1-common';

const STATES = ['three', 'neutral'] as const;
type P = { nt: number };
const TARGETS: Record<string, P> = { three: { nt: 0 }, neutral: { nt: 1 } };

const FL = [
  { key: 'e', nu: 'ν_e', l: 'e⁻', m: 0.511, ml: '0.511' },
  { key: 'mu', nu: 'ν_μ', l: 'μ⁻', m: 105.66, ml: '105.7' },
  { key: 'tau', nu: 'ν_τ', l: 'τ⁻', m: 1776.9, ml: '1777' },
] as const;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const decades = (a: number, b: number, step = 1) => {
      const out: { v: number; label: string }[] = [];
      for (let e = a; e <= b; e += step) out.push({ v: 10 ** e, label: `10${sup(e)}` });
      return out;
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['neutral'],
      draw(g: G, s, p, env) {
        const { w, h } = s;
        const nt = p.nt;
        const mx0 = 36;
        const mw = w - 2 * mx0 - 8;
        const axY = Math.round(h * 0.84);

        // ---- three pairs
        if (nt < 0.99) {
          const a = 1 - nt;
          g.save();
          g.globalAlpha = a;
          const zoneH = axY - 120;
          const rowGap = Math.min(110, zoneH * 0.5);
          const top = Math.max(18, (zoneH - (34 + rowGap)) / 2);
          FL.forEach((f, i) => {
            const cx = w * (i + 0.5) / 3;
            const col = FLAVOUR_COLORS[i];
            txt(g, L(f.key), cx, top, { align: 'center', alpha: 1 });
            const y1 = top + 34;
            const y2 = y1 + rowGap;
            line(g, cx, y1 + 14, cx, y2 - 12, { color: col, alpha: 0.6, width: 1 });
            txt(g, 'W', cx + 6, (y1 + y2) / 2, { alpha: 0.55 });
            // neutrino: open, dashed ring
            g.save();
            g.strokeStyle = col;
            g.lineWidth = 1.5;
            g.setLineDash([3, 2.5]);
            g.beginPath();
            g.arc(cx, y1, 13, 0, Math.PI * 2);
            g.stroke();
            g.restore();
            txt(g, f.nu, cx + 22, y1, { alpha: 1 });
            dot(g, cx, y2, 11, col);
            txt(g, f.l, cx + 22, y2, { alpha: 1 });
          });
          g.restore();
          // legend
          txt(g, L('legend'), mx0 - 12, axY - 94 - 4, { alpha: 0.6 * a });
        }

        // ---- charged-lepton mass axis (MeV)
        if (nt < 0.99) {
          const a = 1 - nt;
          g.save();
          g.globalAlpha = a;
          const X = logAxis(g, mx0, axY, mw, 0.1, 1e4, decades(-1, 4), fg);
          txt(g, L('massAxis'), mx0 + mw, axY + 32, { align: 'right', alpha: 0.85 });
          FL.forEach((f, i) => {
            const x = X(f.m);
            const col = FLAVOUR_COLORS[i];
            dot(g, x, axY, 4.5, col);
            txt(g, f.l.replace('⁻', ''), x, axY - 38, { align: 'center', alpha: 1 });
            txt(g, `${f.ml} MeV`, x, axY - 22, { align: 'center', mono: true, alpha: 0.9 });
          });
          g.restore();
        }

        // ---- neutral: atom + neutrino path, eV axis
        if (nt > 0.01) {
          const a = nt;
          g.save();
          g.globalAlpha = a;
          const cx = w / 2;
          const zoneTop = Math.max(18, h * 0.06);
          const cy = zoneTop + (axY - 130 - zoneTop) / 2 + 30;
          const rx = Math.min(w * 0.26, 110);
          // electron orbits (not to scale: atom is 10⁵ times larger than the nucleus)
          for (const [k, sp] of [[0.55, 0.9], [1, -0.6]] as const) {
            g.save();
            g.strokeStyle = fg;
            g.globalAlpha = 0.3 * a;
            g.lineWidth = 1;
            g.beginPath();
            g.ellipse(cx, cy, rx * k, rx * k * 0.8, 0, 0, Math.PI * 2);
            g.stroke();
            g.restore();
            const ang = (env.reduced ? 1 : s.t) * sp + k * 3;
            dot(g, cx + Math.cos(ang) * rx * k, cy + Math.sin(ang) * rx * k * 0.8, 2.5, fg, 0.9 * a);
          }
          // nucleus
          for (let j = 0; j < 7; j++) {
            const ang = (j / 7) * Math.PI * 2;
            dot(g, cx + Math.cos(ang) * 4.5 * (j ? 1 : 0), cy + Math.sin(ang) * 4.5 * (j ? 1 : 0), 3, j % 2 ? accent : accent2, a);
          }
          // neutrino path, straight through
          const yN = cy - 4;
          nuLine(g, mx0 - 12, yN, w - mx0 + 12, yN, 0.85 * a, env.reduced ? 0 : -s.t * 30);
          arrow(g, w - mx0 + 4, yN, w - mx0 + 14, yN, { color: fg, alpha: 0.7 * a, head: 6 });
          txt(g, 'ν', mx0 - 12, yN - 12, { alpha: 0.9 * a });
          const tw = Math.min(w - 2 * mx0, 440);
          para(g, L('weakOnly'), cx - tw / 2, zoneTop, tw, { align: 'left', alpha: 0.9 * a, lh: 16 });
          txt(g, L('atomNote'), cx, cy + rx * 0.8 + 18, { align: 'center', alpha: 0.6 * a });
          g.restore();

          // eV axis
          g.save();
          g.globalAlpha = a;
          const X = logAxis(g, mx0, axY, mw, 1e-2, 1e6, decades(-2, 6, 2), fg);
          txt(g, L('eVAxis'), mx0 + mw, axY + 32, { align: 'right', alpha: 0.85 });
          const mN = NU.M_NU_KATRIN_EV.value as number;
          const mE = 511000;
          // neutrino: everything below the limit
          g.fillStyle = accent2;
          g.globalAlpha = 0.9 * a;
          g.fillRect(mx0, axY - 7, X(mN) - mx0, 5);
          arrow(g, X(mN) - 10, axY - 18, mx0 + 2, axY - 18, { color: accent2, alpha: 0.9 * a, head: 6, width: 1.25 });
          g.globalAlpha = a;
          txt(g, `ν  < ${mN} eV`, mx0 + 2, axY - 34, { mono: true, color: accent2, alpha: 1 });
          dot(g, X(mE), axY, 4.5, accent);
          txt(g, L('electron'), X(mE), axY - 38, { align: 'center', color: accent, alpha: 1 });
          txt(g, '511 000 eV', X(mE), axY - 22, { align: 'center', mono: true, alpha: 0.9 });
          // the ratio
          const yb = axY - 64;
          arrow(g, X(mN), yb, X(mE) - 2, yb, { color: fg, alpha: 0.6 * a, width: 1, head: 6 });
          arrow(g, X(mE) - 2, yb, X(mN), yb, { color: fg, alpha: 0.6 * a, width: 1, head: 6 });
          txt(g, L('ratio'), (X(mN) + X(mE)) / 2, yb - 12, { align: 'center', alpha: 0.9 });
          g.restore();
        }
      },
    });
  },
} satisfies SceneModule;
export default mod;

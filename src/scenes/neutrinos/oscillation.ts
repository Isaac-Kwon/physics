/**
 * nu.oscillation — flavour change with L/E.
 *   produce / fly / detect: a neutrino born as νₑ, drawn as a bar split into the three flavour probabilities. Two-flavour sketch of the
 *     solar sector, νₑ ↔ ν_x, with ν_x shared equally between ν_μ and ν_τ (θ₂₃ ≈ 45°, θ₁₃ neglected):
 *       P(νₑ→ν_x) = sin²2θ₁₂ · sin²(1.27 Δm²₂₁ L/E),  sin²2θ₁₂ = 0.85, Δm²₂₁ = 7.5×10⁻⁵ eV²   (L in km, E in GeV; NU.*)
 *     The bar's position is L/E; the curves below are the same three probabilities, so bar and plot cannot disagree.
 *   probability-plot: P(ν_μ→ν_μ) = 1 − sin²2θ₂₃ · sin²(1.27 Δm²₃₂ L/E), sin²2θ₂₃ = 1, Δm² = 2.5×10⁻³ eV² (same formula as the Oscillation widget).
 *   solar-deficit: qualitative fractions only (Homestake ≈ 1/3 of the prediction; SNO's neutral-current total = the prediction).
 */
import type { SceneModule } from '../shared/types';
import { lerp } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { createStage, DM2_ATM, DM2_SOL, FLAVOUR_COLORS, line, makeLayer, pTransition, S22_ATM, S22_SOL, sci, txt, para, type G } from './_n1-common';

const STATES = ['produce', 'fly', 'detect', 'probability-plot', 'solar-deficit'] as const;
type P = { fl: number; de: number; tr: number; at: number; sd: number };
const TARGETS: Record<string, P> = {
  produce: { fl: 0, de: 0, tr: 1, at: 0, sd: 0 },
  fly: { fl: 1, de: 0, tr: 1, at: 0, sd: 0 },
  detect: { fl: 1, de: 1, tr: 1, at: 0, sd: 0 },
  'probability-plot': { fl: 0, de: 0, tr: 0, at: 1, sd: 0 },
  'solar-deficit': { fl: 0, de: 0, tr: 0, at: 0, sd: 1 },
};

const XMAX = 25000; // km/GeV, track and plot axis; the detector sits at the right end
const probs = (x: number): [number, number, number] => {
  const pt = pTransition(S22_SOL, DM2_SOL, x);
  return [1 - pt, pt / 2, pt / 2];
};
const pMuMu = (x: number) => 1 - pTransition(S22_ATM, DM2_ATM, x);
const LOOP = 10; // s per flight

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, fg } = ctx.theme;
    const lyA = makeLayer();
    const lyB = makeLayer();
    const NAMES = ['ν_e', 'ν_μ', 'ν_τ'];

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['fly'],
      draw(g: G, s, p, env) {
        const { w, h } = s;
        const mxL = 42;
        const mxR = 92;
        const pw = Math.max(80, w - mxL - mxR);
        const X = (x: number) => mxL + (x / XMAX) * pw;
        const trackY = Math.round(Math.max(h * 0.2, 64));
        const BW = Math.min(112, pw * 0.42);

        // position of the bar along the path (L/E)
        const loopFrac = env.reduced ? 0.5 : Math.min(1, (s.t % LOOP) / (LOOP * 0.85));
        const q = lerp(p.fl * loopFrac, 1, p.de);
        const xq = q * XMAX;

        if (p.tr > 0.01) {
          g.save();
          g.globalAlpha = p.tr;
          // legend
          let lx = mxL;
          NAMES.forEach((n, i) => {
            g.fillStyle = FLAVOUR_COLORS[i];
            g.fillRect(lx, 12, 10, 10);
            txt(g, n, lx + 15, 17, { alpha: 0.9 });
            lx += 56;
          });
          // path, source, detector
          line(g, X(0), trackY, X(XMAX), trackY, { color: fg, alpha: 0.25, width: 1 });
          txt(g, L('source'), X(0), trackY - 30, { align: 'center', alpha: 0.8 });
          line(g, X(0), trackY - 22, X(0), trackY - 14, { color: fg, alpha: 0.6 });
          const dw = BW + 18;
          g.strokeStyle = fg;
          g.globalAlpha = 0.6 * p.tr;
          g.lineWidth = 1.25;
          g.strokeRect(X(XMAX) - dw / 2 + 6, trackY - 24, dw, 48);
          g.globalAlpha = p.tr;
          txt(g, L('detector'), X(XMAX) + 6, trackY - 36, { align: 'center', alpha: 0.8 });
          // the bar: widths = probabilities
          const pr = probs(xq);
          const bh = 14 + 8 * p.de;
          let bx = X(xq) - BW / 2 + (q >= 1 ? 6 : 0);
          const bx0 = bx;
          pr.forEach((v, i) => {
            g.fillStyle = FLAVOUR_COLORS[i];
            g.globalAlpha = p.tr;
            g.fillRect(bx, trackY - bh / 2, BW * v, bh);
            bx += BW * v;
          });
          // values under the bar
          let cx = bx0;
          pr.forEach((v, i) => {
            const wseg = BW * v;
            if (wseg > 26 && q < 0.02) {
              txt(g, v >= 0.995 ? '100%' : v.toFixed(2), cx + wseg / 2, trackY + bh / 2 + 14, { align: 'center', mono: true, alpha: 0.9 * p.tr });
            }
            cx += wseg;
          });
          if (p.de > 0.02) {
            const txs = pr.map((v, i) => `${NAMES[i]} ${v.toFixed(2)}`).join('    ');
            txt(g, txs, X(XMAX) + 6 + dw / 2, trackY + 38, { align: 'right', alpha: 0.9 * p.de * p.tr });
          }
          g.restore();
        }

        // ---- solar-sector probabilities vs L/E (same numbers as the bar)
        const PR = { x: mxL, y: h * 0.42, w: pw, h: h - 66 - h * 0.42 };
        lyA(g, w, h, p.tr, (g2) => {
          const pl = plot(
            g2,
            ctx,
            PR,
            { min: 0, max: XMAX, label: L('xLabel'), ticks: [0, 10000, 20000].map((v) => ({ v, label: String(v) })) },
            { min: 0, max: 1, label: L('yLabel'), ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }] },
          );
          pl.axes();
          const prog = Math.max(0.0001, q);
          pl.curve((x) => probs(x)[0], { color: FLAVOUR_COLORS[0], width: 1.75, progress: prog }, 300);
          pl.curve((x) => probs(x)[1], { color: FLAVOUR_COLORS[1], width: 1.75, progress: prog }, 300);
          pl.curve((x) => probs(x)[2], { color: FLAVOUR_COLORS[2], width: 1.75, dash: [5, 4], progress: prog }, 300);
          if (q > 0.001) {
            pl.vline(xq, { color: fg, alpha: 0.4, dash: [2, 3] });
            probs(xq).forEach((v, i) => pl.dot(xq, v, 3.2, FLAVOUR_COLORS[i]));
          }
          txt(g2, `Δm² = ${sci(DM2_SOL)} eV²,  sin²2θ = ${S22_SOL}`, PR.x, PR.y + PR.h + 44, { alpha: 0.7 });
          // direct labels at the right end of the curves (final values at the detector are in the bar)
          txt(g2, 'ν_e', pl.X(XMAX * 0.03), pl.Y(0.8), { color: FLAVOUR_COLORS[0], alpha: 1 });
          txt(g2, 'ν_μ, ν_τ', pl.X(XMAX * 0.03), pl.Y(0.13), { color: FLAVOUR_COLORS[1], alpha: 1 });
        });

        // ---- atmospheric survival probability
        const PA = { x: mxL, y: 40, w: w - mxL - 22, h: h - 40 - 66 };
        lyB(g, w, h, p.at, (g2) => {
          const pl = plot(
            g2,
            ctx,
            PA,
            { min: 0, max: 1500, label: L('xLabelAtm'), ticks: [0, 500, 1000, 1500].map((v) => ({ v, label: String(v) })) },
            { min: 0, max: 1.2, label: L('yLabelAtm'), ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }] },
          );
          pl.axes();
          pl.hline(1, { color: fg, dash: [3, 4], alpha: 0.3 });
          pl.curve(pMuMu, { color: accent, width: 1.9, progress: Math.min(1, 0.001 + p.at) }, 400);
          const xm = Math.PI / 2 / (1.27 * DM2_ATM); // first minimum, ≈ 495 km/GeV
          pl.vline(xm, { color: fg, alpha: 0.5, dash: [3, 3] });
          pl.dot(xm, pMuMu(xm), 3.8, accent);
          pl.text(xm, 1.13, L('firstMin'), { align: 'center', alpha: 0.95 });
          txt(g2, `Δm² = ${sci(DM2_ATM)} eV²,  sin²2θ = ${S22_ATM}`, PA.x, PA.y + PA.h + 44, { alpha: 0.7 });
        });

        // ---- solar deficit bars (qualitative)
        if (p.sd > 0.01) {
          const a = p.sd;
          g.save();
          g.globalAlpha = a;
          const bx = 24;
          const bw = Math.min(w - 48, 560);
          const bh = 18;
          let y = Math.max(16, h * 0.07);
          const bar = (label: string, frac: number[], cols: (string | null)[], note?: string) => {
            txt(g, label, bx, y, { alpha: 0.9 });
            y += 16;
            let x = bx;
            frac.forEach((f, i) => {
              if (cols[i]) {
                g.fillStyle = cols[i]!;
                g.globalAlpha = a;
                g.fillRect(x, y, bw * f, bh);
              } else {
                g.strokeStyle = fg;
                g.globalAlpha = 0.5 * a;
                g.lineWidth = 1;
                g.strokeRect(x + 0.5, y + 0.5, bw * f - 1, bh - 1);
              }
              x += bw * f;
            });
            g.globalAlpha = a;
            if (note) txt(g, note, bx + bw * frac[0] + 8, y + bh / 2, { alpha: 0.95 });
            y += bh + 10;
          };
          bar(L('prediction'), [1], [null]);
          y += 2;
          bar(L('homestake'), [0.33, 0.67], [FLAVOUR_COLORS[0], null], L('aThird'));
          y += 6;
          bar(L('prediction'), [1], [null]);
          y += 2;
          // SNO: all three flavours add up to the prediction
          bar(L('sno'), [0.33, 0.335, 0.335], [FLAVOUR_COLORS[0], FLAVOUR_COLORS[1], FLAVOUR_COLORS[2]]);
          const segs = [
            ['ν_e', 0, 0.33],
            ['ν_μ', 0.33, 0.335],
            ['ν_τ', 0.665, 0.335],
          ] as const;
          segs.forEach(([n, f0, fw]) => txt(g, n, bx + bw * (f0 + fw / 2), y - 14 - 9, { align: 'center', alpha: 0.95, color: n === 'ν_τ' ? '#0b0e14' : '#ffffff' }));
          txt(g, L('snoNote'), bx, y + 2, { alpha: 0.85 });
          txt(g, L('tick0'), bx, y + 28, { mono: true, alpha: 0.6 * a });
          txt(g, L('tick1'), bx + bw, y + 28, { align: 'right', alpha: 0.7 * a });
          g.restore();
        }
      },
    });
  },
} satisfies SceneModule;
export default mod;

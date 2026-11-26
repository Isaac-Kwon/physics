/**
 * sc.mip-charge — a minimum-ionizing particle crossing a 300 µm silicon sensor (side view, drawn to scale).
 *   crossing: the sensor, the track, a 100 µm sheet of paper for scale.
 *   pairs:    e–h pairs appear along the track: 80 pairs per µm (most probable; mean ≈ 108), N = 80 µm⁻¹ × depth.
 *             One drawn marker (filled dot + open ring) stands for 400 pairs (5 µm of track).
 * Quantities: marker = 400 pairs; counter = 80 µm⁻¹ × depth reached; geometry in µm at one common px/µm.
 */
import type { SceneModule } from '../shared/types';
import { clamp, lerp } from '../shared/canvas2d';
import { PH, createStage, dimLine, electronDot, holeRing, line, sci, txt, type G } from './_sc1-common';

const STATES = ['crossing', 'pairs'] as const;
type P = { pairs: number };
const TARGETS: Record<string, P> = { crossing: { pairs: 0 }, pairs: { pairs: 1 } };

const PAPER_UM = 100;
const PER_MARKER = 400;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;

    const draw = (g: G, s: { w: number; h: number }, p: P, env: { state: string; ts: number }) => {
      const { w, h } = s;
      const wide = w >= 560 || h < 300;
      const short = h < 300 && w < 560;
      const D = PH.D_UM;
      const SW = short ? 120 : 300; // drawn lateral width, µm
      const left = short ? 92 : wide ? 96 : 70;
      const S = short ? (h - 80) / D : wide ? Math.min((h - 120) / D, (w - left - 130) / 450) : Math.min((h - 190) / D, (w - left - 90) / 450);
      const sx0 = left;
      const sy0 = wide ? Math.max(52, (h - D * S) / 2 + 10) : 56;
      const sw = SW * S;
      const sh = D * S;
      const xc = sx0 + sw / 2;

      // timeline: particle position (µm below the top surface); −1 … 1 = before / after the sensor
      const run = 1.6;
      const f = env.ts >= 1e3 ? 1 : clamp(env.ts / run);
      const pad = 36 / S; // µm of track drawn above / below the sensor
      const zP = lerp(-pad, D + pad, f);
      const zF = clamp(zP, 0, D); // depth reached inside the sensor

      // sensor
      g.fillStyle = accent;
      g.globalAlpha = 0.1;
      g.fillRect(sx0, sy0, sw, sh);
      g.globalAlpha = 1;
      g.strokeStyle = accent;
      g.lineWidth = 1.25;
      g.globalAlpha = 0.9;
      g.strokeRect(sx0, sy0, sw, sh);
      g.globalAlpha = 1;
      line(g, sx0, sy0 - 3, sx0 + sw, sy0 - 3, accent2, 0.9, 2.5);
      line(g, sx0, sy0 + sh + 3, sx0 + sw, sy0 + sh + 3, accent2, 0.9, 2.5);
      if (!short) txt(g, L('silicon'), sx0 + 8, sy0 + 14, { alpha: 0.7 });
      // thickness dimension
      const dx = sx0 - 26;
      dimLine(g, dx, sy0, dx, sy0 + sh, fg, 0.7);
      txt(g, `${D} µm`, dx - 8, sy0 + sh / 2, { align: 'right', mono: true });

      // track
      const yTop = sy0 - pad * S;
      const yBot = sy0 + sh + pad * S;
      line(g, xc, yTop, xc, yBot, accent2, 0.35, 1.5);
      const yNow = sy0 + zP * S;
      line(g, xc, yTop, xc, yNow, accent2, 0.95, 1.5);
      if (f < 1) electronDot(g, xc, yNow, accent2, 3.2);
      txt(g, L('mip'), xc + 12, yTop + 6, { color: accent2, alpha: 0.95 });

      // pairs along the track (markers appear as the particle passes)
      const showPairs = p.pairs > 0.02;
      const nMark = Math.floor(D / (PER_MARKER / PH.PAIRS_UM));
      if (showPairs) {
        const stepUm = PER_MARKER / PH.PAIRS_UM;
        for (let k = 0; k < nMark; k++) {
          const z = (k + 0.5) * stepUm;
          if (z > zF) break;
          const y = sy0 + z * S;
          electronDot(g, xc - 3.5, y, accent, 2.2, p.pairs);
          holeRing(g, xc + 3.5, y, accent2, 2.2, p.pairs, 1.1);
        }
      }

      // paper strip for scale (edge-on, same px/µm)
      const paperW = 150 * S;
      const paperH = PAPER_UM * S;
      const px = wide ? sx0 + sw + 28 : sx0 + sw + 10;
      const py = sy0 + sh - paperH;
      g.fillStyle = fg;
      g.globalAlpha = 0.14;
      g.fillRect(px, py, paperW, paperH);
      g.globalAlpha = 0.55;
      g.strokeStyle = fg;
      g.lineWidth = 1;
      g.strokeRect(px, py, paperW, paperH);
      g.globalAlpha = 1;
      dimLine(g, px + paperW + 8, py, px + paperW + 8, py + paperH, fg, 0.6);
      txt(g, `≈ ${PAPER_UM} µm`, px + paperW + 16, py + paperH / 2, { mono: true, alpha: 0.8 });
      txt(g, L('paper'), px, py - 12, { alpha: 0.7 });

      // readout column
      const tx = wide ? sx0 + sw + 28 : sx0;
      let ty = wide ? sy0 + 12 : sy0 + sh + 36;
      const N = Math.round(PH.PAIRS_UM * zF);
      const sh1 = (str: string, o: { mono?: boolean; color?: string; alpha?: number } = {}) => {
        txt(g, str, tx, ty, { alpha: 0.85, ...o });
        ty += 19;
      };
      if (showPairs) {
        g.save();
        g.globalAlpha = p.pairs;
        txt(g, `N = ${PH.PAIRS_UM} µm⁻¹ × ${ctx.formatNumber(Math.round(zF))} µm`, tx, ty, { mono: true, alpha: p.pairs });
        ty += 19;
        txt(g, `≈ ${sci(Math.round(N / 100) * 100, 2)} ${L('pairsUnit')}`, tx, ty, { mono: true, color: accent, alpha: p.pairs });
        ty += 22;
        txt(g, L('markerKey'), tx, ty, { alpha: 0.65 * p.pairs });
        ty += 19;
        if (!short) txt(g, L('mpv'), tx, ty, { alpha: 0.65 * p.pairs });
        g.restore();
      } else {
        sh1(L('crossingNote'), { alpha: 0.7 });
      }
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, anim: { crossing: 1.8, pairs: 1.8 }, draw });
  },
};
export default mod;

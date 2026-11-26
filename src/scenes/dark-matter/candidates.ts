/**
 * dm.candidates — Canvas2D, steps. A logarithmic mass axis in eV from 10⁻²² to 10⁶⁸ (90 decades, drawn with plot()).
 * Bands (order of magnitude, src/data/dark-matter.ts): fuzzy 10⁻²²–10⁻⁶ eV · axion 10⁻⁶–10⁻³ eV · sterile ν 1–50 keV ·
 * WIMP 1 GeV–10 TeV · primordial black holes 10¹⁷–10²² g (1 g = 5.61×10³² eV → 10⁴⁹·⁷–10⁵⁴·⁷ eV).
 * Reference marks: electron 0.511 MeV, proton 0.938 GeV, Sun 2×10³⁰ kg = 1.1×10⁶⁶ eV.
 * Each state reveals one more band and labels only the current one (the others stay as dim bands), so labels never collide.
 */
import type { SceneModule } from '../shared/types';
import { FONT_MONO, FONT_SANS, plot } from '../shared/plot';
import { createStage, pow10, txt, type G } from './_dm1-common';

const STATES = ['axis', 'axion', 'wimp', 'sterile', 'pbh'] as const;
type P = { rA: number; rW: number; rS: number; rP: number; fA: number; fW: number; fS: number; fP: number };
const Z: P = { rA: 0, rW: 0, rS: 0, rP: 0, fA: 0, fW: 0, fS: 0, fP: 0 };
const TARGETS: Record<string, P> = {
  axis: { ...Z },
  axion: { ...Z, rA: 1, fA: 1 },
  wimp: { ...Z, rA: 1, rW: 1, fW: 1 },
  sterile: { ...Z, rA: 1, rW: 1, rS: 1, fS: 1 },
  pbh: { ...Z, rA: 1, rW: 1, rS: 1, rP: 1, fP: 1 },
};
const E0 = -22;
const E1 = 68;
const G_TO_EV = Math.log10(5.61e32);
const REF = [
  { key: 'electron', e: Math.log10(0.511e6), row: 1, align: 'right' as const },
  { key: 'proton', e: Math.log10(0.938e9), row: 2, align: 'left' as const },
  { key: 'sun', e: Math.log10(1.989e30 * 5.61e35), row: 1, align: 'right' as const },
];
const BANDS = {
  fuzzy: [-22, -6],
  axion: [-6, -3],
  wimp: [9, 13],
  sterile: [3, Math.log10(5e4)],
  pbh: [17 + G_TO_EV, 22 + G_TO_EV],
} as const;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, fg } = ctx.theme;

    const label = (g: G, W: number, text: string, cx: number, y: number, o: { mono?: boolean; alpha?: number; color?: string } = {}) => {
      g.save();
      g.font = o.mono ? FONT_MONO : FONT_SANS;
      const w = g.measureText(text).width;
      g.restore();
      txt(g, text, Math.min(Math.max(cx - w / 2, 8), W - 8 - w), y, { ...o });
    };

    const wave = (g: G, cx: number, cy: number, kind: 'axion' | 'wimp' | 'sterile' | 'pbh', a: number) => {
      g.save();
      g.globalAlpha = a;
      g.strokeStyle = accent;
      g.fillStyle = accent;
      g.lineWidth = 1.25;
      const sine = (x0: number, x1: number, amp: number, per: number) => {
        g.beginPath();
        for (let x = x0; x <= x1; x += 1) {
          const y = cy + amp * Math.sin(((x - x0) / per) * Math.PI * 2);
          x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      };
      if (kind === 'axion') sine(cx - 32, cx + 32, 8, 32);
      if (kind === 'wimp') {
        g.beginPath();
        g.arc(cx - 30, cy, 3, 0, Math.PI * 2);
        g.fill();
        sine(cx - 24, cx + 14, 4, 12);
        g.strokeStyle = ctx.theme.fg;
        g.beginPath();
        g.arc(cx + 22, cy, 8, 0, Math.PI * 2);
        g.stroke();
      }
      if (kind === 'sterile') {
        g.beginPath();
        g.arc(cx - 34, cy, 3, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(cx - 26, cy);
        g.lineTo(cx - 6, cy);
        g.stroke();
        g.beginPath();
        g.moveTo(cx - 6, cy);
        g.lineTo(cx - 12, cy - 3);
        g.lineTo(cx - 12, cy + 3);
        g.closePath();
        g.fill();
        sine(cx + 2, cx + 36, 5, 14);
      }
      if (kind === 'pbh') {
        g.fillStyle = ctx.theme.bg;
        g.beginPath();
        g.arc(cx, cy, 7, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.strokeStyle = ctx.theme.fg;
        g.globalAlpha = a * 0.7;
        g.beginPath();
        g.ellipse(cx, cy, 19, 6, -0.25, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      draw(g, s, p) {
        const { w: W, h: H } = s;
        const narrow = W < 560;
        const x0 = narrow ? 24 : 40;
        const w = W - x0 - (narrow ? 24 : 40);
        const axisY = Math.round(H * (H < 340 ? 0.5 : 0.6));
        const X = (e: number) => x0 + (w * (e - E0)) / (E1 - E0);
        const tickE: number[] = [];
        for (let e = E0; e <= 62; e += narrow ? 20 : 10) tickE.push(e);
        const pl = plot(
          g,
          ctx,
          { x: x0, y: axisY - 1, w, h: 1 },
          { min: 1e-22, max: 1e68, log: true, ticks: tickE.map((e) => ({ v: 10 ** e, label: pow10(e) })) },
          { min: 0, max: 1, ticks: [] },
        );
        pl.axes();
        txt(g, L('mass'), x0, axisY + 99, { alpha: 0.8 });

        // reference marks
        REF.forEach((r) => {
          const x = X(r.e);
          g.strokeStyle = fg;
          g.lineWidth = 1;
          g.globalAlpha = 0.4;
          g.beginPath();
          g.moveTo(x, axisY);
          g.lineTo(x, axisY + 27 + (r.row === 2 ? 18 : 0));
          g.stroke();
          g.globalAlpha = 0.85;
          g.fillStyle = fg;
          g.beginPath();
          g.moveTo(x, axisY + 22);
          g.lineTo(x - 3.5, axisY + 28);
          g.lineTo(x + 3.5, axisY + 28);
          g.closePath();
          g.fill();
          g.globalAlpha = 1;
          txt(g, L(r.key), x + (r.align === 'right' ? -5 : 5), axisY + 42 + (r.row === 2 ? 18 : 0), { align: r.align, alpha: 0.9 });
        });

        // bracket: about 90 powers of ten
        {
          const by = axisY + 84;
          g.strokeStyle = fg;
          g.globalAlpha = 0.45;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(X(E0), by - 5);
          g.lineTo(X(E0), by);
          g.lineTo(X(E1), by);
          g.lineTo(X(E1), by - 5);
          g.stroke();
          g.globalAlpha = 1;
          txt(g, L('ninety'), x0 + w / 2, by + 15, { align: 'center', alpha: 0.9 });
        }

        // bands
        const band = (e0: number, e1: number, a: number, solid: number) => {
          if (a < 0.01) return;
          const xa = X(e0);
          const xb = Math.max(X(e1), xa + 3);
          g.fillStyle = accent;
          g.globalAlpha = a * (0.2 + 0.55 * solid);
          g.fillRect(xa, axisY - 18, xb - xa, 18);
          g.globalAlpha = a * (0.45 + 0.5 * solid);
          g.strokeStyle = accent;
          g.lineWidth = 1;
          g.strokeRect(xa + 0.5, axisY - 18.5, xb - xa - 1, 18);
          g.globalAlpha = 1;
        };
        band(BANDS.fuzzy[0], BANDS.fuzzy[1], p.rA, 0.15 + 0.5 * p.fA);
        band(BANDS.axion[0], BANDS.axion[1], p.rA, p.fA > 0.5 ? 1 : 0.4);
        band(BANDS.wimp[0], BANDS.wimp[1], p.rW, p.fW > 0.5 ? 1 : 0.4);
        band(BANDS.sterile[0], BANDS.sterile[1], p.rS, p.fS > 0.5 ? 1 : 0.4);
        band(BANDS.pbh[0], BANDS.pbh[1], p.rP, p.fP > 0.5 ? 1 : 0.4);

        // labels of the focused band
        const focusLabel = (key: 'axion' | 'wimp' | 'sterile' | 'pbh', f: number, range: string, e: readonly [number, number]) => {
          if (f < 0.02) return;
          const cx = X((e[0] + e[1]) / 2);
          const yN = axisY - 84;
          label(g, W, L(key), cx, yN, { color: accent, alpha: f });
          label(g, W, range, cx, yN + 16, { mono: true, alpha: 0.9 * f });
          label(g, W, L(`${key}Note`), cx, yN + 32, { alpha: 0.75 * f });
          wave(g, Math.min(Math.max(cx, 52), W - 52), Math.max(16, axisY - 150), key, f);
        };
        focusLabel('axion', p.fA, `${pow10(-6)} – ${pow10(-3)} eV`, BANDS.axion);
        focusLabel('wimp', p.fW, '1 GeV – 10 TeV', BANDS.wimp);
        focusLabel('sterile', p.fS, '1 – 50 keV', BANDS.sterile);
        focusLabel('pbh', p.fP, `${pow10(17)} – ${pow10(22)} g`, BANDS.pbh);
        if (p.fA > 0.02) txt(g, L('fuzzy'), x0, axisY - 29, { alpha: 0.8 * p.fA });
      },
    });
  },
};
export default mod;

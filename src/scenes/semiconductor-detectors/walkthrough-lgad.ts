/**
 * sc.walkthrough-lgad — low-gain avalanche detector (ATLAS HGTD / CMS ETL type), schematic, drawn to scale in depth:
 *   n⁺⁺ electrode 0–1 µm · p⁺ gain layer 1–3 µm (E_peak ≈ 3×10⁵ V/cm) · p bulk 3–50 µm (E ≈ 3×10⁴ V/cm) · total 50 µm (SC.LGAD_THICKNESS_UM).
 * Gain M = 20 (SC.LGAD_GAIN: 10–30). Waveforms in units of the noise rms σₙ: jitter σ_t = σₙ / slope at threshold (noise only).
 * z–t panel: two vertices Δz ≈ 1 mm, Δt ≈ 120 ps, per-track timing ≈ 40 ps (inside the 30–50 ps of SC.LGAD_TIME_PS).
 */
import type { SceneModule } from '../shared/types';
import { gaussian, mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { arrow, box, createStage, dimH, dot, line, makeLayer, plate, sup, txt, type G } from './_sc2-common';

const STATES = ['goal', 'drift', 'gain-layer', 'fast-edge', 'timestamp', 'trick'] as const;
type P = { zt: number; xs: number; fld: number; wv: number; ng: number; jit: number; tsm: number; bars: number };
const mk = (o: Partial<P>): P => ({ zt: 0, xs: 0, fld: 0, wv: 0, ng: 0, jit: 0, tsm: 0, bars: 0, ...o });
const TARGETS: Record<string, P> = {
  goal: mk({ zt: 1 }),
  drift: mk({ xs: 1 }),
  'gain-layer': mk({ xs: 1, fld: 1 }),
  'fast-edge': mk({ wv: 1, ng: 1, jit: 1 }),
  timestamp: mk({ wv: 1, tsm: 1 }),
  trick: mk({ bars: 1 }),
};

const T_TOT = SC.LGAD_THICKNESS_UM.value as number; // 50 µm
const Y_NPP = 1;
const Y_GAIN = 3;
const GAIN = 20; // within SC.LGAD_GAIN [10, 30]
const E_PEAK = 30; // V/µm = 3×10⁵ V/cm
const E_BULK = 3; // V/µm = 3×10⁴ V/cm
const TR = 0.8; // pulse rise time (ns), schematic
const A0 = 8; // no-gain amplitude in noise units
const THR = 5; // threshold in noise units
const TS0 = 0.5; // pulse start (ns)

const E_OF = (y: number) => (y < Y_NPP ? 0 : y < Y_GAIN ? E_PEAK - ((E_PEAK - E_BULK) * (y - Y_NPP)) / (Y_GAIN - Y_NPP) : E_BULK - 0.8 * ((y - Y_GAIN) / (T_TOT - Y_GAIN)));

const shape = (t: number) => (t <= 0 ? 0 : smooth(0, TR, t) * Math.exp(-Math.max(0, t - TR) / 0.6));
/** first time (ns) at which A·shape exceeds thr, and its local slope (noise units per ns). */
const crossing = (A: number) => {
  let t = 0;
  while (A * shape(t) < THR && t < 3) t += 0.0005;
  const slope = (A * shape(t + 0.001) - A * shape(t - 0.001)) / 0.002;
  return { t, slope };
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const F = (v: number, o?: Intl.NumberFormatOptions) => ctx.formatNumber(v, o);
    const { accent, accent2, fg, bg } = ctx.theme;
    const rnd = mulberry32(23);
    const layZ = makeLayer();
    const layX = makeLayer();
    const layW = makeLayer();
    const layB = makeLayer();
    const cA = crossing(A0);
    const cB = crossing(A0 * GAIN);
    const sigA = (1 / cA.slope) * 1000; // ps
    const sigB = (1 / cB.slope) * 1000;

    const ptsA = Array.from({ length: 14 }, () => ({ z: gaussian(rnd) * 0.9, t: gaussian(rnd) * 40 }));
    const ptsB = Array.from({ length: 14 }, () => ({ z: 1.2 + gaussian(rnd) * 0.9, t: 120 + gaussian(rnd) * 40 }));
    const pairs = Array.from({ length: 36 }, (_, i) => ({ y: Y_GAIN + ((i + rnd()) / 36) * (T_TOT - Y_GAIN), dx: (rnd() - 0.5) * 0.35 }));
    const noise = Array.from({ length: 400 }, () => gaussian(rnd));
    // avalanche tree: generation sizes 1 → 20
    const gens = [1, 2, 4, 8, 14, 20];

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['drift', 'gain-layer'],
      anim: { 'gain-layer': 3, 'fast-edge': 3, timestamp: 3 },
      draw(g, s, p, env) {
        const { w, h } = s;
        const narrow = w < 520;

        // ---------- goal: z–t plane ----------
        layZ(g, w, h, p.zt, (g2) => {
          const r = { x: 62, y: 44, w: w - 62 - (narrow ? 22 : 130), h: h - 44 - 76 };
          const pl = plot(g2, ctx, r, { min: -3, max: 4, label: 'z (mm)', ticks: [-2, 0, 2, 4].map((v) => ({ v, label: F(v) })) }, {
            min: -120,
            max: 280,
            label: 't (ps)',
            ticks: [0, 100, 200].map((v) => ({ v, label: F(v) })),
          });
          pl.axes();
          const k = env.reduced ? 1 : smooth(0.9, 2.3, env.ts);
          const draw = (pts: { z: number; t: number }[], col: string) => {
            for (const q of pts) {
              dot(g2, pl.X(q.z), pl.Y(q.t * k + (1 - k) * 0), 3, col, 0.9);
              line(g2, pl.X(q.z), r.y + r.h - 7, pl.X(q.z), r.y + r.h - 1, col, { alpha: 0.9, lw: 1.5 });
              line(g2, r.x + r.w + 1, pl.Y(q.t * k), r.x + r.w + 8, pl.Y(q.t * k), col, { alpha: 0.9, lw: 1.5 });
            }
          };
          draw(ptsA, accent);
          draw(ptsB, accent2);
          // vertices
          for (const [z, t, col] of [[0, 0, accent], [1.2, 120, accent2]] as [number, number, string][]) {
            g2.save();
            g2.strokeStyle = col;
            g2.lineWidth = 1.5;
            g2.globalAlpha = 0.9;
            const x = pl.X(z);
            const y = pl.Y(t * k);
            g2.beginPath();
            g2.moveTo(x - 7, y);
            g2.lineTo(x + 7, y);
            g2.moveTo(x, y - 7);
            g2.lineTo(x, y + 7);
            g2.stroke();
            g2.restore();
          }
          plate(g2, bg, L('vertex1'), pl.X(0) - 10, pl.Y(-52 * k) + 4, { align: 'right', color: accent });
          plate(g2, bg, L('vertex2'), pl.X(1.2) + 10, pl.Y(120 * k + 40), { color: accent2 });
          dimH(g2, pl.X(0), pl.X(1.2), r.y + r.h - 22, `Δz ≈ 1 mm`, fg, { below: false });
          if (k > 0.8) {
            const xr = r.x + r.w + 18;
            line(g2, xr, pl.Y(0), xr, pl.Y(120), fg, { alpha: 0.7 });
            line(g2, xr - 4, pl.Y(0), xr + 4, pl.Y(0), fg, { alpha: 0.7 });
            line(g2, xr - 4, pl.Y(120), xr + 4, pl.Y(120), fg, { alpha: 0.7 });
            if (!narrow) txt(g2, 'Δt ≈ 120 ps', xr + 8, pl.Y(60), { mono: true, alpha: 0.9 });
          }
          txt(g2, L('overlapZ'), r.x + 6, r.y + r.h + 36, { alpha: 0.75 });
          txt(g2, L('apartT'), r.x + r.w, r.y - 14, { align: 'right', alpha: 0.85, color: fg });
          if (!narrow) txt(g2, `${L('perTrack')} ${F(SC.LGAD_TIME_PS.value[0])}–${F(SC.LGAD_TIME_PS.value[1])} ps`, r.x + r.w, r.y + 6, { align: 'right', alpha: 0.75 });
        });

        // ---------- cross-section + field profile + avalanche ----------
        layX(g, w, h, p.xs, (g2) => {
          const y0 = 44;
          const H = h - 44 - 56;
          g2.translate((1 - p.fld) * Math.max(0, w / 2 - 124 - (narrow ? 22 : 42)), 0);
          const S = H / T_TOT;
          const x0 = 124;
          const cw = narrow ? 44 : 84;
          const Y = (u: number) => y0 + u * S;
          const xc = x0 + cw / 2;
          // layers
          box(g2, x0, Y(0), cw, Y(T_TOT) - Y(0), { fill: accent, fa: 0.1, stroke: fg, alpha: 0.4 });
          box(g2, x0, Y(0), cw, Math.max(3, Y(Y_NPP) - Y(0)), { fill: accent2, alpha: 0.95 });
          box(g2, x0, Y(Y_NPP), cw, Y(Y_GAIN) - Y(Y_NPP), { fill: accent, fa: 0.8 });
          box(g2, x0 - 4, Y(0) - 4, cw + 8, 4, { fill: accent2, alpha: 0.6 }); // metal contact
          // labels (right-aligned, left of the column)
          const lx = x0 - 12;
          txt(g2, L('nppElectrode'), lx, Y(0) + 1, { align: 'right', color: accent2, alpha: 1 });
          txt(g2, L('gainLayer'), lx, Y(2) + 13, { align: 'right', color: accent, alpha: 1 });
          txt(g2, L('bulk'), lx, Y(T_TOT * 0.5), { align: 'right', alpha: 0.85 });
          // 50 µm dimension, text rotated, placed at the far left
          g2.save();
          const dx = 24;
          g2.strokeStyle = fg;
          g2.globalAlpha = 0.7;
          g2.beginPath();
          g2.moveTo(dx, Y(0));
          g2.lineTo(dx, Y(T_TOT));
          g2.moveTo(dx - 4, Y(0));
          g2.lineTo(dx + 4, Y(0));
          g2.moveTo(dx - 4, Y(T_TOT));
          g2.lineTo(dx + 4, Y(T_TOT));
          g2.stroke();
          g2.translate(dx - 8, Y(T_TOT * 0.5));
          g2.rotate(-Math.PI / 2);
          g2.font = "11px 'JetBrains Mono Variable', ui-monospace, monospace";
          g2.fillStyle = fg;
          g2.textAlign = 'center';
          g2.textBaseline = 'bottom';
          g2.fillText(`${F(T_TOT)} µm`, 0, 0);
          g2.restore();
          // particle track and pairs: electrons drift up to the n⁺⁺ electrode, holes down to the back
          line(g2, xc, Y(0) - 18, xc, Y(T_TOT), fg, { alpha: 0.5, dash: [4, 4] });
          arrow(g2, xc, y0 - 34, xc, y0 - 10, { color: fg, alpha: 0.8, head: 6 });
          const T = 2.4;
          const tau = env.reduced ? 0.6 : s.t % T;
          for (const q of pairs) {
            const ye = q.y - 40 * tau;
            const yh = q.y + 25 * tau;
            if (ye > Y_GAIN) dot(g2, xc + q.dx * cw, Y(ye), 1.8, accent, 0.95);
            if (yh < T_TOT) dot(g2, xc + q.dx * cw, Y(yh), 1.9, fg, 0.8, true);
          }
          txt(g2, `${L('driftTime')} ≈ ${F(T_TOT / 100, { maximumFractionDigits: 1 })} ns`, x0 + cw + 14, Y(T_TOT * 0.5), { alpha: 0.8 * (1 - p.fld) });
          txt(g2, L('shortDrift'), x0 + cw + 14, Y(T_TOT * 0.5) + 18, { alpha: 0.7 * (1 - p.fld) });

          // field profile
          if (p.fld > 0.01) {
            const fx0 = x0 + cw + 26;
            const fw = Math.min(300, w - fx0 - 16 - Math.max(0, (w / 2 - 166) * 0));
            const FX = (e: number) => fx0 + (e / 34) * fw;
            g2.save();
            g2.globalAlpha = p.fld;
            line(g2, fx0, Y(0), fx0, Y(T_TOT), fg, { alpha: 0.5 });
            line(g2, fx0, Y(T_TOT), fx0 + fw, Y(T_TOT), fg, { alpha: 0.5 });
            g2.strokeStyle = accent;
            g2.lineWidth = 1.75;
            g2.beginPath();
            g2.moveTo(FX(0), Y(0));
            for (let q = 0; q <= 100; q++) {
              const yy = (q / 100) * T_TOT;
              const e = E_OF(yy);
              g2.lineTo(FX(e), Y(yy));
            }
            g2.stroke();
            g2.restore();
            txt(g2, L('fieldAxis'), fx0 + fw, Y(T_TOT) + 14, { align: 'right', alpha: 0.8 * p.fld });
            plate(g2, bg, `3×10⁵ V/cm`, fx0 + fw, Y(Y_NPP) - 14, { mono: true, align: 'right', alpha: p.fld });
            if (!narrow) plate(g2, bg, `≈ 3×10⁴ V/cm`, FX(E_BULK) + 10, Y(T_TOT * 0.22), { mono: true, alpha: p.fld * 0.9 });
            // avalanche tree, in the empty lower part of the field panel
            const tx0 = fx0 + 18;
            const tw = Math.max(70, fw - 24);
            const tTop = Y(T_TOT * 0.42);
            const tBot = Y(T_TOT * 0.93);
            const reveal = env.reduced ? 1 : smooth(0.2, 2.6, env.ts) * gens.length;
            line(g2, x0 + cw, Y(2), tx0 + tw / 2, tTop - 6, fg, { alpha: 0.3 * p.fld, dash: [2, 3] });
            const posX = (gi: number, i: number) => tx0 + ((i + 0.5) / gens[gi]) * tw;
            const posY = (gi: number) => tBot - (gi / (gens.length - 1)) * (tBot - tTop);
            g2.save();
            g2.globalAlpha = 0.8 * p.fld;
            g2.strokeStyle = accent;
            g2.lineWidth = 1;
            for (let gi = 1; gi < gens.length; gi++) {
              if (reveal < gi) break;
              for (let i = 0; i < gens[gi]; i++) {
                const par = Math.floor((i * gens[gi - 1]) / gens[gi]);
                g2.beginPath();
                g2.moveTo(posX(gi - 1, par), posY(gi - 1));
                g2.lineTo(posX(gi, i), posY(gi));
                g2.stroke();
              }
            }
            g2.restore();
            for (let gi = 0; gi < gens.length; gi++) {
              if (reveal < gi) break;
              for (let i = 0; i < gens[gi]; i++) dot(g2, posX(gi, i), posY(gi), gi === gens.length - 1 ? 2.2 : 1.8, accent, p.fld);
            }
            txt(g2, `M ≈ ${F(GAIN)}`, tx0 + tw / 2, tBot + 16, { mono: true, align: 'center', alpha: p.fld * (reveal >= gens.length - 1 ? 1 : 0.3) });
            if (!narrow) txt(g2, L('avalanche'), tx0 + tw / 2, tTop - 18, { align: 'center', alpha: p.fld * 0.85 });
          }
        });

        // ---------- waveforms ----------
        layW(g, w, h, p.wv, (g2) => {
          const r = { x: 64, y: 46, w: w - 64 - (narrow ? 20 : 90), h: h - 46 - 92 };
          const pl = plot(g2, ctx, r, { min: 0, max: 2.2, label: L('time'), ticks: [] }, {
            min: 0,
            max: 175,
            label: L('signalNoise'),
            ticks: [
              { v: 0, label: '0' },
              { v: THR, label: '5' },
              { v: 150, label: '150' },
            ],
          });
          pl.axes();
          const prog = env.reduced ? 1 : smooth(0.2, 2.4, env.ts);
          const nz = (t: number) => noise[Math.floor((t / 2.2) * 399)] * 0.9;
          const trace = (A: number, col: string, a: number, width: number) => {
            g2.save();
            g2.globalAlpha = a;
            g2.strokeStyle = col;
            g2.lineWidth = width;
            g2.beginPath();
            const n = Math.round(399 * prog);
            for (let q = 0; q <= n; q++) {
              const t = (q / 399) * 2.2;
              const v = Math.max(0, A * shape(t - TS0) + nz(t));
              q ? g2.lineTo(pl.X(t), pl.Y(v)) : g2.moveTo(pl.X(t), pl.Y(v));
            }
            g2.stroke();
            g2.restore();
          };
          pl.hline(THR, { color: accent2, dash: [4, 4], alpha: 0.9 });
          plate(g2, bg, L('threshold'), pl.X(0.05), pl.Y(THR) - 14, { color: accent2 });
          trace(A0, fg, 0.85 * p.ng, 1.25);
          trace(A0 * GAIN, accent, 1, 1.75);
          const tcA = TS0 + cA.t;
          const tcB = TS0 + cB.t;
          if (p.jit > 0.01) {
            const bar = (tc: number, sig: number, col: string) => {
              const x0 = pl.X(tc - sig / 1000);
              const x1 = pl.X(tc + sig / 1000);
              g2.save();
              g2.globalAlpha = 0.9 * p.jit * Math.min(1, prog * 1.5);
              g2.fillStyle = col;
              g2.fillRect(x0, pl.Y(THR) - 5, Math.max(2, x1 - x0), 10);
              g2.restore();
            };
            bar(tcA, sigA, fg);
            bar(tcB, sigB, accent);
            plate(g2, bg, `σₜ ≈ ${F(Math.round(sigA))} ps`, pl.X(tcA) + 16, pl.Y(THR) + 26, { mono: true, alpha: p.jit * prog });
            plate(g2, bg, `σₜ ≈ ${F(Math.round(sigB))} ps`, pl.X(tcB) + 14, pl.Y(THR) - 28, { mono: true, alpha: p.jit * prog, color: accent });
            txt(g2, L('noGain'), pl.X(2.2), pl.Y(THR) - 16, { align: 'right', alpha: p.ng * prog, color: fg });
            txt(g2, L('withGain'), pl.X(TS0 + TR + 0.12), pl.Y(150), { alpha: prog, color: accent });
            if (!narrow) txt(g2, L('jitterNote'), r.x, r.y + r.h + 42, { alpha: 0.65 * p.jit });
          }
          if (p.tsm > 0.01) {
            const xB = pl.X(tcB);
            line(g2, xB, pl.Y(THR), xB, r.y + r.h, accent, { alpha: 0.8 * p.tsm, dash: [3, 3] });
            dot(g2, xB, pl.Y(THR), 3.5, accent2, p.tsm);
            const x0 = pl.X(tcB - 0.02);
            const x1 = pl.X(tcB + 0.02);
            line(g2, x0, r.y + r.h - 14, x1, r.y + r.h - 14, accent2, { lw: 2, alpha: p.tsm });
            plate(g2, bg, `${F(SC.LGAD_TIME_PS.value[0])}–${F(SC.LGAD_TIME_PS.value[1])} ps`, xB - 12, r.y + r.h - 28, { mono: true, align: 'right', alpha: p.tsm, color: accent2 });
            plate(g2, bg, `t = ${F(Math.round(tcB * 1000))} ps`, xB, r.y + r.h + 36, { mono: true, align: 'center', alpha: p.tsm });
            txt(g2, L('stored'), r.x, r.y + r.h + 58, { alpha: 0.75 * p.tsm });
          }
        });

        // ---------- trick: gain on a log scale ----------
        layB(g, w, h, p.bars, (g2) => {
          const x0 = 36;
          const bw = w - x0 - 36;
          const X = (v: number) => x0 + (Math.log10(v) / 7) * bw;
          const rows: { v: number; name: string; note: string; col: string; y: number }[] = [
            { v: 1, name: L('pin'), note: '1', col: fg, y: h * 0.2 },
            { v: GAIN, name: L('lgad'), note: `≈ ${F(GAIN)}  (${F((SC.LGAD_GAIN.value as readonly number[])[0])}–${F((SC.LGAD_GAIN.value as readonly number[])[1])})`, col: accent, y: h * 0.42 },
            { v: 1e6, name: L('sipm'), note: `≈ 10${sup(6)}`, col: accent2, y: h * 0.66 },
          ];
          for (const rw of rows) {
            txt(g2, rw.name, x0, rw.y - 14, { alpha: 0.9 });
            box(g2, x0, rw.y, Math.max(2, X(rw.v) - x0), 18, { fill: rw.col, fa: 0.55 });
            txt(g2, rw.note, X(rw.v) + 8 > w - 120 ? X(rw.v) - 10 : X(rw.v) + 8, rw.y + 9, { mono: true, align: X(rw.v) + 8 > w - 120 ? 'right' : 'left', alpha: 1, color: X(rw.v) + 8 > w - 120 ? '#111' : fg });
          }
          // log axis
          const ay = h * 0.66 + 54;
          line(g2, x0, ay, x0 + bw, ay, fg, { alpha: 0.45 });
          for (let e = 0; e <= 6; e += 1) {
            line(g2, X(10 ** e), ay, X(10 ** e), ay + 4, fg, { alpha: 0.45 });
            txt(g2, e === 0 ? '1' : `10${sup(e)}`, X(10 ** e), ay + 16, { mono: true, align: 'center', alpha: 0.6 });
          }
          txt(g2, L('gainAxis'), x0 + bw, ay + 34, { align: 'right', alpha: 0.8 });
          txt(g2, L('proportional'), x0, h * 0.42 + 32, { alpha: 0.8, color: accent });
          txt(g2, L('onOff'), x0, h * 0.66 + 32, { alpha: 0.8, color: accent2 });
        });
      },
    });
  },
};
export default mod;

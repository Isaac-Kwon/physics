/**
 * det.tradeoffs — three constraints on a tracker.
 *   material: silicon slabs of 50, 100, 200, 300 um drawn with their true relative thickness. Signal = 80 pairs/um * t (DET.PAIRS_PER_UM_SILICON,
 *     most probable value), scattering = Highland angle for p = 1 GeV/c, beta = 1: theta0 = 13.6 MeV / p * sqrt(x/X0) (1 + 0.038 ln(x/X0)), X0(Si) = 9.37 cm
 *     (DET.X0_SILICON_CM). The scattering fan is exaggerated x400 in the drawing (angles are fractions of a milliradian).
 *   readout: speed, power and material (cooling) as a triangle of dependencies. Qualitative.
 *   radiation: fluence falls as 1/r^2 from the beam line (relative to the innermost layer, r = 3 cm); layers at their radii; the damage threshold is illustrative.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, gaussian, mulberry32 } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { DET } from '../../data/detectors';
import { arrow, dot, line, rect, txt } from '../common/_draw';
import { makeClock } from './_d2-common';

const STATES = ['material', 'readout', 'radiation'] as const;
type St = (typeof STATES)[number];
const T_UM = [50, 100, 200, 300];
const PAIRS = DET.PAIRS_PER_UM_SILICON.value as number;
const X0_UM = (DET.X0_SILICON_CM.value as number) * 1e4;
const highland = (t: number, pGeV = 1) => {
  const x = t / X0_UM;
  return (0.0136 / pGeV) * Math.sqrt(x) * (1 + 0.038 * Math.log(x)); // rad
};
const EXAG = 400;
const LAYERS_CM: [string, number][] = [
  ['p1', 3],
  ['p2', 7],
  ['p3', 11],
  ['s1', 25],
  ['s2', 40],
  ['s3', 60],
  ['s4', 100],
];
const THRESH = 0.08;

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number, d = 1) => ctx.formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d });
    const clk = makeClock(ctx);
    let state: St = 'material';
    const rnd = mulberry32(31);
    const samples = T_UM.map((t) => Array.from({ length: 6 }, () => gaussian(rnd) * highland(t) * EXAG));

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      const narrow = w < 560;
      const pad = narrow ? 14 : 30;
      const W = w - 2 * pad;

      if (state === 'material') {
        const colW = W / 4;
        const kslab = 0.12; // px per um
        const tight = h < 400;
        const yS = tight ? 50 : 66;
        const cone = Math.min(130, h * (tight ? 0.2 : 0.26));
        const yBar = yS + 36 + cone + (tight ? 40 : 56);
        const barH = Math.max(40, h - yBar - 44);
        const sigMax = PAIRS * T_UM[3];
        const scMax = highland(T_UM[3]);
        const prog = clk.p(0.1, 1.0);
        T_UM.forEach((t, i) => {
          const cx = pad + colW * (i + 0.5);
          const sw = Math.min(colW * 0.6, 90);
          const th_px = t * kslab;
          txt(g, `${t} μm`, cx, yS - (tight ? 30 : 40), { mono: true, color: th.fg, align: 'center', alpha: 0.9 });
          // particle
          arrow(g, cx - 6, yS - (tight ? 18 : 26), cx - 6, yS, th.accent, 1.4, 1, 6);
          rect(g, cx - sw / 2, yS, sw, th_px, th.fg, 1, 0.9, 0.18);
          // scattering fan
          const ang = highland(t) * EXAG;
          const yEx = yS + th_px;
          g.save();
          g.globalAlpha = prog;
          const half = ang;
          g.fillStyle = th.accent;
          g.globalAlpha = 0.08 * prog;
          g.beginPath();
          g.moveTo(cx - 6, yEx);
          g.lineTo(cx - 6 - Math.tan(half) * cone, yEx + cone);
          g.lineTo(cx - 6 + Math.tan(half) * cone, yEx + cone);
          g.closePath();
          g.fill();
          g.restore();
          line(g, cx - 6, yEx, cx - 6 - Math.tan(half) * cone, yEx + cone, th.fg, 1, 0.6 * prog, [3, 3]);
          line(g, cx - 6, yEx, cx - 6 + Math.tan(half) * cone, yEx + cone, th.fg, 1, 0.6 * prog, [3, 3]);
          samples[i].forEach((a) => line(g, cx - 6, yEx, cx - 6 + Math.tan(a) * cone * prog, yEx + cone * prog, th.accent, 1.1, 0.9));
          // bars
          const bw = Math.min(26, colW * 0.18);
          const hs = (barH * PAIRS * t) / sigMax;
          const hc = (barH * highland(t)) / scMax;
          const bx = cx - bw - 4;
          g.save();
          g.fillStyle = th.accent;
          g.globalAlpha = 0.9;
          g.fillRect(bx, yBar + barH - hs * prog, bw, hs * prog);
          g.fillStyle = th.fg;
          g.globalAlpha = 0.75;
          g.fillRect(cx + 4, yBar + barH - hc * prog, bw, hc * prog);
          g.restore();
          txt(g, `${f1((PAIRS * t) / 1000, 0)}k`, bx + bw / 2, yBar + barH + 14, { mono: true, color: th.accent, align: 'center', alpha: 1 });
          txt(g, `${f1(highland(t) * 1000, 2)}`, cx + 4 + bw / 2, yBar + barH + 14, { mono: true, color: th.fg, align: 'center', alpha: 0.9 });
        });
        line(g, pad, yBar + barH, pad + W, yBar + barH, th.fg, 1, 0.4);
        txt(g, L('signal'), pad, yBar - 14, { color: th.accent, alpha: 1 });
        txt(g, L('scatter'), narrow ? pad + W : pad + 150, yBar - 14, { color: th.fg, align: narrow ? 'right' : 'left', alpha: 0.9 });
        txt(g, L('exag'), narrow ? pad : pad + W, narrow ? yBar + barH + 32 : yBar - 14, { color: th.fg, align: narrow ? 'left' : 'right', alpha: 0.55 });
        if (!narrow) txt(g, L('units'), pad + W, yBar + barH + 32, { color: th.fg, align: 'right', alpha: 0.6 });
        return;
      }

      if (state === 'readout') {
        const cx = w / 2;
        const R = Math.min(w * 0.3, h * 0.34);
        const cy = h * 0.52;
        const V: [number, number][] = [
          [cx, cy - R],
          [cx + R * 0.95, cy + R * 0.62],
          [cx - R * 0.95, cy + R * 0.62],
        ];
        const names = ['speed', 'power', 'material'];
        const edges = ['e1', 'e2', 'e3'];
        V.forEach((p, i) => {
          dot(g, p[0], p[1], 5, th.accent, 1);
          txt(g, L(names[i]), p[0], p[1] + (i === 0 ? -16 : 18), { color: th.accent, align: 'center', alpha: 1 });
        });
        for (let i = 0; i < 3; i++) {
          const a = V[i];
          const b = V[(i + 1) % 3];
          const q = clk.p(0.2 + i * 0.5, 0.6);
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const len = Math.hypot(dx, dy);
          const ux = dx / len;
          const uy = dy / len;
          arrow(g, a[0] + ux * 14, a[1] + uy * 14, a[0] + ux * 14 + (dx - ux * 28) * q, a[1] + uy * 14 + (dy - uy * 28) * q, th.fg, 1.4, 0.9, 7);
          const mx = (a[0] + b[0]) / 2;
          const my = (a[1] + b[1]) / 2;
          // text on the outer side of the edge
          const nx = uy;
          const ny = -ux;
          const out = ((mx - cx) * nx + (my - cy) * ny) > 0 ? 1 : -1;
          const lx = mx + nx * out * 18;
          const ly = my + ny * out * 18;
          txt(g, L(edges[i]), lx, ly, { color: th.fg, align: i === 1 ? 'center' : i === 0 ? 'left' : 'right', alpha: 0.9 * q });
        }
        txt(g, L('loop'), cx, cy + 6, { color: th.fg, align: 'center', alpha: 0.7 * clk.p(1.4, 0.6) });
        return;
      }

      // radiation
      const r = { x: narrow ? 52 : 70, y: 40, w: W - (narrow ? 40 : 80), h: h - 40 - 70 };
      const fl = (rc: number) => (3 / rc) ** 2;
      const flc = (rc: number) => (fl(rc) > 1.8 ? NaN : fl(rc));
      const pl = plot(g, ctx, r, { min: 2, max: 150, log: true, label: L('rAxis'), ticks: [2, 5, 10, 20, 50, 100].map((v) => ({ v, label: String(v) })) }, { min: 5e-4, max: 2, log: true, label: L('fluence'), ticks: [1e-3, 1e-2, 1e-1, 1].map((v) => ({ v, label: v === 1 ? '1' : `10${'⁻⁰¹²³'.charAt(0)}${'⁰¹²³'.charAt(Math.round(-Math.log10(v)))}` })) });
      pl.axes();
      const pr = clk.p(0.1, 1.0);
      pl.curve(flc, { color: th.fg, width: 1.5, progress: pr }, 200);
      pl.hline(THRESH, { color: th.accent2, dash: [5, 4], alpha: 0.8 });
      txt(g, L('threshold'), pl.X(150) - 4, pl.Y(THRESH) - 12, { color: th.accent2, align: 'right', alpha: 0.9 });
      LAYERS_CM.forEach(([k, rc]) => {
        const bad = fl(rc) > THRESH;
        const x = pl.X(rc);
        const y = pl.Y(fl(rc));
        if (pr < 0.5) return;
        dot(g, x, y, 4, bad ? th.accent2 : th.accent, 1);
        if (bad) {
          line(g, x - 6, y - 6, x + 6, y + 6, th.accent2, 1.5, 1);
          line(g, x - 6, y + 6, x + 6, y - 6, th.accent2, 1.5, 1);
        }
        void k;
      });
      txt(g, L('pixels'), pl.X(6.5), pl.Y(fl(6.5)) - 30, { color: th.accent, align: 'center', alpha: pr });
      txt(g, L('strips'), pl.X(48), pl.Y(fl(48)) - 30, { color: th.accent, align: 'center', alpha: pr });
      txt(g, L('damaged'), pl.X(3.5), pl.Y(1) + 2, { color: th.accent2, align: 'left', alpha: pr });
      txt(g, '∝ 1 / r²', pl.X(22), pl.Y(fl(22)) - 16, { mono: true, color: th.fg, alpha: 0.85 * pr });
    });
    c.animate = true;
    return {
      setState(st: string, o: SetStateOptions) {
        state = (STATES as readonly string[]).includes(st) ? (st as St) : 'material';
        clk.reset();
        if (o.immediate || ctx.reducedMotion) clk.finish();
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

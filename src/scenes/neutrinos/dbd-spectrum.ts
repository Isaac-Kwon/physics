/**
 * nu.dbd-spectrum — P9 walkthrough of neutrinoless double-beta decay in germanium-76 (LEGEND-like).
 * Summed-energy spectrum of the two electrons, in units of Q = 2.039 MeV (NU.DBD_Q_GE76_MEV, T0 = Q / m_e = 3.99):
 *   2 nu beta beta : Primakoff-Rosen form  f(T) ~ T (T0 - T)^5 (1 + 2T + 4T^2/3 + T^3/3 + T^4/30)   (T in m_e), normalised to area 1.
 *   0 nu beta beta : a Gaussian line at Q of area 1.2 % of the continuum (illustrative; real rates differ by many orders of magnitude).
 *   measured       : (2nu + 0nu) convolved with a Gaussian of width sigma, plus a flat background (0.06 per unit x).
 * The sum-energy rows draw ordinary-decay sums from the same f(T) (seeded rejection sampling), electron split uniform.
 * Simplifications: the single-electron energy split for 2nu is uniform, no bremsstrahlung escape, no detector geometry.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, clamp, smooth, lerp } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { NU } from '../../data/neutrinos';
import { createStage, dot, line, poly, ring, txt } from './_n2-common';

const STATES = ['decay', 'source-detector', 'sum-energy', 'spectrum', 'resolution'] as const;
const Q = NU.DBD_Q_GE76_MEV.value as number;
const T0 = Q / 0.511;
type P = { dec: number; src: number; sum: number; spec: number; res: number };
const one = (k: keyof P): P => ({ dec: 0, src: 0, sum: 0, spec: 0, res: 0, [k]: 1 });
const TARGETS: Record<string, P> = { decay: one('dec'), 'source-detector': one('src'), 'sum-energy': one('sum'), spectrum: one('spec'), resolution: one('res') };

const fPR = (x: number) => {
  const T = x * T0;
  if (T <= 0 || T >= T0) return 0;
  return T * Math.pow(T0 - T, 5) * (1 + 2 * T + (4 * T * T) / 3 + (T * T * T) / 3 + Math.pow(T, 4) / 30);
};
const NX = 400;
const XMAX = 1.15;
const fRaw = Array.from({ length: NX + 1 }, (_, i) => fPR((i / NX) * XMAX));
const AREA = fRaw.reduce((s, v) => s + v, 0) * (XMAX / NX);
const f2 = (x: number) => fPR(x) / AREA; // density per unit x, area 1
const F2MAX = Math.max(...fRaw) / AREA;
const PEAK_AREA = 0.012;
const BKG = 0.06;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const f2d = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const rnd = mulberry32(76);
    const ordSums = Array.from({ length: 4 }, () => {
      for (;;) {
        const x = rnd();
        if (rnd() * F2MAX < f2(x)) return x;
      }
    });
    const splits = [0.35, 0.6, 0.45, 0.7];
    const track = (seed: number) => {
      const r = mulberry32(seed);
      let x = 0;
      let y = 0;
      let a = r() * 6.28;
      const pts: [number, number][] = [[0, 0]];
      for (let i = 0; i < 14; i++) {
        a += (r() - 0.5) * 1.1;
        x += Math.cos(a) * 0.07;
        y += Math.sin(a) * 0.07;
        pts.push([x, y]);
      }
      return pts;
    };
    const tr1 = track(3);
    const tr2 = track(9);
    const cloud = Array.from({ length: 16 }, () => [rnd() - 0.5, rnd() - 0.5] as const);

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { 'source-detector': 1e9, resolution: 5 },
      draw(g, s, lv, env) {
        const { w, h } = s;
        const narrow = w < 520;
        const wide = w > h * 1.05;
        const fin = env.ts >= 1e3;
        const ts = env.ts;

        // ------------------------------------------------ decay diagrams
        if (lv.dec > 0.01) {
          const a = lv.dec;
          const panel = (px: number, py: number, pw: number, ph: number, neutrinoless: boolean) => {
            const nx = px + pw * 0.22;
            const y1 = py + ph * 0.3;
            const y2 = py + ph * 0.62;
            line(g, nx, py + 26, nx, py + ph - 10, th.fg, 2, 0.85 * a);
            txt(g, '⁷⁶Ge', nx - 8, py + 34, { mono: true, color: th.fg, align: 'right', alpha: a });
            txt(g, '⁷⁶Se', nx - 8, py + ph - 16, { mono: true, color: th.fg, align: 'right', alpha: a });
            const L1 = pw * 0.5;
            const emit = (vy: number, ang: number, c: string, dash: number[], label: string) => {
              const ex = nx + Math.cos((ang * Math.PI) / 180) * L1;
              const ey = vy - Math.sin((ang * Math.PI) / 180) * L1 * 0.55;
              line(g, nx, vy, ex, ey, c, 1.5, a, dash);
              txt(g, label, ex + 8, ey, { mono: true, color: c, alpha: a });
            };
            dot(g, nx, y1, 3, th.fg, a);
            dot(g, nx, y2, 3, th.fg, a);
            emit(y1, 38, th.accent, [], 'e⁻');
            emit(y2, -38, th.accent, [], 'e⁻');
            if (!neutrinoless) {
              emit(y1, 8, th.fg, [5, 4], 'ν̄');
              emit(y2, -8, th.fg, [5, 4], 'ν̄');
            } else {
              g.save();
              g.strokeStyle = th.fg;
              g.globalAlpha = 0.85 * a;
              g.setLineDash([5, 4]);
              g.beginPath();
              g.moveTo(nx, y1);
              g.quadraticCurveTo(nx + pw * 0.2, (y1 + y2) / 2, nx, y2);
              g.stroke();
              g.restore();
              txt(g, L('majoranaLine'), nx + pw * 0.2 + 10, (y1 + y2) / 2, { color: th.fg, alpha: a });
            }
          };
          const gap = 10;
          if (wide) {
            const pw = (w - 30 - gap) / 2;
            txt(g, L('ordinary'), 16, 22, { color: th.fg, alpha: a });
            txt(g, L('neutrinoless'), 16 + pw + gap, 22, { color: th.accent, alpha: a });
            panel(16, 30, pw, h - 100, false);
            panel(16 + pw + gap, 30, pw, h - 100, true);
            txt(g, '⁷⁶Ge → ⁷⁶Se + 2e⁻ + 2ν̄', 16, h - 40, { mono: true, color: th.fg, alpha: 0.95 * a });
            txt(g, '⁷⁶Ge → ⁷⁶Se + 2e⁻', 16 + pw + gap, h - 40, { mono: true, color: th.accent, alpha: a });
          } else {
            const ph = (h - 30) / 2 - 22;
            txt(g, L('ordinary'), 16, 18, { color: th.fg, alpha: a });
            panel(10, 24, w - 20, ph - 16, false);
            txt(g, '⁷⁶Ge → ⁷⁶Se + 2e⁻ + 2ν̄', 16, 24 + ph + 2, { mono: true, color: th.fg, alpha: 0.95 * a });
            txt(g, L('neutrinoless'), 16, ph + 46, { color: th.accent, alpha: a });
            panel(10, ph + 52, w - 20, ph - 16, true);
            txt(g, '⁷⁶Ge → ⁷⁶Se + 2e⁻', 16, h - 14, { mono: true, color: th.accent, alpha: a });
          }
        }

        // ------------------------------------------------ source = detector
        if (lv.src > 0.01) {
          const a = lv.src;
          const cw = Math.min(w * (wide ? 0.34 : 0.62), 260);
          const ch = Math.min(h * 0.6, cw * 1.1);
          const cx0 = wide ? w * 0.28 - cw / 2 : w * 0.5 - cw / 2;
          const cy0 = wide ? h * 0.5 - ch / 2 : 36;
          g.save();
          g.globalAlpha = 0.12 * a;
          g.fillStyle = th.accent2;
          g.fillRect(cx0, cy0, cw, ch);
          g.restore();
          g.save();
          g.globalAlpha = a;
          g.strokeStyle = th.fg;
          g.lineWidth = 1.2;
          g.strokeRect(cx0, cy0, cw, ch);
          g.fillStyle = th.fg;
          g.fillRect(cx0 + cw / 2 - 9, cy0 + ch - 6, 18, 8);
          g.restore();
          txt(g, narrow ? L('crystalS') : L('crystal'), cx0 + cw / 2, cy0 - 12, { color: th.fg, align: 'center', alpha: a });
          txt(g, L('contact'), cx0 + cw / 2, cy0 + ch + 16, { color: th.fg, align: 'center', alpha: 0.85 * a });
          g.save();
          g.globalAlpha = a;
          const dx = cx0 + cw * 0.34;
          const dy = cy0 + ch * 0.38;
          dot(g, dx, dy, 3.5, th.accent, a);
          ring(g, dx, dy, 14, th.accent, 1, 0.8 * a);
          g.restore();
          // charge carriers: holes (to the contact) and electrons (to the surface)
          const ph = fin ? 0.7 : (env.t * 0.35) % 1;
          cloud.forEach(([u, v], i) => {
            const f = clamp(ph * 1.3 - i * 0.015);
            const hx = dx + u * 16 + (cx0 + cw / 2 - dx) * f;
            const hy = dy + v * 16 + (cy0 + ch - 6 - dy) * f;
            ring(g, hx, hy, 2, th.accent2, 1, 0.95 * a);
            const ex = dx + u * 16 + (cx0 + cw * 0.04 - dx) * f * 0.8;
            const ey = dy + v * 16 + (cy0 + 4 - dy) * f * 0.8;
            dot(g, ex, ey, 1.8, th.fg, 0.9 * a);
          });
          // magnified view of the two electron tracks (1 mm scale)
          const ix = wide ? w * 0.7 : w * 0.5;
          const iy = wide ? h * 0.42 : cy0 + ch + 100;
          const ir = Math.min(70, (wide ? w : h) * 0.12);
          ring(g, ix, iy, ir, th.fg, 1, 0.5 * a);
          line(g, dx + 14, dy - 4, ix - ir * 0.9, iy - ir * 0.5, th.fg, 1, 0.3 * a, [3, 4]);
          const ks = ir * 0.9;
          poly(g, tr1.map(([x, y]) => [ix + x * ks, iy - y * ks] as [number, number]), th.accent, 1.5, a);
          poly(g, tr2.map(([x, y]) => [ix - x * ks, iy + y * ks] as [number, number]), th.accent, 1.5, a);
          dot(g, ix, iy, 2.5, th.fg, a);
          txt(g, 'e⁻', ix + ks * 0.6, iy - ks * 0.75, { mono: true, color: th.accent, alpha: a });
          txt(g, 'e⁻', ix - ks * 0.6, iy + ks * 0.75, { mono: true, color: th.accent, alpha: a });
          txt(g, narrow ? L('mmS') : L('mm'), ix, iy + ir + 16, { color: th.fg, align: 'center', alpha: 0.9 * a });
          // readout
          txt(g, narrow ? L('chargeS') : L('charge'), wide ? ix : cx0 + cw / 2, wide ? iy + ir + 44 : cy0 + ch + 36, { color: th.fg, align: 'center', alpha: 0.9 * a });
          if (!narrow) {
            txt(g, L('holes'), cx0 + cw + 12, cy0 + ch * 0.9, { color: th.accent2, alpha: 0.9 * a });
            txt(g, L('elec'), cx0 + cw + 12, cy0 + ch * 0.9 + 16, { color: th.fg, alpha: 0.9 * a });
          }
        }

        // ------------------------------------------------ sum energy rows
        if (lv.sum > 0.01) {
          const a = lv.sum;
          const x0 = narrow ? 14 : 150;
          const x1 = w - 30;
          const X = (e: number) => x0 + ((x1 - x0) * e) / Q;
          const rows: { label: string; sum: number; split: number; nl: boolean }[] = [];
          ordSums.forEach((x, i) => rows.push({ label: i === 0 ? L('rowOrd') : '', sum: x * Q, split: splits[i], nl: false }));
          [0.3, 0.55, 0.8].forEach((sp, i) => rows.push({ label: i === 0 ? L('rowNl') : '', sum: Q, split: sp, nl: true }));
          const top = narrow ? 56 : 52;
          const rh = Math.min(34, (h - top - (narrow ? 104 : 90)) / rows.length);
          const k = fin ? 1 : smooth(0, 1.6, ts);
          rows.forEach((r, i) => {
            const y = top + i * rh + (i >= 4 ? 18 : 0);
            if (r.label) txt(g, r.label, narrow ? 14 : 16, narrow ? y - 14 : y + 4, { color: r.nl ? th.accent : th.fg, alpha: a });
            const e1 = r.sum * r.split * k;
            const e2 = r.sum * (1 - r.split) * k;
            g.save();
            g.globalAlpha = 0.9 * a;
            g.fillStyle = th.accent;
            g.fillRect(X(0), y, X(e1) - X(0), 8);
            g.fillStyle = th.accent2;
            g.fillRect(X(e1), y, X(e1 + e2) - X(e1), 8);
            g.restore();
            if (!r.nl) {
              g.save();
              g.globalAlpha = 0.6 * a;
              g.strokeStyle = th.fg;
              g.setLineDash([3, 3]);
              g.strokeRect(X(r.sum * k), y, X(Q) - X(r.sum * k), 8);
              g.restore();
            }
            line(g, X(r.sum), y - 3, X(r.sum), y + 11, th.fg, 1, 0.7 * a * k);
          });
          // axis
          const ya = top + rows.length * rh + 40;
          line(g, X(0), ya, X(Q), ya, th.fg, 1, 0.5 * a);
          [0, 0.5, 1, 1.5, 2].forEach((e) => {
            line(g, X(e), ya, X(e), ya + 4, th.fg, 1, 0.5 * a);
            txt(g, ctx.formatNumber(e), X(e), ya + 16, { mono: true, color: th.fg, align: 'center', alpha: 0.65 * a });
          });
          line(g, X(Q), top - 14, X(Q), ya, th.accent, 1, 0.7 * a, [3, 3]);
          txt(g, `Q = ${ctx.formatNumber(Q, { minimumFractionDigits: 3 })} MeV`, X(Q), top - 24, { mono: true, color: th.accent, align: 'right', alpha: a });
          txt(g, L('energyAxis'), X(Q), ya + 32, { color: th.fg, align: 'right', alpha: 0.85 * a });
          // legend
          const ly = h - (narrow ? 12 : 22);
          g.save();
          g.globalAlpha = a;
          g.fillStyle = th.accent;
          g.fillRect(x0 - (narrow ? 0 : 0), ly - 4, 10, 8);
          g.fillStyle = th.accent2;
          g.fillRect(x0 + (narrow ? 70 : 90), ly - 4, 10, 8);
          g.restore();
          txt(g, L('e1'), x0 + 14, ly, { color: th.fg, alpha: 0.9 * a });
          txt(g, L('e2'), x0 + (narrow ? 70 : 90) + 14, ly, { color: th.fg, alpha: 0.9 * a });
          if (w >= 720) txt(g, L('nuShare'), x0 + 190, ly, { color: th.fg, alpha: 0.75 * a });
        }

        // ------------------------------------------------ spectrum / resolution
        const pl = (peakAlpha: number, sigma: number, a: number, kind: 'spec' | 'res') => {
          const R = { x: 52, y: 44, w: Math.max(100, w - 84), h: h - 118 };
          const p = plot(g, ctx, R, { min: 0, max: XMAX, label: L('sumAxis'), ticks: [0, 0.25, 0.5, 0.75, 1].map((v) => ({ v, label: v === 1 ? 'Q' : ctx.formatNumber(v) })) }, { min: 0, max: 2.6, label: L('countsAxis'), ticks: [] });
          g.save();
          g.globalAlpha = a;
          p.axes();
          const gauss = (x: number, mu: number, sg: number) => Math.exp(-0.5 * ((x - mu) / sg) ** 2) / (sg * Math.sqrt(2 * Math.PI));
          // exact discrete convolution (normalised kernel)
          const kern = (() => {
            const n = 40;
            const ks = Array.from({ length: 2 * n + 1 }, (_, i) => Math.exp(-0.5 * (((i - n) / n) * 3.5) ** 2));
            const sum = ks.reduce((u, v) => u + v, 0);
            return { n, ks: ks.map((v) => v / sum) };
          })();
          const conv = (x: number) => {
            if (sigma < 0.004) return f2(x);
            let sacc = 0;
            for (let i = -kern.n; i <= kern.n; i++) sacc += kern.ks[i + kern.n] * f2(x - (i / kern.n) * 3.5 * sigma);
            return sacc;
          };
          const peak = (x: number) => PEAK_AREA * gauss(x, 1, Math.max(sigma, 0.0015));
          // continuum
          const pts: [number, number][] = [];
          const tot: [number, number][] = [];
          const ps: [number, number][] = [];
          for (let i = 0; i <= 300; i++) {
            const x = (i / 300) * XMAX;
            const c = conv(x) + BKG;
            pts.push([x, c]);
            tot.push([x, c + peak(x) * peakAlpha]);
            ps.push([x, peak(x) * peakAlpha]);
          }
          const clipY = (v: number) => Math.min(2.55, v);
          g.fillStyle = th.fg;
          g.globalAlpha = 0.12 * a;
          g.beginPath();
          g.moveTo(p.X(0), p.Y(0));
          pts.forEach(([x, y]) => g.lineTo(p.X(x), p.Y(clipY(y))));
          g.lineTo(p.X(XMAX), p.Y(0));
          g.closePath();
          g.fill();
          g.globalAlpha = a;
          p.path(pts.map(([x, y]) => [x, clipY(y)] as [number, number]), { color: th.fg, width: 1.4 });
          if (peakAlpha > 0.01) {
            g.save();
            g.globalAlpha = 0.45 * a;
            g.fillStyle = th.accent;
            g.beginPath();
            g.moveTo(p.X(0.6), p.Y(0));
            tot.forEach(([x, y]) => {
              if (x >= 0.6) g.lineTo(p.X(x), p.Y(clipY(y)));
            });
            pts.slice()
              .reverse()
              .forEach(([x, y]) => {
                if (x >= 0.6) g.lineTo(p.X(x), p.Y(clipY(y)));
              });
            g.closePath();
            g.fill();
            g.restore();
            p.path(tot.filter(([x]) => x >= 0.7).map(([x, y]) => [x, clipY(y)] as [number, number]), { color: th.accent, width: 1.6 });
          }
          p.hline(BKG, { color: th.fg, dash: [2, 3], alpha: 0.5 });
          p.vline(1, { color: th.accent, dash: [3, 4], alpha: 0.5 });
          g.restore();
          return p;
        };
        if (lv.spec > 0.01) {
          const p = pl(1, 0.003, lv.spec, 'spec');
          g.save();
          g.globalAlpha = lv.spec;
          p.text(narrow ? 0.92 : 0.58, narrow ? 1.3 : 1.95, narrow ? L('twoNuS') : L('twoNu'), { align: narrow ? 'right' : 'left' });
          p.text(0.98, 2.35, L('zeroNu'), { align: 'right', color: th.accent });
          if (!narrow) p.text(0.98, 2.15, L('notScale'), { align: 'right', alpha: 0.7 });
          p.text(0.04, BKG + 0.14, L('bkg'), { align: 'left', alpha: 0.7 });
          g.restore();
        }
        if (lv.res > 0.01) {
          const u = fin ? 1 : smooth(0, 4.5, ts);
          const sig = Math.exp(lerp(Math.log(0.002), Math.log(0.1), u));
          const p = pl(1, sig, lv.res, 'res');
          g.save();
          g.globalAlpha = lv.res;
          p.text(0.04, 2.4, `σ = ${f1(sig * 100)} %`, { align: 'left', mono: true });
          p.text(0.04, 2.2, `${L('sigmaNote')} ${f2d(sig * Q * 1000 / 1000)} MeV`, { align: 'left', alpha: 0.8, mono: false });
          p.text(narrow ? 0.92 : 0.58, narrow ? 1.3 : 1.85, narrow ? L('twoNuS') : L('twoNu'), { align: narrow ? 'right' : 'left' });
          p.text(1.0, 0.5, L('lost'), { align: 'right', color: th.accent, alpha: smooth(0.6, 1, u) });
          g.restore();
        }
      },
    });
  },
};
export default mod;

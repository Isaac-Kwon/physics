/**
 * hi.bes-signals — what the beam-energy scan looks for. Every plot is a hypothetical, textbook-shaped sketch.
 *  fluctuations: event-by-event net-proton number, Skellam (difference of two Poisson) histograms filling up event by event.
 *  fluctuations-plot: C4/C2 vs √s_NN, Poisson baseline = 1, a made-up dip/bump "if a critical point exists".
 *  directed-flow: slope dv1/dy vs √s_NN crossing zero (schematic) + tilt of the fireball.
 *  turn-off: three plasma signals switching off toward low √s_NN (thresholds unknown, drawn as a band).
 *  dileptons: e+e- pairs leave unscattered; invariant-mass sketch with a broadened ρ.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, smooth, clamp } from '../shared/canvas2d';
import { plot, type Rect } from '../shared/plot';
import { arrow, createStage, drawFireball, gauss, makeLayer, splitLayout, txt, type G } from './_s3-common';

const STATES = ['fluctuations', 'fluctuations-plot', 'directed-flow', 'turn-off', 'dileptons'] as const;
type P = { f: number; fp: number; d: number; o: number; l: number };
const only = (k: keyof P): P => ({ f: 0, fp: 0, d: 0, o: 0, l: 0, [k]: 1 });
const TARGETS: Record<string, P> = {
  fluctuations: only('f'),
  'fluctuations-plot': only('fp'),
  'directed-flow': only('d'),
  'turn-off': only('o'),
  dileptons: only('l'),
};

const E_MIN = 3;
const E_MAX = 200;
const ENERGY_TICKS = [3, 10, 30, 100].map((v) => ({ v, label: String(v) }));

// Hypothetical C4/C2: 1 is the Poisson baseline
const c4c2 = (e: number) => 1 - 0.3 * gauss(Math.log(e), Math.log(25), 0.4) + 0.45 * gauss(Math.log(e), Math.log(5), 0.42);
// Hypothetical proton directed-flow slope
const xOf = (e: number) => Math.log(e / E_MIN) / Math.log(E_MAX / E_MIN);
const eOf = (x: number) => E_MIN * Math.pow(E_MAX / E_MIN, x);
const dv1 = (e: number) => 0.9 * gauss(xOf(e), 0, 0.22) - 0.4 * gauss(xOf(e), 0.62, 0.22);
const logistic = (e: number, e0: number, w: number) => 1 / (1 + Math.exp(-(Math.log(e) - Math.log(e0)) / w));
const SIGNALS = [
  { key: 'jets', e0: 11, w: 0.22 },
  { key: 'ncq', e0: 8, w: 0.26 },
  { key: 'multis', e0: 6, w: 0.3 },
] as const;

const bw = (M: number, m: number, G: number, A: number) => (A * (G / 2) ** 2) / ((M - m) ** 2 + (G / 2) ** 2);
const spec = (medium: boolean) => (M: number) => {
  const cont = 0.04 * Math.exp(-M / 0.45);
  const rho = medium ? bw(M, 0.77, 0.45, 0.17) : bw(M, 0.77, 0.15, 0.5);
  return cont + rho + bw(M, 0.783, 0.0085, 0.1) + bw(M, 1.019, 0.0043, 0.08) + 0.004;
};

const ENERGIES = [
  { e: 200, p: 14, pb: 12 },
  { e: 19.6, p: 13, pb: 3.5 },
  { e: 7.7, p: 14, pb: 0.5 },
];
const NEV = 3000;
const poisson = (rnd: () => number, mean: number) => {
  const l = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > l);
  return k - 1;
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const rnd = mulberry32(5);
    const samples = ENERGIES.map((en) => Array.from({ length: NEV }, () => poisson(rnd, en.p) - poisson(rnd, en.pb)));
    const pairs = Array.from({ length: 14 }, (_, i) => {
      const r = Math.sqrt(rnd()) * 0.9;
      const a0 = rnd() * Math.PI * 2;
      return { x: r * Math.cos(a0), y: r * Math.sin(a0), a: rnd() * Math.PI * 2, t0: (i / 14) * 3.2 };
    });
    const layers = [makeLayer(), makeLayer(), makeLayer(), makeLayer(), makeLayer()];
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg, grid } = ctx.theme;
    const fmt1 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 1 });

    const drawFluct = (g: G, w: number, h: number, ts: number) => {
      const n = Math.round(NEV * smooth(0, 4.5, ts));
      const x0 = 54;
      const x1 = w - 24;
      const rowH = (h - 70) / 3;
      const lo = -8;
      const hi = 32;
      const bin = (x1 - x0) / (hi - lo + 1);
      ENERGIES.forEach((en, r) => {
        const base = 34 + (r + 1) * rowH - 10;
        const counts = new Map<number, number>();
        for (let i = 0; i < n; i++) counts.set(samples[r][i], (counts.get(samples[r][i]) ?? 0) + 1);
        const peak = (NEV / Math.sqrt(2 * Math.PI * (en.p + en.pb))) * 1.1;
        g.fillStyle = accent;
        g.globalAlpha = 0.85;
        for (const [v, c] of counts) {
          if (v < lo || v > hi) continue;
          const bh = Math.min(rowH - 22, (c / peak) * (rowH - 22) * (n / NEV > 0 ? 1 : 0));
          g.fillRect(x0 + (v - lo) * bin + 1, base - bh, Math.max(1, bin - 2), bh);
        }
        g.globalAlpha = 0.45;
        g.strokeStyle = fg;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x0, base);
        g.lineTo(x1, base);
        g.stroke();
        g.setLineDash([2, 4]);
        g.beginPath();
        g.moveTo(x0 + (0 - lo) * bin + bin / 2, base - rowH + 24);
        g.lineTo(x0 + (0 - lo) * bin + bin / 2, base);
        g.stroke();
        g.setLineDash([]);
        g.globalAlpha = 1;
        // the latest event as a marker
        if (n > 0 && n < NEV) {
          const v = samples[r][n - 1];
          g.fillStyle = accent2;
          g.beginPath();
          const mx = x0 + (v - lo) * bin + bin / 2;
          g.moveTo(mx, base + 1);
          g.lineTo(mx - 4, base + 8);
          g.lineTo(mx + 4, base + 8);
          g.fill();
        }
        txt(g, `√s_NN = ${en.e === 200 ? 200 : fmt1(en.e)} GeV`, x1, base - rowH + 34, { mono: true, align: 'right' });
      });
      g.globalAlpha = 0.6;
      g.fillStyle = fg;
      g.font = '11px ui-monospace, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'top';
      for (let v = -5; v <= 30; v += 5) g.fillText(String(v), x0 + (v - lo) * bin + bin / 2, h - 36);
      g.globalAlpha = 1;
      txt(g, L('netProtons'), x1, h - 14, { align: 'right', alpha: 0.85 });
      txt(g, `${ctx.formatNumber(n)} ${L('events')}`, x0, 20, { mono: true, alpha: 0.85 });
    };

    const drawFplot = (g: G, w: number, h: number, ts: number) => {
      const r: Rect = { x: 60, y: 50, w: w - 60 - 40, h: h - 50 - 62 };
      const pl = plot(g, ctx, r, { min: E_MIN, max: E_MAX, log: true, label: '√s_NN (GeV)', ticks: ENERGY_TICKS }, { min: 0.5, max: 1.65, label: 'C₄/C₂', ticks: [{ v: 1, label: '1' }] });
      pl.axes();
      const prog = smooth(0, 2.2, ts);
      pl.hline(1, { color: fg, dash: [5, 4], alpha: 0.65 });
      pl.text(E_MAX, 0.9, L('baseline'), { align: 'right', alpha: 0.75 });
      pl.curve(c4c2, { color: accent, width: 1.75, dash: [6, 3], progress: prog }, 240);
      pl.text(4.2, 1.5, L('ifCritical'), { color: accent, alpha: 1 });
      txt(g, L('hypothetical'), r.x + r.w / 2, r.y - 26, { align: 'center', color: accent2, alpha: 1 });
    };

    const drawDflow = (g: G, w: number, h: number, ts: number, fin: boolean) => {
      const lay = splitLayout(w, h, 1);
      const R = lay.panel;
      const pr = fin ? 0.45 : smooth(0.3, 7, ts);
      const x = 1 - pr; // sweep from high to low energy
      const e = eOf(x);
      const slope = dv1(e);
      const cx = R.x + R.w / 2;
      const cy = R.y + R.h / 2;
      const ax = Math.min(R.w * 0.34, 130);
      const ay = ax * 0.5;
      const tilt = -slope * 0.55;
      g.save();
      g.translate(cx, cy);
      g.strokeStyle = fg;
      g.globalAlpha = 0.35;
      g.setLineDash([3, 4]);
      g.beginPath();
      g.moveTo(-ax * 1.35, 0);
      g.lineTo(ax * 1.35, 0);
      g.stroke();
      g.setLineDash([]);
      g.rotate(tilt);
      g.globalAlpha = 1;
      g.scale(1, ay / ax);
      drawFireball(g, 0, 0, ax, 1, 0.62);
      g.restore();
      txt(g, L('beam'), cx + ax * 1.35, cy - 12, { align: 'right', alpha: 0.7 });
      txt(g, L('tilt'), cx, cy + ay * 1.9, { align: 'center', alpha: 0.7 });
      txt(g, `√s_NN = ${fmt1(e)} GeV`, R.x + 16, R.y + 22, { mono: true });
      void arrow;
      const pl = plot(g, ctx, lay.plotR, { min: E_MIN, max: E_MAX, log: true, label: '√s_NN (GeV)', ticks: ENERGY_TICKS }, { min: -0.6, max: 1.1, label: 'dv₁/dy', ticks: [{ v: 0, label: '0' }] });
      pl.axes();
      pl.hline(0, { color: fg, dash: [4, 4], alpha: 0.55 });
      pl.curve(dv1, { color: accent, width: 1.75 });
      pl.dot(e, dv1(e), 4.5, accent2);
      pl.text(120, -0.5, L('softening'), { align: 'right', alpha: 0.75 });
      pl.text(17, 0.14, L('signChange'), { align: 'left', alpha: 0.75 });
      txt(g, L('hypotheticalShort'), lay.plotR.x + lay.plotR.w, lay.plotR.y - 18, { align: 'right', color: accent2, alpha: 1 });
    };

    const drawTurnoff = (g: G, w: number, h: number, ts: number, fin: boolean) => {
      const r: Rect = { x: 40, y: 40, w: w - 40 - 36, h: h - 40 - 74 };
      const pl = plot(g, ctx, r, { min: E_MIN, max: E_MAX, log: true, label: '√s_NN (GeV)', ticks: ENERGY_TICKS }, { min: 0, max: 3, ticks: [] });
      pl.axes();
      // unknown threshold region
      const xa = pl.X(5);
      const xb = pl.X(13);
      g.fillStyle = fg;
      g.globalAlpha = 0.07;
      g.fillRect(xa, r.y, xb - xa, r.h);
      g.globalAlpha = 1;
      txt(g, L('whereOff'), (xa + xb) / 2, r.y - 12, { align: 'center', alpha: 0.7 });
      const edge = fin ? E_MIN : eOf(1 - smooth(0.3, 6, ts));
      SIGNALS.forEach((sg, k) => {
        const base = 2 - k;
        const hgt = 0.72;
        g.beginPath();
        let started = false;
        const pts: [number, number][] = [];
        for (let i = 0; i <= 160; i++) {
          const e = eOf(i / 160);
          if (e < edge) continue;
          pts.push([pl.X(e), pl.Y(base + hgt * logistic(e, sg.e0, sg.w))]);
        }
        if (pts.length < 2) return;
        g.moveTo(pts[0][0], pl.Y(base));
        for (const [px, py] of pts) {
          g.lineTo(px, py);
          started = true;
        }
        g.lineTo(pts[pts.length - 1][0], pl.Y(base));
        g.closePath();
        g.fillStyle = accent;
        g.globalAlpha = 0.16;
        g.fill();
        g.globalAlpha = 1;
        g.strokeStyle = accent;
        g.lineWidth = 1.5;
        g.beginPath();
        pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
        g.stroke();
        g.strokeStyle = fg;
        g.globalAlpha = 0.3;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(r.x, pl.Y(base));
        g.lineTo(r.x + r.w, pl.Y(base));
        g.stroke();
        g.globalAlpha = 1;
        txt(g, L(sg.key), r.x + 8, pl.Y(base) - 0.9 * (r.h / 3) * 0.62, { alpha: 0.9 });
        void started;
      });
      // direction of travel
      arrow(g, r.x + r.w - 10, r.y + r.h + 46, r.x + r.w - 90, r.y + r.h + 46, { color: fg, alpha: 0.6, width: 1, head: 6 });
      txt(g, L('lowerEnergy'), r.x + r.w - 98, r.y + r.h + 46, { align: 'right', alpha: 0.7 });
      txt(g, L('signalStrength'), r.x + 4, r.y + r.h + 46, { alpha: 0.6 });
    };

    const drawDilep = (g: G, w: number, h: number, t: number, fin: boolean) => {
      const lay = splitLayout(w, h, 1);
      const R = lay.panel;
      const cx = R.x + R.w / 2;
      const cy = R.y + R.h / 2;
      const rad = Math.min(R.w, R.h) * 0.33;
      g.save();
      g.beginPath();
      g.rect(R.x, R.y, R.w, R.h);
      g.clip();
      drawFireball(g, cx, cy, rad, 1, 0.62);
      const reach = Math.min(R.w, R.h) / 2 / rad;
      for (const e of pairs) {
        const phase = fin ? 0.8 + (e.t0 / 3.2) * 0.6 : (((t - e.t0) % 3.2) + 3.2) % 3.2;
        const a = 1 - smooth(reach * 0.7, reach * 0.95, phase + 0.4);
        if (a <= 0) continue;
        const sx = cx + e.x * rad;
        const sy = cy - e.y * rad;
        for (const d of [-0.2, 0.2]) {
          const ang = e.a + d;
          const ex = sx + Math.cos(ang) * phase * rad;
          const ey = sy - Math.sin(ang) * phase * rad;
          g.globalAlpha = 0.95 * a;
          g.strokeStyle = accent2;
          g.lineWidth = 1.25;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(ex, ey);
          g.stroke();
          g.fillStyle = accent2;
          g.beginPath();
          g.arc(ex, ey, 1.8, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.restore();
      txt(g, L('dense'), cx, cy + rad + 22, { align: 'center', alpha: 0.7 });
      txt(g, 'e⁺e⁻', R.x + 14, R.y + 18, { color: accent2, alpha: 1, mono: true });
      const pl = plot(g, ctx, lay.plotR, { min: 0, max: 1.2, label: L('mass'), ticks: [0, 0.4, 0.8, 1.2].map((v) => ({ v, label: ctx.formatNumber(v, { maximumFractionDigits: 1 }) })) }, { min: 1e-3, max: 3, log: true, label: L('yield'), ticks: [] });
      pl.axes();
      pl.curve(spec(false), { color: fg, dash: [4, 4], alpha: 0.65, width: 1.25 }, 1000);
      pl.curve(spec(true), { color: accent, width: 1.75 }, 1000);
      pl.text(0.6, 0.55, 'ρ', { align: 'right', color: accent, alpha: 1 });
      pl.text(0.78, 1.4, 'ω', { align: 'center', alpha: 0.85 });
      pl.text(1.019, 0.6, 'φ', { align: 'center', alpha: 0.85 });
      pl.text(0.04, 0.012, L('continuum'), { alpha: 0.75 });
      pl.text(1.2, 2.2, L('vacuum'), { align: 'right', alpha: 0.7 });
      pl.text(1.2, 1.2, L('inMedium'), { align: 'right', color: accent, alpha: 1 });
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['dileptons'],
      anim: { fluctuations: 5, 'fluctuations-plot': 2.4, 'directed-flow': 7.5, 'turn-off': 6.5 },
      draw: (g, s, p, e) => {
        const ts = (st: string) => (e.state === st ? e.ts : 1e3);
        layers[0](g, s.w, s.h, p.f, (g2) => drawFluct(g2, s.w, s.h, ts('fluctuations')));
        layers[1](g, s.w, s.h, p.fp, (g2) => drawFplot(g2, s.w, s.h, ts('fluctuations-plot')));
        layers[2](g, s.w, s.h, p.d, (g2) => drawDflow(g2, s.w, s.h, ts('directed-flow'), e.reduced));
        layers[3](g, s.w, s.h, p.o, (g2) => drawTurnoff(g2, s.w, s.h, ts('turn-off'), e.reduced));
        layers[4](g, s.w, s.h, p.l, (g2) => drawDilep(g2, s.w, s.h, e.t, e.reduced));
        void clamp;
        void grid;
      },
    });
  },
};
export default mod;

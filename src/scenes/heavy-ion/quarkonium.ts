/**
 * hi.quarkonium — bound heavy quark pairs, Debye screening, sequential melting.
 *  bound: J/ψ (cc̄, r ≈ 0.4 fm) and Υ(1S) (bb̄, r ≈ 0.2 fm) drawn to a common length scale.
 *  screening: Yukawa-screened string, λ_D ≈ 0.64 fm × (Tc/T) (schematic); a pair of size r melts when λ_D < r.
 *  melt-sequence: dissociation temperatures in units of Tc (qualitative ordering), a sweeping temperature, and a
 *  regeneration sketch (c and c̄ from different hard scatterings recombine).
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, smooth, lerp } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { createStage, makeLayer, splitLayout, txt, type G } from './_s3-common';

const STATES = ['bound', 'screening', 'melt-sequence'] as const;
type P = { b: number; sc: number; m: number };
const TARGETS: Record<string, P> = {
  bound: { b: 1, sc: 0, m: 0 },
  screening: { b: 0, sc: 1, m: 0 },
  'melt-sequence': { b: 0, sc: 0, m: 1 },
};

// fm, schematic Debye length ~ 1/(gT), normalised to ~0.64 fm at Tc so that the melting points here match the
// melt-sequence panel (J/psi, r ~ 0.4 fm, dissolves near 1.6 Tc; Upsilon(1S), r ~ 0.2 fm, near 3 Tc).
const lambdaD = (T: number) => 0.64 / T;
const R_JPSI = 0.4;
const R_UPS = 0.2;

// Dissociation temperatures T/Tc, qualitative ordering only (most tightly bound melts last).
const ROWS = [
  { key: 'ups1', Td: 3.0 },
  { key: 'jpsi', Td: 1.6 },
  { key: 'ups2', Td: 1.3 },
  { key: 'ups3', Td: 1.05 },
] as const;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const rnd = mulberry32(31);
    // exponential radii / angles for the screening cloud (fixed random numbers; scale with λ_D)
    const cloud = Array.from({ length: 80 }, () => ({ e: -Math.log(1 - rnd()), a: rnd() * Math.PI * 2, ph: rnd() * 6.28, who: rnd() < 0.5 ? 0 : 1 }));
    const LA = makeLayer();
    const LB = makeLayer();
    const LC = makeLayer();
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg, grid } = ctx.theme;

    const quark = (g: G, x: number, y: number, kind: 'c' | 'b', hollow = false) => {
      g.beginPath();
      g.arc(x, y, kind === 'b' ? 8 : 7, 0, Math.PI * 2);
      g.fillStyle = kind === 'b' ? accent2 : accent;
      g.strokeStyle = kind === 'b' ? accent2 : accent;
      g.lineWidth = 1.5;
      if (hollow) g.stroke();
      else g.fill();
    };

    const drawBound = (g: G, w: number, h: number) => {
      const px = Math.min(560, w * 0.52);
      const cy = h * 0.46;
      const pair = (cxm: number, r: number, kind: 'c' | 'b', name: string, size: string) => {
        const x0 = cxm - (r * px) / 2;
        const x1 = cxm + (r * px) / 2;
        g.strokeStyle = fg;
        g.globalAlpha = 0.6;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x0, cy);
        g.lineTo(x1, cy);
        g.stroke();
        g.globalAlpha = 1;
        quark(g, x0, cy, kind);
        quark(g, x1, cy, kind, true);
        // size dimension
        g.strokeStyle = fg;
        g.globalAlpha = 0.45;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x0, cy + 26);
        g.lineTo(x1, cy + 26);
        g.moveTo(x0, cy + 21);
        g.lineTo(x0, cy + 31);
        g.moveTo(x1, cy + 21);
        g.lineTo(x1, cy + 31);
        g.stroke();
        g.globalAlpha = 1;
        txt(g, size, cxm, cy + 44, { mono: true, align: 'center' });
        txt(g, name, cxm, cy - 34, { align: 'center', alpha: 1 });
      };
      pair(w * 0.28, R_JPSI, 'c', L('jpsi'), '≈ 0.4 fm');
      pair(w * 0.72, R_UPS, 'b', L('ups1'), '≈ 0.2 fm');
      // scale bar: 0.5 fm
      const bx = w * 0.5 - (0.5 * px) / 2;
      const by = h * 0.82;
      g.strokeStyle = fg;
      g.globalAlpha = 0.6;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + 0.5 * px, by);
      g.stroke();
      g.globalAlpha = 1;
      txt(g, '0.5 fm', w * 0.5, by + 16, { mono: true, align: 'center', alpha: 0.7 });
      txt(g, L('string'), w * 0.5, h * 0.2, { align: 'center', alpha: 0.7 });
    };

    const drawScreening = (g: G, w: number, h: number, T: number) => {
      const lay = splitLayout(w, h, 1);
      const R = lay.panel;
      const cx = R.x + R.w / 2;
      const cy = R.y + R.h / 2;
      const px = Math.min(R.w * 0.27, R.h * 0.45, 220); // px per fm
      const lam = lambdaD(T);
      const sep = R_JPSI * (1 + 2.2 * smooth(2.35, 3.3, T));
      const xa = cx - (sep * px) / 2;
      const xb = cx + (sep * px) / 2;
      // Debye cloud: free colour charges bunch up around each quark within λ_D
      for (const q of cloud) {
        const x0 = q.who ? xb : xa;
        const r = Math.min(q.e * lam * 0.55, 1.4) * px + 9;
        const jit = 0.012 * T * px;
        const x = x0 + Math.cos(q.a) * r + Math.cos(q.ph) * jit * Math.sin(T * 5 + q.ph);
        const y = cy + Math.sin(q.a) * r + Math.sin(q.ph) * jit * Math.cos(T * 5 + q.ph);
        g.globalAlpha = 0.55;
        g.fillStyle = fg;
        g.beginPath();
        g.arc(x, y, 1.7, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      // string between the quarks: Yukawa-like factor exp(-r/λ_D)
      g.strokeStyle = fg;
      g.lineWidth = 1.5;
      g.globalAlpha = 0.8 * Math.exp(-sep / lam);
      g.beginPath();
      g.moveTo(xa, cy);
      g.lineTo(xb, cy);
      g.stroke();
      g.globalAlpha = 1;
      quark(g, xa, cy, 'c');
      quark(g, xb, cy, 'c', true);
      // screening length circle around one quark
      g.strokeStyle = accent;
      g.lineWidth = 1.25;
      g.setLineDash([4, 4]);
      g.globalAlpha = 0.9;
      g.beginPath();
      g.arc(xa, cy, lam * px, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      txt(g, 'λ_D', xa - lam * px * 0.707 - 4, cy - lam * px * 0.707 - 4, { mono: true, color: accent, align: 'right', alpha: 1 });
      txt(g, `T = ${ctx.formatNumber(T, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} Tc`, R.x + 18, R.y + 24, { mono: true });
      txt(g, lam < R_JPSI ? L('unbound') : L('bound'), R.x + 18, R.y + 44, { alpha: 0.75 });
      // λ_D(T) plot with the pair size
      const pl = plot(g, ctx, lay.plotR, { min: 1, max: 3.5, label: 'T / Tc', ticks: [1, 2, 3].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 0.8, label: L('lambdaAxis'), ticks: [0, 0.2, 0.4, 0.6].map((v) => ({ v, label: ctx.formatNumber(v) })) });
      pl.axes();
      pl.hline(R_JPSI, { color: accent2, dash: [4, 4], alpha: 0.8 });
      pl.text(3.5, R_JPSI + 0.06, L('pairSize'), { align: 'right', color: accent2, alpha: 1 });
      pl.curve((t) => lambdaD(t), { color: accent, width: 1.75 });
      pl.text(1.1, 0.7, 'λ_D', { color: accent, alpha: 1, mono: true });
      pl.dot(T, lam, 4, accent);
    };

    const drawMelt = (g: G, w: number, h: number, ts: number, clock: number, reduced: boolean) => {
      const wide = w >= 560 && w > h * 1.05;
      const barsR = wide ? { x: 92, y: 34, w: w * 0.6 - 92 - 20, h: h - 34 - 56 } : { x: 80, y: 30, w: w - 80 - 22, h: h * 0.55 - 30 - 46 };
      const regR = wide ? { x: w * 0.6 + 10, y: h * 0.2, w: w * 0.4 - 30, h: h * 0.6 } : { x: 20, y: h * 0.6, w: w - 40, h: h * 0.38 };
      const fin = ts > 100;
      const Tm = fin ? 1.45 : 0.8 + 3.2 * smooth(0.4, 8, ts);
      const pl = plot(g, ctx, barsR, { min: 0.8, max: 4, label: 'T / Tc', ticks: [1, 2, 3, 4].map((v) => ({ v, label: String(v) })) }, { min: 0, max: ROWS.length, ticks: [] });
      pl.axes();
      pl.vline(1, { color: fg, dash: [3, 4], alpha: 0.4 });
      pl.text(1, ROWS.length + 0.15, 'Tc', { mono: true, align: 'center', alpha: 0.7 });
      ROWS.forEach((r, i) => {
        const y = ROWS.length - i - 0.5;
        pl.path([[0.8, y], [r.Td, y]], { color: accent, width: 3 });
        pl.path([[r.Td, y], [4, y]], { color: grid, width: 1, dash: [2, 4], alpha: 0.6 });
        pl.dot(r.Td, y, 3, accent);
        pl.text(0.8 - 0.03, y, r.key === 'jpsi' ? 'J/ψ' : L(r.key), { align: 'right', alpha: 1 });
        const alive = Tm < r.Td;
        const X = pl.X(Tm);
        const Yy = pl.Y(y);
        g.beginPath();
        g.arc(X, Yy, 5, 0, Math.PI * 2);
        g.lineWidth = 1.5;
        g.strokeStyle = accent2;
        g.fillStyle = accent2;
        if (alive) g.fill();
        else g.stroke();
      });
      pl.vline(Tm, { color: accent2, alpha: 0.7, width: 1 });
      txt(g, L('moreBound'), barsR.x - 78, barsR.y + 24, { alpha: 0.6, align: 'left' });
      txt(g, `T = ${ctx.formatNumber(Tm, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} Tc`, barsR.x + barsR.w, barsR.y - 14, { mono: true, align: 'right', alpha: 0.85 });
      txt(g, L('meltNote'), barsR.x, barsR.y + barsR.h + 48, { alpha: 0.6 });
      // regeneration sketch
      const rcx = regR.x + regR.w / 2;
      const rcy = regR.y + regR.h / 2;
      const rr = Math.min(regR.w, regR.h) / 2 - 8;
      g.strokeStyle = fg;
      g.globalAlpha = 0.35;
      g.lineWidth = 1;
      g.setLineDash([3, 4]);
      g.beginPath();
      g.arc(rcx, rcy, rr, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      const u = reduced ? 0.9 : ((clock * 0.22) % 1.4) / 1.4; // looping sketch
      const mv = smooth(0.15, 0.7, u);
      const pt = (x: number, y: number) => [rcx + x * rr, rcy - y * rr] as const;
      const c1 = pt(lerp(-0.7, -0.15, mv), lerp(0.4, 0.02, mv));
      const a1 = pt(lerp(-0.45, -0.6, mv), lerp(0.62, -0.5, mv));
      const c2 = pt(lerp(0.7, 0.55, mv), lerp(-0.4, 0.5, mv));
      const a2 = pt(lerp(0.45, 0.15, mv), lerp(-0.6, -0.02, mv));
      const born = 1 - smooth(0.1, 0.3, u);
      if (born > 0.01) {
        g.setLineDash([2, 3]);
        g.strokeStyle = fg;
        g.globalAlpha = 0.5 * born;
        for (const [p1, p2] of [[c1, a1], [c2, a2]] as const) {
          g.beginPath();
          g.moveTo(p1[0], p1[1]);
          g.lineTo(p2[0], p2[1]);
          g.stroke();
        }
        g.setLineDash([]);
      }
      const bind = smooth(0.7, 0.85, u);
      g.globalAlpha = 0.8 * bind;
      g.strokeStyle = fg;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(c1[0], c1[1]);
      g.lineTo(a2[0], a2[1]);
      g.stroke();
      g.globalAlpha = 1;
      quark(g, c1[0], c1[1], 'c');
      quark(g, c2[0], c2[1], 'c');
      quark(g, a1[0], a1[1], 'c', true);
      quark(g, a2[0], a2[1], 'c', true);
      txt(g, 'J/ψ', (c1[0] + a2[0]) / 2, (c1[1] + a2[1]) / 2 - 14, { align: 'center', alpha: bind });
      txt(g, L('regen'), rcx, regR.y - 6, { align: 'center', alpha: 0.9 });
      txt(g, L('regenNote'), rcx, regR.y + regR.h + 12, { align: 'center', alpha: 0.6 });
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { screening: 7, 'melt-sequence': 9 },
      loop: ['melt-sequence'],
      draw: (g, s, p, e) => {
        LA(g, s.w, s.h, p.b, (g2) => drawBound(g2, s.w, s.h));
        const T = 1 + 2.2 * smooth(0.4, 5.5, e.state === 'screening' ? e.ts : 0);
        LB(g, s.w, s.h, p.sc, (g2) => drawScreening(g2, s.w, s.h, e.state === 'screening' || e.reduced ? T : 1));
        LC(g, s.w, s.h, p.m, (g2) => drawMelt(g2, s.w, s.h, e.state === 'melt-sequence' ? e.ts : 0.0, e.t, e.reduced));
      },
    });
  },
};
export default mod;

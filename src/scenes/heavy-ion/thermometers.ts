/**
 * hi.thermometers — three ways the fireball reports its temperature.
 *  strangeness: share of strange quarks (qualitative) and the Boltzmann factor exp(-m/T) behind it.
 *  photons: hadrons are absorbed, photons and lepton pairs leave from every depth; thermal spectrum ∝ exp(-pT/T).
 *  hadron-ratios: Boltzmann plot ln[yield/(g m^{3/2})] = const - m/T: one temperature puts all species on one line.
 * Everything is a textbook formula; no data points.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { createStage, drawFireball, makeLayer, splitLayout, txt, type G } from './_s3-common';

const STATES = ['strangeness', 'photons', 'hadron-ratios'] as const;
type P = { s: number; p: number; r: number };
const TARGETS: Record<string, P> = {
  strangeness: { s: 1, p: 0, r: 0 },
  photons: { s: 0, p: 1, r: 0 },
  'hadron-ratios': { s: 0, p: 0, r: 1 },
};

const M_S = 0.095; // GeV
const SPECIES = [
  { key: 'pi', m: 0.138 },
  { key: 'K', m: 0.494 },
  { key: 'p', m: 0.938 },
  { key: 'Lambda', m: 1.116 },
  { key: 'Xi', m: 1.322 },
  { key: 'Omega', m: 1.672 },
] as const;
const PERIOD = 3.6;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const rnd = mulberry32(7);
    const ev = Array.from({ length: 26 }, (_, i) => {
      const r = Math.sqrt(rnd()) * 0.92;
      const a0 = rnd() * Math.PI * 2;
      const a = rnd() * Math.PI * 2;
      return { x: r * Math.cos(a0), y: r * Math.sin(a0), a, kind: i % 3, t0: (i / 26) * PERIOD, stop: 0.2 + 0.1 * rnd() };
    });
    const LA = makeLayer();
    const LB = makeLayer();
    const LC = makeLayer();
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;

    const drawStrange = (g: G, w: number, h: number) => {
      const lay = splitLayout(w, h, 1);
      const R = lay.panel;
      // two 10x10 grids centred 0.42·w apart: keep a gap of ~1.5 cells between them
      const cell = Math.min(20, (R.w * 0.42) / 11.5, R.h / 16);
      const cols = [
        { n: 8, label: L('pp'), x: R.x + R.w * 0.3 },
        { n: 17, label: L('aa'), x: R.x + R.w * 0.72 },
      ];
      for (const c of cols) {
        const x0 = c.x - 5 * cell;
        const y0 = R.y + R.h * 0.5 - 5 * cell;
        for (let i = 0; i < 100; i++) {
          const gx = i % 10;
          const gy = Math.floor(i / 10);
          // strange quarks fill the cells from the top-left; the rest are u, d
          const strange = i < c.n;
          g.globalAlpha = strange ? 1 : 0.28;
          g.fillStyle = strange ? accent : fg;
          g.beginPath();
          g.arc(x0 + gx * cell + cell / 2, y0 + gy * cell + cell / 2, cell * 0.36, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        txt(g, c.label, c.x, y0 + 10 * cell + 18, { align: 'center' });
      }
      txt(g, L('strangeShare'), R.x + R.w / 2, R.y + R.h * 0.5 - 5 * cell - 24, { align: 'center', color: accent, alpha: 1 });
      const pl = plot(g, ctx, lay.plotR, { min: 0, max: 0.4, label: L('mAxis'), ticks: [0, 0.1, 0.2, 0.3, 0.4].map((v) => ({ v, label: ctx.formatNumber(v, { maximumFractionDigits: 1 }) })) }, { min: 0, max: 1.05, label: L('boltzAxis'), ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }] });
      pl.axes();
      pl.curve((m) => Math.exp(-m / 0.07), { color: fg, dash: [4, 4], alpha: 0.75, width: 1.5 });
      pl.curve((m) => Math.exp(-m / 0.16), { color: accent, width: 1.75 });
      pl.vline(M_S, { color: fg, alpha: 0.35, dash: [2, 4] });
      pl.text(M_S + 0.01, 1.0, L('sQuark'), { alpha: 0.8 });
      pl.text(0.25, Math.exp(-0.25 / 0.16) + 0.1, L('hot'), { align: 'left', color: accent, alpha: 1 });
      pl.text(0.15, 0.2, L('cooler'), { align: 'left', alpha: 0.8 });
      pl.dot(M_S, Math.exp(-M_S / 0.16), 3.5, accent);
      pl.dot(M_S, Math.exp(-M_S / 0.07), 3.5, fg);
    };

    const drawPhotons = (g: G, w: number, h: number, t: number, final: boolean) => {
      const lay = splitLayout(w, h, 1);
      const R = lay.panel;
      const cx = R.x + R.w / 2;
      const cy = R.y + R.h / 2;
      const rad = Math.min(R.w, R.h) * 0.32;
      g.save();
      g.beginPath();
      g.rect(R.x, R.y, R.w, R.h);
      g.clip();
      drawFireball(g, cx, cy, rad, 1, 0.62);
      g.strokeStyle = fg;
      g.globalAlpha = 0.35;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI * 2);
      g.stroke();
      const reach = Math.min(R.w, R.h) / 2 / rad; // radii from centre to panel edge
      for (const e of ev) {
        const phase = final ? 0.75 + (e.t0 / PERIOD) * 0.5 : (((t - e.t0) % PERIOD) + PERIOD) % PERIOD;
        const head = phase * 1.0; // radii travelled
        const ux = Math.cos(e.a);
        const uy = Math.sin(e.a);
        // distance from the source to the surface along the ray
        const b = e.x * ux + e.y * uy;
        const de = -b + Math.sqrt(b * b - (e.x * e.x + e.y * e.y) + 1);
        const alpha = 1 - smooth(reach * 0.7, reach * 0.95, head + 0.4);
        if (alpha <= 0) continue;
        const sx = cx + e.x * rad;
        const sy = cy - e.y * rad;
        if (e.kind === 1) {
          // hadron: absorbed after a short mean free path unless it starts near the surface
          const end = de < e.stop ? Math.min(head, 2.4) : Math.min(head, e.stop);
          g.globalAlpha = 0.9 * (de < e.stop ? alpha : Math.max(0, 1 - smooth(e.stop, e.stop + 0.4, head - e.stop + 0.1) * 0.8));
          g.strokeStyle = accent;
          g.lineWidth = 1.25;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(sx + ux * end * rad, sy - uy * end * rad);
          g.stroke();
          if (de >= e.stop && head > e.stop) {
            const ex = sx + ux * e.stop * rad;
            const ey = sy - uy * e.stop * rad;
            g.beginPath();
            g.moveTo(ex - 3, ey - 3);
            g.lineTo(ex + 3, ey + 3);
            g.moveTo(ex - 3, ey + 3);
            g.lineTo(ex + 3, ey - 3);
            g.stroke();
          }
        } else {
          // photon (kind 0) or lepton pair (kind 2): unattenuated
          const n = e.kind === 2 ? 2 : 1;
          for (let k = 0; k < n; k++) {
            const aa = e.a + (k ? 0.22 : e.kind === 2 ? -0.22 : 0);
            g.globalAlpha = 0.95 * alpha;
            g.strokeStyle = accent2;
            g.lineWidth = 1.25;
            g.setLineDash(e.kind === 2 ? [] : [1, 0]);
            g.beginPath();
            g.moveTo(sx, sy);
            g.lineTo(sx + Math.cos(aa) * head * rad, sy - Math.sin(aa) * head * rad);
            g.stroke();
            if (e.kind === 2) {
              g.fillStyle = accent2;
              g.beginPath();
              g.arc(sx + Math.cos(aa) * head * rad, sy - Math.sin(aa) * head * rad, 1.8, 0, Math.PI * 2);
              g.fill();
            }
          }
        }
      }
      g.restore();
      txt(g, L('fireball'), cx, cy + rad + 22, { align: 'center', alpha: 0.7 });
      txt(g, L('legendPhoton'), R.x + 14, R.y + 18, { color: accent2, alpha: 1 });
      txt(g, L('legendHadron'), R.x + 14, R.y + 36, { color: accent, alpha: 1 });
      // spectrum
      const pl = plot(g, ctx, lay.plotR, { min: 0, max: 3, label: L('pT'), ticks: [0, 1, 2, 3].map((v) => ({ v, label: String(v) })) }, { min: 1e-6, max: 2, log: true, label: L('yield'), ticks: [] });
      pl.axes();
      const early = (x: number) => 0.012 * Math.exp(-x / 0.45);
      const late = (x: number) => 0.9 * Math.exp(-x / 0.2);
      pl.curve(early, { color: fg, dash: [4, 4], alpha: 0.6, width: 1.25 });
      pl.curve(late, { color: fg, dash: [4, 4], alpha: 0.6, width: 1.25 });
      pl.curve((x) => early(x) + late(x), { color: accent2, width: 1.75 });
      pl.text(2.9, early(2.9) * 2.2, L('early'), { align: 'right', alpha: 0.75 });
      pl.text(1.0, late(1.0) * 3, L('late'), { alpha: 0.75 });
      pl.text(0.8, 0.09, L('slope'), { color: accent2, alpha: 1 });
    };

    const drawRatios = (g: G, w: number, h: number) => {
      const r = { x: 60, y: 44, w: Math.max(40, w - 60 - 56), h: h - 44 - 62 };
      const Tm = 0.156;
      const f = (T: number) => (m: number) => -(m - 0.138) / T;
      const pl = plot(g, ctx, r, { min: 0, max: 1.9, label: L('massAxis'), ticks: [0, 0.5, 1, 1.5].map((v) => ({ v, label: ctx.formatNumber(v, { maximumFractionDigits: 1 }) })) }, { min: -13, max: 1.5, label: L('logYield'), ticks: [] });
      pl.axes();
      pl.curve(f(0.12), { color: fg, dash: [4, 4], alpha: 0.7, width: 1.25 });
      pl.text(1.35, f(0.12)(1.35) - 1.0, L('lowerT'), { align: 'center', alpha: 0.75 });
      pl.curve(f(Tm), { color: accent, width: 1.75 });
      pl.text(0.55, f(Tm)(0.55) + 1.3, L('oneT'), { align: 'left', color: accent, alpha: 1 });
      SPECIES.forEach((sp, i) => {
        pl.dot(sp.m, f(Tm)(sp.m), 3.5, accent2);
        pl.text(sp.m, f(Tm)(sp.m) + (i % 2 ? -0.9 : 0.9), L(sp.key), { align: 'center', alpha: 1 });
      });
      txt(g, 'T = 156 MeV,  μ_B ≈ 0', r.x + r.w, r.y - 14, { mono: true, align: 'right', alpha: 0.85 });
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['photons'],
      draw: (g, s, p, e) => {
        LA(g, s.w, s.h, p.s, (g2) => drawStrange(g2, s.w, s.h));
        LB(g, s.w, s.h, p.p, (g2) => drawPhotons(g2, s.w, s.h, e.t, e.reduced));
        LC(g, s.w, s.h, p.r, (g2) => drawRatios(g2, s.w, s.h));
      },
    });
  },
};
export default mod;

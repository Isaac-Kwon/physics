/**
 * det.simulation — generate, transport, digitize, compare. Uses the onion of _d2-onion.ts (CMS-like barrel, end view).
 *   generate: one collision vertex and nine particles with momenta drawn from a seeded falling spectrum; arrow length = momentum (viridis).
 *   transport: each particle is stepped through the layers (track curvature R = p / (0.3 B), schematic), with random kinks standing for multiple scattering,
 *              interaction points and secondary sprays where it showers, deposits in ECAL / HCAL towers (viridis = energy).
 *   digitize: one calorimeter channel. Deposits at given times -> shaped pulses (tau_d = 40 ns, tau_r = 10 ns), 25 ns sampling, Gaussian noise
 *             (sigma = 1.5 counts), threshold at 3 sigma. The smallest deposit stays below threshold and is lost.
 *   compare: two event displays drawn by the same generator with different seeds, both labelled as illustration (no real data).
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, gaussian, mulberry32 } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { interpolateViridis } from 'd3';
import { arrow, dot, line, txt } from '../common/_draw';
import { R_VIEW, drawOnion, drawSig, makeSig, type Kind, type Pt, type Sig } from './_d2-onion';
import { makeClock } from './_d2-common';

const STATES = ['generate', 'transport', 'digitize', 'compare'] as const;
type St = (typeof STATES)[number];
const KINDS: Kind[] = ['electron', 'photon', 'muon', 'charged-hadron', 'charged-hadron', 'neutral-hadron', 'charged-hadron', 'photon', 'charged-hadron'];

interface Ev {
  sigs: { sig: Sig; p: number; phi: number }[];
}
function makeEvent(seed: number, n = 9): Ev {
  const r = mulberry32(seed);
  const sigs = Array.from({ length: n }, (_, i) => {
    const kind = KINDS[Math.floor(r() * KINDS.length)];
    const phi = ((i + 0.3 + 0.4 * r()) / n) * Math.PI * 2;
    const p = 1 + -3 * Math.log(1 - r() * 0.95);
    const R = 0.7 + (3.2 * p) / 12;
    const q: 1 | -1 = r() < 0.5 ? 1 : -1;
    const sig = makeSig(kind, phi, q, R, Math.min(1, 0.25 + p / 9));
    // random kinks along the path: multiple scattering random walk
    if (sig.track) {
      let dx = 0;
      let dy = 0;
      sig.path = sig.path.map((pt, k): Pt => {
        if (k > 0 && pt[0] * pt[0] + pt[1] * pt[1] < 0.5) {
          dx += 0.0012 * gaussian(r);
          dy += 0.0012 * gaussian(r);
        }
        return [pt[0] + dx, pt[1] + dy];
      });
    }
    return { sig, p, phi };
  });
  return { sigs };
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number, d = 1) => ctx.formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d });
    const clk = makeClock(ctx);
    let state: St = 'generate';
    const evA = makeEvent(3);
    const evS = makeEvent(11);
    const evR = makeEvent(29);
    const pMax = Math.max(...evA.sigs.map((s) => s.p));
    // digitization data
    const DEP: [number, number][] = [
      [30, 1.8],
      [95, 0.6],
      [205, 0.04],
    ];
    const NOISE = 1.5;
    const SCALE = 40; // counts per GeV
    const THR = 3 * NOISE;
    const pulse = (t: number) => (t <= 0 ? 0 : (Math.exp(-t / 40) - Math.exp(-t / 10)) / 0.473);
    const rr = mulberry32(61);
    const samples = Array.from({ length: 11 }, (_, k) => {
      const t = k * 25;
      return { t, v: DEP.reduce((a, [td, e]) => a + SCALE * e * pulse(t - td), 0) + NOISE * gaussian(rr) };
    });

    const drawEvent = (g: CanvasRenderingContext2D, cx: number, cy: number, K: number, ev: Ev, prog: number, ids: boolean, col: string) => {
      drawOnion(g, cx, cy, K, th, { ex: [], emph: [], base: 0.22, field: 0 });
      ev.sigs.forEach((e, i) => {
        if (state === 'generate') return;
        drawSig(g, cx, cy, K, th, e.sig, prog, col);
        void i;
      });
      void ids;
    };

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      const wide = w >= 640 && w > h * 1.15;
      const narrow = w < 560;

      if (state === 'generate' || state === 'transport') {
        const S = wide ? Math.min(h - 16, w * 0.6) : Math.min(w - 16, h - 130);
        const cx = wide ? 8 + S / 2 : w / 2;
        const cy = 8 + S / 2;
        const K = S / 2 / R_VIEW;
        if (state === 'generate') {
          drawOnion(g, cx, cy, K, th, { ex: [], emph: [], base: 0.1, field: 0 });
          const q = clk.p(0.1, 1.0);
          evA.sigs.forEach((e, i) => {
            const len = (0.12 + (0.5 * e.p) / pMax) * K * q;
            const x1 = cx + Math.cos(e.phi) * len;
            const y1 = cy - Math.sin(e.phi) * len;
            arrow(g, cx, cy, x1, y1, interpolateViridis(0.15 + 0.8 * (e.p / pMax)), 1.6, 1, 7);
            txt(g, String(i + 1), cx + Math.cos(e.phi) * (len + 12), cy - Math.sin(e.phi) * (len + 12), { mono: true, color: th.fg, align: 'center', alpha: q });
          });
          dot(g, cx, cy, 3, th.fg, 1);
          // table of momenta
          const tx = wide ? 8 + S + 30 : 20;
          const ty = wide ? 52 : 8 + S + 24;
          txt(g, L('gen'), tx, ty - 24, { color: th.fg, alpha: 0.75 });
          const per = wide ? 1 : 3;
          evA.sigs.forEach((e, i) => {
            const col = wide ? 0 : i % per;
            const row = wide ? i : Math.floor(i / per);
            const colW = narrow ? 120 : 200;
            txt(g, `${i + 1}   p = ${f1(e.p, 1)} GeV/c`, tx + col * colW, ty + row * 20, { mono: true, color: interpolateViridis(0.15 + 0.8 * (e.p / pMax)), alpha: q });
          });
          if (wide) txt(g, L('lenNote'), tx, ty + evA.sigs.length * 20 + 14, { color: th.fg, alpha: 0.65 });
        } else {
          const prog = clk.p(0.1, 1.6);
          drawEvent(g, cx, cy, K, evA, prog, false, th.accent);
          // interaction points and secondary sprays where particles stop
          evA.sigs.forEach((e) => {
            const sg = e.sig;
            const end: Pt | null = sg.track && sg.kind !== 'muon' ? sg.path[sg.path.length - 1] : sg.guide ? sg.guide[1] : null;
            if (!end || prog < 0.85) return;
            const ex = cx + end[0] * K;
            const ey = cy - end[1] * K;
            const r2 = mulberry32(Math.round(e.phi * 1000));
            const ang0 = Math.atan2(end[1], end[0]);
            const n = sg.kind === 'electron' || sg.kind === 'photon' ? 7 : 5;
            for (let k = 0; k < n; k++) {
              const a = ang0 + (r2() - 0.5) * 1.2;
              const l1 = (0.018 + 0.03 * r2()) * K;
              line(g, ex, ey, ex + Math.cos(a) * l1, ey - Math.sin(a) * l1, th.accent2, 1, 0.7);
            }
            dot(g, ex, ey, 2.2, th.accent2, 0.9);
          });
          dot(g, cx, cy, 2.5, th.fg, 1);
          const tx = wide ? 8 + S + 30 : 20;
          const ty = wide ? 52 : 8 + S + 24;
          const items = [
            ['stepA', th.accent],
            ['stepB', th.accent2],
            ['stepC', th.fg],
          ] as const;
          items.forEach(([k, col], i) => txt(g, L(k), tx, ty + i * 22, { color: col, alpha: 0.9 }));
          txt(g, L('stepD'), tx, ty + 3 * 22, { color: th.fg, alpha: 0.65 });
        }
        return;
      }

      if (state === 'digitize') {
        const pad = narrow ? 52 : 70;
        const hTop = Math.max(60, (h - 150) * 0.32);
        const rTop = { x: pad, y: 40, w: w - pad - 30, h: hTop };
        const rBot = { x: pad, y: rTop.y + hTop + 60, w: rTop.w, h: Math.max(80, h - (rTop.y + hTop + 60) - 56) };
        const xa = { min: 0, max: 250, label: 'ns', ticks: [0, 50, 100, 150, 200, 250].map((v) => ({ v, label: String(v) })) };
        const p1 = clk.p(0.0, 0.8);
        const pl1 = plot(g, ctx, rTop, { ...xa, label: '' }, { min: 0, max: 2.2, label: L('depE'), ticks: [0, 1, 2].map((v) => ({ v, label: String(v) })) });
        pl1.axes();
        DEP.forEach(([t, e]) => {
          line(g, pl1.X(t), pl1.Y(0), pl1.X(t), pl1.Y(e * p1), th.accent, 2, 1);
          dot(g, pl1.X(t), pl1.Y(e * p1), 2.5, th.accent, 1);
        });
        const pl2 = plot(g, ctx, rBot, xa, { min: -8, max: 90, label: L('adc'), ticks: [0, 30, 60, 90].map((v) => ({ v, label: String(v) })) });
        pl2.axes();
        pl2.hline(0, { alpha: 0.3 });
        pl2.hline(THR, { color: th.accent2, dash: [5, 4], alpha: 0.9 });
        pl2.text(250, THR + 6, `${L('thr')}  3σ`, { color: th.accent2, align: 'right' });
        const p2 = clk.p(0.7, 0.8);
        pl2.curve((t) => DEP.reduce((a, [td, e]) => a + SCALE * e * pulse(t - td), 0), { color: th.fg, width: 1.2, alpha: 0.5, progress: p2 }, 300);
        samples.forEach((sm, k) => {
          if (k / samples.length > clk.p(1.2, 1.0)) return;
          const above = sm.v > THR;
          pl2.dot(sm.t, sm.v, above ? 4 : 3, above ? th.accent : th.fg);
        });
        pl2.text(DEP[2][0] - 6, 16, L('lost'), { color: th.fg, alpha: 0.8 });
        txt(g, L('noise'), rBot.x + 8, rBot.y + rBot.h + 40, { color: th.fg, alpha: 0.7 });
        txt(g, L('shape'), rBot.x + rBot.w, rBot.y - 12, { color: th.fg, align: 'right', alpha: 0.6 });
        return;
      }

      // compare
      const S = wide ? Math.min(h - 70, w / 2 - 24) : Math.min(w - 16, (h - 80) / 2);
      const cxA = wide ? w / 4 : w / 2;
      const cxB = wide ? (3 * w) / 4 : w / 2;
      const cyA = 34 + S / 2;
      const cyB = wide ? cyA : cyA + S + 34;
      const K = S / 2 / R_VIEW;
      const prog = clk.p(0.1, 1.0);
      drawEvent(g, cxA, cyA, K, evS, prog, false, th.accent);
      drawEvent(g, cxB, cyB, K, evR, prog, false, th.accent);
      txt(g, L('simulated'), cxA, 16, { color: th.fg, align: 'center', alpha: 0.95 });
      txt(g, L('recorded'), cxB, wide ? 16 : cyB - S / 2 - 16, { color: th.fg, align: 'center', alpha: 0.95 });
      txt(g, L('illus'), w / 2, h - 12, { color: th.fg, align: 'center', alpha: 0.6 });
    });
    c.animate = true;
    return {
      setState(st: string, o: SetStateOptions) {
        state = (STATES as readonly string[]).includes(st) ? (st as St) : 'generate';
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

/**
 * dm.axion-cavity — P9 (abridged): an axion haloscope (ADMX / CAPP style).
 * Side view: solenoid (current into the page on the right, out on the left, so B points up), a cylindrical metal cavity, a tuning
 * rod, an antenna and a quiet amplifier. The TM010 mode has E along B with profile J0(2.405 r/R), so the axion field a(t) can drive
 * it: E ~ a(t) B J0(...), drawn as arrows whose length follows a(t) (frequency slowed down enormously for the screen).
 * Numbers: nu = m_a c^2 / h with 1 ueV <-> 242 MHz (DM.AXION_FREQ_MHZ_PER_UEV); P ~ 1e-23 W (DM.AXION_SIGNAL_POWER_W);
 * the photon rate P / (h nu) = 15 per second at 1 GHz is computed, and the photon dots in "conversion" arrive at that mean rate (seeded).
 *   magnet     : magnet, cavity, cold; the axion field as a slow oscillation (the whole picture is tinted by a(t)).
 *   conversion : the cavity field, the photons going to the amplifier, ~1e-23 W.
 *   tuning     : the rod moves; the resonance (Lorentzian, linewidth exaggerated, Q ~ 25) moves along 0.5-2 GHz; each scan step leaves a
 *                row of noise in the waterfall (pure noise: no axion has been heard).
 */
import { interpolateViridis } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32, clamp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { DM } from '../../data/dark-matter';
import { arrow, dot, fieldSymbol, line, rect, txt } from '../common/_draw';
import { loopPhase, wrap } from './_dm2-common';

const STATES = ['magnet', 'conversion', 'tuning'] as const;
type St = (typeof STATES)[number];
const MHZ_PER_UEV = DM.AXION_FREQ_MHZ_PER_UEV.value as number;
const P_W = DM.AXION_SIGNAL_POWER_W.value as number;
const H_PLANCK = 6.626e-34;
const F0 = 0.5; // GHz
const F1 = 2.0;
const NR = 34; // waterfall rows
const NB = 14; // noise bins in a row
const Q = 8;

const J0 = (x: number) => {
  const q = x * x;
  return 1 - q / 4 + (q * q) / 64 - (q * q * q) / 2304 + (q * q * q * q) / 147456;
};
const ueV = (ghz: number) => (ghz * 1000) / MHZ_PER_UEV;

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const rnd = mulberry32(41);
    const noise = Array.from({ length: NR }, () => Array.from({ length: NB }, () => rnd()));
    const photonsPerS = P_W / (H_PLANCK * 1e9);
    // photon arrival times over 20 s (Poisson-like, seeded), mean rate scaled to the real one
    const arrivals: number[] = [];
    {
      let t = 0;
      while (t < 40) {
        t += -Math.log(1 - rnd()) / photonsPerS;
        arrivals.push(t);
      }
    }
    const lv: Record<string, number> = { magnet: 1, conversion: 0, tuning: 0 };
    let state: St = 'magnet';
    let t0 = 0;
    let now = 0;
    let rowsShown = 0;

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      now = s.t;
      const ts = now - t0;
      for (const k of STATES) lv[k] = approach(lv[k], k === state ? 1 : 0, s.dt, 0.4);
      const portrait = w / h < 1.0;
      const pad = 14;
      const D = portrait ? { x: pad, y: pad, w: w - 2 * pad, h: (h - 2 * pad) * 0.5 } : { x: pad, y: pad, w: (w - 2 * pad) * 0.46, h: h - 2 * pad };
      const P = portrait ? { x: pad, y: pad + D.h + 10, w: w - 2 * pad, h: h - 2 * pad - D.h - 10 } : { x: pad + D.w + 24, y: pad, w: w - 2 * pad - D.w - 24, h: h - 2 * pad };

      // scan state
      const scanDur = 9;
      const sc = state === 'tuning' ? (ctx.reducedMotion ? 1 : clamp((ts % (scanDur + 2)) / scanDur)) : 0;
      const u = state === 'tuning' ? sc : 0.45;
      const nuRes = F0 + (F1 - F0) * u;
      // axion field (screen frequency 0.7 Hz; same phase everywhere)
      const aNow = ctx.reducedMotion ? 1 : Math.cos(2 * Math.PI * 0.7 * now);

      // tint of the whole figure by the axion field
      const mg = lv.magnet;
      if (mg > 0.02) {
        g.save();
        g.globalAlpha = 0.09 * mg * (0.5 + 0.5 * aNow);
        g.fillStyle = th.accent;
        g.fillRect(0, 0, w, h);
        g.restore();
      }

      // ---------- diagram ----------
      const cw = Math.min(D.w * 0.34, 150);
      const chh = D.h * 0.55;
      const cx = D.x + D.w * 0.5;
      const cavY = D.y + D.h * 0.3;
      const cavX = cx - cw / 2;
      // cold region (cryostat)
      g.save();
      g.setLineDash([4, 3]);
      g.strokeStyle = th.fg;
      g.globalAlpha = 0.4;
      g.lineWidth = 1;
      g.strokeRect(cavX - 54, cavY - 22, cw + 108, chh + 44);
      g.restore();
      txt(g, L('cold'), cavX - 50, cavY + chh + 36, { color: th.fg, alpha: 0.7 });
      // solenoid windings: left out of the page, right into the page -> B up
      const nW = 8;
      for (let k = 0; k < nW; k++) {
        const yy = cavY - 6 + ((chh + 12) * (k + 0.5)) / nW;
        fieldSymbol(g, cavX - 32, yy, true, th.fg, 0.6, 4);
        fieldSymbol(g, cavX + cw + 32, yy, false, th.fg, 0.6, 4);
      }
      txt(g, L('magnet'), cavX - 46, cavY + chh * 0.5, { color: th.fg, align: 'right', alpha: 0.85 });
      // B arrows
      for (const fx of [-0.35, 0, 0.35]) arrow(g, cx + fx * cw + 0, cavY + chh + 14, cx + fx * cw, cavY - 16, th.fg, 1, 0.3, 5);
      txt(g, 'B', cx + cw * 0.5 + 36, cavY - 12, { color: th.fg, mono: true, alpha: 0.85 });
      // cavity
      rect(g, cavX, cavY, cw, chh, th.fg, 2, 0.95, 0.05);
      txt(g, L('cavity'), cavX + cw + 62, cavY + chh * 0.52, { color: th.fg, alpha: 0.85 });
      // tuning rod (moves from the wall towards the middle)
      const rodX = cavX + cw * (0.12 + 0.7 * u);
      line(g, rodX, cavY, rodX, cavY + chh * 0.8, th.accent, 3, 0.95);
      line(g, rodX, cavY - 20, rodX, cavY, th.accent, 1, 0.6);
      txt(g, L('rod'), rodX, cavY - 26, { color: th.accent, align: 'center', alpha: 0.9 });
      // antenna and amplifier
      const antX = cavX + cw * 0.9;
      line(g, antX, cavY, antX, cavY + chh * 0.22, th.fg, 1.4, 0.9);
      const ampX = D.x + D.w - 40;
      const ampY = cavY - 52;
      line(g, antX, cavY - 8, antX, ampY, th.fg, 1, 0.55);
      line(g, antX, ampY, ampX - 12, ampY, th.fg, 1, 0.55);
      g.save();
      g.strokeStyle = th.fg;
      g.globalAlpha = 0.9;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(ampX - 12, ampY - 9);
      g.lineTo(ampX + 8, ampY);
      g.lineTo(ampX - 12, ampY + 9);
      g.closePath();
      g.stroke();
      g.restore();
      txt(g, L('amp'), ampX - 2, ampY - 20, { color: th.fg, align: 'center', alpha: 0.85 });
      txt(g, L('amp2'), ampX - 2, ampY + 20, { color: th.fg, align: 'center', alpha: 0.6 });

      // E field of the mode (TM010: E along B), driven by the axion field
      const cv = lv.conversion;
      if (cv > 0.02) {
        const build = ctx.reducedMotion || state === 'tuning' ? 1 : 1 - Math.exp(-ts / 1.4);
        const nA = 7;
        for (let k = 0; k < nA; k++) {
          const fx = (k + 0.5) / nA;
          const prof = J0(2.405 * Math.abs(fx * 2 - 1));
          const a = prof * aNow * build;
          const x = cavX + cw * fx;
          const yc = cavY + chh * 0.5;
          const len = chh * 0.34 * a;
          if (Math.abs(len) > 1) arrow(g, x, yc + len * 0, x, yc - len, th.accent, 1.2, 0.9 * cv, 5);
          dot(g, x, yc, 1.2, th.accent, 0.5 * cv);
        }
        txt(g, 'E', cavX + 6, cavY + 12, { color: th.accent, mono: true, alpha: 0.9 * cv });
      }
      // photons from the cavity to the antenna and on to the amplifier (mean rate P / h nu)
      if (lv.conversion > 0.02) {
        const tt = ctx.reducedMotion ? 3.2 : ts + 0.5;
        const pts: [number, number][] = [
          [0, 0],
          [antX, cavY + chh * 0.12],
          [antX, ampY],
          [ampX - 12, ampY],
        ];
        for (const a of arrivals) {
          const q = (tt - a) / 1.6;
          if (q < 0 || q > 1) continue;
          const sx = cavX + cw * (0.2 + 0.5 * ((a * 7.3) % 1));
          pts[0] = [sx, cavY + chh * 0.45];
          const lens = [0, 1, 2].map((k) => Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]));
          let d = q * (lens[0] + lens[1] + lens[2]);
          let k = 0;
          while (k < 2 && d > lens[k]) {
            d -= lens[k];
            k++;
          }
          const f = lens[k] ? d / lens[k] : 0;
          dot(g, pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, 2, th.fg, 0.95 * lv.conversion);
        }
      }

      // ---------- right panel ----------
      // axion field trace (magnet, conversion)
      const trA = lv.magnet + lv.conversion;
      if (trA > 0.02) {
        const A = clamp(trA);
        const tr = { x: P.x + 20, y: P.y + 40, w: P.w - 40, h: portrait ? P.h * 0.38 : P.h * 0.26 };
        line(g, tr.x, tr.y + tr.h / 2, tr.x + tr.w, tr.y + tr.h / 2, th.fg, 1, 0.3 * A);
        g.save();
        g.strokeStyle = th.accent;
        g.lineWidth = 1.5;
        g.globalAlpha = A;
        g.beginPath();
        const cyc = 7;
        for (let i = 0; i <= 200; i++) {
          const x = tr.x + (tr.w * i) / 200;
          const y = tr.y + tr.h / 2 - (tr.h / 2 - 2) * Math.cos(2 * Math.PI * (cyc * i / 200 - 0.35 * (ctx.reducedMotion ? 0 : now)));
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.restore();
        txt(g, L('aTrace'), tr.x, tr.y - 14, { color: th.fg, alpha: 0.85 * A });
        txt(g, L('time'), tr.x + tr.w, tr.y + tr.h + 12, { color: th.fg, align: 'right', alpha: 0.6 * A });
        const ty = tr.y + tr.h + 34;
        txt(g, 'ν = m_a c² / h', tr.x, ty, { color: th.fg, mono: true, alpha: 0.95 * A });
        txt(g, `1 µeV ↔ ${ctx.formatNumber(MHZ_PER_UEV)} MHz`, tr.x, ty + 18, { color: th.fg, mono: true, alpha: 0.85 * A });
        if (lv.magnet > 0.02) {
          wrap(g, L('magnetNote'), tr.x, ty + 42, tr.w, th.fg, 0.75 * lv.magnet);
        }
        if (lv.conversion > 0.02) {
          const k = lv.conversion;
          txt(g, `P ≈ 10⁻²³ W`, tr.x, ty + 46, { color: th.accent, mono: true, alpha: k });
          txt(g, `= ${ctx.formatNumber(Math.round(photonsPerS))} ${L('photonsPerS')}`, tr.x, ty + 64, { color: th.accent, mono: true, alpha: k });
          wrap(g, L('convNote'), tr.x, ty + 88, tr.w, th.fg, 0.75 * k);
        }
      }

      // tuning: resonance + waterfall
      if (lv.tuning > 0.02) {
        const A = lv.tuning;
        const rr = { x: P.x + 40, y: P.y + 22, w: P.w - 60, h: P.h * 0.22 };
        const fTicks = [0.5, 1, 1.5, 2].map((v) => ({ v, label: f1(v) }));
        const pl = plot(g, ctx, rr, { min: F0, max: F1, ticks: fTicks }, { min: 0, max: 1.15, ticks: [] });
        g.save();
        g.globalAlpha = A;
        pl.axes();
        const gam = nuRes / Q / 2;
        pl.curve((f) => 1 / (1 + ((f - nuRes) / gam) ** 2), { color: th.accent, width: 1.5, alpha: A }, 400);
        g.restore();
        txt(g, L('resp'), rr.x + 4, rr.y - 8, { color: th.fg, alpha: 0.8 * A });
        txt(g, `${f1(nuRes)} GHz ↔ ${f1(ueV(nuRes))} µeV`, rr.x + rr.w, rr.y - 8, { color: th.accent, align: 'right', mono: true, alpha: A });
        // mass scale under the frequency ticks
        fTicks.forEach((t, i) => txt(g, `${f1(ueV(t.v))} µeV`, pl.X(t.v), rr.y + rr.h + 30, { color: th.fg, align: i === 0 ? 'left' : i === 3 ? 'right' : 'center', mono: true, alpha: 0.55 * A }));
        txt(g, L('freq'), rr.x + rr.w, rr.y + rr.h + 48, { color: th.fg, align: 'right', alpha: 0.85 * A });
        // waterfall
        const wf = { x: rr.x, y: rr.y + rr.h + 64, w: rr.w, h: P.h - rr.h - 22 - 64 - (portrait ? 8 : 40) };
        const rowH = wf.h / NR;
        const row = Math.min(NR - 1, Math.floor(sc * NR));
        rowsShown = row;
        const binW = ((F1 - F0) / (NR - 1)) * 3.2; // GHz covered by a row
        for (let i = 0; i <= row; i++) {
          const nu = F0 + ((F1 - F0) * i) / (NR - 1);
          const x0 = pl.X(Math.max(F0, nu - binW / 2));
          const x1 = pl.X(Math.min(F1, nu + binW / 2));
          const bw = (x1 - x0) / NB;
          for (let j = 0; j < NB; j++) {
            g.save();
            g.globalAlpha = 0.9 * A;
            g.fillStyle = interpolateViridis(0.12 + 0.3 * noise[i][j]);
            g.fillRect(x0 + j * bw, wf.y + i * rowH, bw + 0.5, rowH - 0.5);
            g.restore();
          }
        }
        line(g, wf.x, wf.y, wf.x, wf.y + wf.h, th.fg, 1, 0.4 * A);
        txt(g, L('scanTime'), wf.x + 6, wf.y + wf.h + 12, { color: th.fg, alpha: 0.75 * A });
        txt(g, L('noSignal'), wf.x + wf.w, wf.y + wf.h + 12, { color: th.fg, align: 'right', alpha: 0.85 * A });
        txt(g, L('rowNote'), wf.x + wf.w, wf.y + 6, { color: th.fg, align: 'right', alpha: 0.6 * A });
        // guide from the current row to the resonance curve
        line(g, pl.X(nuRes), rr.y + rr.h, pl.X(nuRes), wf.y + row * rowH, th.accent, 1, 0.3 * A, [2, 3]);
        void smooth;
        void loopPhase;
      }
      void rowsShown;
    });
    c.animate = true;

    return {
      setState(st: string, o: SetStateOptions) {
        if (!(STATES as readonly string[]).includes(st)) return;
        state = st as St;
        t0 = now;
        if (o.immediate || ctx.reducedMotion) for (const k of STATES) lv[k] = k === state ? 1 : 0;
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

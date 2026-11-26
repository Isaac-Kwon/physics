/**
 * sc.camera-vs-particle — the same pixel, two ways of filling its charge bucket.
 *   camera:   photons arrive at random over a 10 ms exposure (Poisson, 1 e⁻ per photon, 6000 photons); Q(t) is a slow staircase.
 *             One drawn arrow stands for 20 photons.
 *   particle: one MIP crosses a 300 µm sensor; Q(t) is the charge induced on the pixel (Shockley–Ramo model of
 *             sc.signal-induction, same drift physics), reaching 2.4×10⁴ e⁻ within ~17 ns. Both plots use the same charge scale.
 * Quantities: arrows = photons, bucket level = Q / (2.4×10⁴ e⁻), plot = Q(t).
 */
import type { SceneModule } from '../shared/types';
import { clamp, mulberry32, smooth } from '../shared/canvas2d';
import { plot, type Rect } from '../shared/plot';
import { PH, arrow, createStage, line, sci, txt, type G } from './_sc1-common';
import { pulseModel } from './_sc1-induction';

const STATES = ['camera', 'particle'] as const;
type P = { part: number };
const TARGETS: Record<string, P> = { camera: { part: 0 }, particle: { part: 1 } };

const N_PHOTONS = 6000;
const T_EXPOSURE_MS = 10;
const PER_ARROW = 20;
const T_CAM = 5; // seconds of screen time for the whole exposure
const T_PART = 3; // seconds of screen time for 20 ns of drift

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const rnd = mulberry32(8123);
    const arrivals = Array.from({ length: N_PHOTONS }, () => rnd() * T_EXPOSURE_MS).sort((a, b) => a - b);
    const arrowX = Array.from({ length: N_PHOTONS / PER_ARROW }, () => rnd());
    const pulse = pulseModel();
    const QMAX = PH.Q_MIP;

    const qCamera = (tms: number) => {
      // number of photons arrived by tms (binary search)
      let lo = 0;
      let hi = N_PHOTONS;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (arrivals[m] <= tms) lo = m + 1;
        else hi = m;
      }
      return lo;
    };
    const qPart = (tns: number) => pulse.q[Math.min(pulse.n - 1, Math.max(0, Math.round(tns / pulse.dt)))];

    const draw = (g: G, s: { w: number; h: number; t: number }, _p: P, env: { state: string; ts: number; reduced: boolean }) => {
      const { w, h } = s;
      const tiny = h < 260;
      const wide = (w >= 560 && w > h * 1.0) || tiny;
      const cam = env.state === 'camera';
      // physical time within the state
      const tEnd = cam ? T_EXPOSURE_MS : 20;
      const run = cam ? T_CAM : T_PART;
      const delay = cam ? 0.3 : 0.9; // particle: the track crosses first
      const u = env.ts >= 1e3 ? 1 : clamp((env.ts - delay) / run);
      const tPhys = u * tEnd;
      const Q = cam ? qCamera(tPhys) : qPart(tPhys);
      const frac = Q / QMAX;

      // layout
      const pix = tiny ? Math.min(w * 0.14, h * 0.26) : Math.min(wide ? w * 0.26 : w * 0.34, (wide ? h : h * 0.4) * 0.34, 130);
      const pcx = tiny ? w * 0.15 : wide ? w * 0.19 : w * 0.5;
      const pcy = tiny ? h * 0.46 : wide ? h * 0.52 : h * 0.3;
      const px0 = pcx - pix / 2;
      const py0 = pcy - pix / 2;
      const plotR: Rect = tiny ? { x: w * 0.32 + 40, y: 40, w: w * 0.68 - 40 - 16, h: h - 40 - 44 } : wide ? { x: w * 0.4 + 44, y: 52, w: w * 0.6 - 44 - 28, h: h - 52 - 60 } : { x: 56, y: h * 0.52 + 20, w: w - 56 - 24, h: h * 0.48 - 20 - 54 };

      // headline
      txt(g, L(cam ? 'manyPhotons' : 'oneParticle'), wide ? 14 : w / 2, tiny ? 14 : 24, { align: wide ? 'left' : 'center', alpha: 0.95 });

      // pixel = charge bucket (fill level ∝ Q)
      g.fillStyle = accent;
      g.globalAlpha = 0.85;
      g.fillRect(px0 + 1, py0 + pix - frac * (pix - 2) - 1, pix - 2, frac * (pix - 2));
      g.globalAlpha = 1;
      g.strokeStyle = fg;
      g.globalAlpha = 0.7;
      g.lineWidth = 1.5;
      g.strokeRect(px0, py0, pix, pix);
      g.globalAlpha = 1;
      txt(g, L('pixel'), pcx, py0 + pix + 16, { align: 'center', alpha: 0.75 });

      if (cam) {
        // photon arrows: one per 20 photons, drawn on their way to the pixel
        const fall = 0.3;
        const tNow = env.ts >= 1e3 ? T_CAM : Math.max(0, env.ts - delay);
        const nA = arrowX.length;
        for (let k = 0; k < nA; k++) {
          const tArr = (arrivals[k * PER_ARROW + 10] / T_EXPOSURE_MS) * T_CAM;
          const a = (tNow - (tArr - fall)) / fall;
          if (a < 0 || a > 1) continue;
          const x = px0 + 6 + arrowX[k] * (pix - 12);
          const yEnd = py0 - 2;
          const yStart = py0 - (tiny ? 34 : 56);
          const y1 = yStart + (yEnd - yStart) * a;
          arrow(g, x, y1 - 16, x, y1, { color: fg, alpha: 0.6, width: 1, head: 4 });
        }
        if (!tiny) txt(g, L('arrowKey'), pcx, py0 - 72, { align: 'center', alpha: 0.6 });
      } else {
        // one track crossing the pixel (thin line, straight), drawn at the start
        const a = env.ts >= 1e3 ? 1 : clamp(env.ts / 0.8);
        const x0 = px0 - 20;
        const x1 = px0 + pix + 20;
        const y0 = py0 - 50;
        const y1 = py0 + pix + 50;
        line(g, x0, y0, x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, accent2, 0.9, 1.5);
        txt(g, L('track'), x0 - 6, y0 - 4, { align: 'right', color: accent2, alpha: 0.9 });
      }

      // clock
      const clock = cam ? `t = ${ctx.formatNumber(tPhys, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ms` : `t = ${ctx.formatNumber(tPhys, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ns`;
      txt(g, clock, pcx, py0 + pix + 38, { align: 'center', mono: true, alpha: 0.85 });
      txt(g, `Q = ${sci(Math.round(Q / 10) * 10, 2)} e⁻`, pcx, py0 + pix + 56, { align: 'center', mono: true, color: accent });

      // plot Q(t)
      const pl = plot(
        g,
        ctx,
        plotR,
        cam
          ? { min: 0, max: T_EXPOSURE_MS, label: L('timeMs'), ticks: [0, 5, 10].map((v) => ({ v, label: String(v) })) }
          : { min: 0, max: 20, label: L('timeNs'), ticks: [0, 5, 10, 15, 20].map((v) => ({ v, label: String(v) })) },
        { min: 0, max: QMAX * 1.12, label: L('charge'), ticks: [{ v: 0, label: '0' }, { v: QMAX, label: sci(QMAX, 2) }] },
      );
      pl.axes();
      pl.hline(QMAX, { color: fg, dash: [4, 4], alpha: 0.4 });
      if (!tiny) pl.text(tEnd * 0.025, QMAX * 1.06, L('mipLine'), { alpha: 0.65 });
      // Q(t) up to the current time
      g.save();
      g.beginPath();
      g.rect(plotR.x, plotR.y - 4, plotR.w, plotR.h + 8);
      g.clip();
      g.strokeStyle = accent;
      g.lineWidth = 1.75;
      g.beginPath();
      const steps = cam ? Math.max(2, Math.floor(plotR.w)) : 400;
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const tt = (i / steps) * tEnd;
        if (tt > tPhys + 1e-9) break;
        const q = cam ? qCamera(tt) : qPart(tt);
        const X = pl.X(tt);
        const Y = pl.Y(q);
        if (!started) {
          g.moveTo(X, Y);
          started = true;
        } else g.lineTo(X, Y);
      }
      g.stroke();
      g.restore();
      if (started) pl.dot(tPhys, Q, 3.2, accent);
      if (!tiny) {
        if (cam) pl.text(T_EXPOSURE_MS * 0.5, QMAX * 0.5, L('exposure'), { align: 'center', alpha: 0.7 });
        else pl.text(10.4, QMAX * 0.5, L('collect'), { alpha: 0.7 });
      }
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, anim: { camera: T_CAM + 0.5, particle: T_PART + 1.2 }, draw });
  },
};
export default mod;

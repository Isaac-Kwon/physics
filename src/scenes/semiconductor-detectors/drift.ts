/**
 * sc.drift — a MIP's pairs drift apart in a fully depleted 300 µm sensor biased at V = 150 V.
 * Model (same as sc.signal-induction / sc.camera-vs-particle):
 *   field E(z) = 2 V_fd/d (1 − z/d) + (V − V_fd)/d  (z from the n⁺ electrode; V_fd ≈ 68 V; trapezoid, 7.3 → 2.7 kV/cm),
 *   v = μE/(1 + μE/v_sat), μ_e = 1400, μ_h = 450 cm²/Vs, v_sat = 10⁷ cm/s,
 *   diffusion: lateral random walk with D = μ kT/q (36 cm²/s e⁻, 12 cm²/s h⁺; σ ≈ 8 µm after 10 ns).
 * Marks: one marker pair = 400 pairs (60 pairs drawn along the track); positions are the integrated trajectories.
 * Animation: 1 s of screen time = 5 ns of physical time.
 */
import type { SceneModule } from '../shared/types';
import { clamp, gaussian, lerp, mulberry32 } from '../shared/canvas2d';
import { FONT_MONO, PH, arrow, createStage, driftPath, electronDot, holeRing, junctionModel, line, txt, type G } from './_sc1-common';

const STATES = ['mip-crossing', 'drift', 'speed'] as const;
type P = { speed: number; drift: number };
const TARGETS: Record<string, P> = {
  'mip-crossing': { speed: 0, drift: 0 },
  drift: { speed: 0, drift: 1 },
  speed: { speed: 1, drift: 1 },
};
const RATE = 5; // ns per second of screen time
const M = 60;
const DT = 0.05;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const rnd = mulberry32(5150);
    const D = PH.D_UM;
    const jm = junctionModel(PH.VBIAS);
    const Emax = jm.E(0);
    const stepSig = (Dcm2s: number) => Math.sqrt(2 * Dcm2s * 1e8 * 1e-9 * DT); // µm per step; 1 cm²/s = 1e8 µm² / 1e9 ns
    const sigE = stepSig(PH.MU_E * PH.KT_Q);
    const sigH = stepSig(PH.MU_H * PH.KT_Q);
    const nSteps = 520;
    const pairs = Array.from({ length: M }, (_, k) => {
      const z0 = ((k + 0.5) / M) * D;
      const walk = (sig: number) => {
        const a = new Float32Array(nSteps);
        let x = 0;
        for (let i = 0; i < nSteps; i++) {
          x += gaussian(rnd) * sig;
          a[i] = x;
        }
        return a;
      };
      return { z0, e: driftPath(z0, 'e', PH.VBIAS, D, DT), h: driftPath(z0, 'h', PH.VBIAS, D, DT), we: walk(sigE), wh: walk(sigH) };
    });
    const tE = Math.max(...pairs.map((p) => p.e.arrival));
    const tH = Math.max(...pairs.map((p) => p.h.arrival));

    const draw = (g: G, s: { w: number; h: number }, p: P, env: { state: string; ts: number; reduced: boolean }) => {
      const { w, h } = s;
      const narrow = w < 560;
      const tiny = h < 260;
      const S = tiny ? (h - 56) / D : Math.min((h - 120) / D, narrow ? 1.25 : 1.6);
      const sh = D * S;
      const latUm = narrow ? 90 : 150;
      const sw = latUm * S;
      const cx = lerp(w * 0.5, narrow ? w * 0.27 : w * 0.24, p.speed);
      const sx0 = cx - sw / 2;
      const sy0 = (h - sh) / 2 + 4;

      // physical time
      const st = env.state;
      let tPhys = 0;
      if (st === 'drift') tPhys = env.ts >= 1e3 ? 4 : (env.ts * RATE) % (tH + 3);
      else if (st === 'speed') tPhys = env.ts >= 1e3 ? tH + 1 : Math.min(tH + 2.5, env.ts * RATE) % (tH + 4);
      const cross = st === 'mip-crossing' ? (env.ts >= 1e3 ? 1 : clamp(env.ts / 1.4)) : 1;
      const pad = 34 / S;
      const zP = lerp(-pad, D + pad, cross);

      // sensor, electrodes
      g.fillStyle = accent;
      g.globalAlpha = 0.08;
      g.fillRect(sx0, sy0, sw, sh);
      g.globalAlpha = 0.85;
      g.strokeStyle = accent;
      g.lineWidth = 1.25;
      g.strokeRect(sx0, sy0, sw, sh);
      g.globalAlpha = 1;
      line(g, sx0 - 2, sy0 - 2, sx0 + sw + 2, sy0 - 2, accent2, 0.95, 3);
      line(g, sx0 - 2, sy0 + sh + 2, sx0 + sw + 2, sy0 + sh + 2, accent2, 0.95, 3);
      const lab = (1 - p.speed) * (1 - p.drift);
      txt(g, L('plus'), sx0 + sw + 12, sy0 - 2, { alpha: 0.85 * lab, color: accent2 });
      txt(g, L('minus'), sx0 + sw + 12, sy0 + sh + 2, { alpha: 0.85 * lab, color: accent2 });
      // thickness
      txt(g, `${D} µm`, sx0 - 12, sy0 + sh + 14, { align: 'right', mono: true, alpha: 0.7 });

      // field arrows (length ∝ |E(z)|, pointing from + to −)
      const ax = sx0 - 26;
      for (let k = 0; k < 5; k++) {
        const z = 25 + k * 62.5;
        const len = 8 + (36 * jm.E(z)) / Emax;
        const y0 = sy0 + z * S - len / 2;
        arrow(g, ax, y0, ax, y0 + len, { color: fg, alpha: 0.55, width: 1.25, head: 5 });
      }
      txt(g, 'E', ax - 8, sy0 + sh / 2, { align: 'right', mono: true, alpha: 0.8 });

      // track
      const xc = cx;
      line(g, xc, sy0 - pad * S, xc, sy0 + sh + pad * S, accent2, 0.3, 1.5);
      line(g, xc, sy0 - pad * S, xc, sy0 + zP * S, accent2, 0.95, 1.5);
      if (cross < 1) electronDot(g, xc, sy0 + zP * S, accent2, 3.2);
      if (st === 'mip-crossing') txt(g, L('track'), xc + 12, Math.max(12, sy0 - pad * S + 8), { color: accent2, alpha: 0.95 });

      // pairs
      const zF = clamp(zP, 0, D);
      const stepI = Math.min(nSteps - 1, Math.floor(tPhys / DT));
      for (const pr of pairs) {
        if (pr.z0 > zF) continue;
        if (tPhys <= 0) {
          electronDot(g, xc - 3, sy0 + pr.z0 * S, accent, 2, 1);
          holeRing(g, xc + 3, sy0 + pr.z0 * S, accent2, 2.1, 1, 1);
          continue;
        }
        if (tPhys < pr.e.arrival) electronDot(g, xc + pr.we[stepI] * S, sy0 + pr.e.at(tPhys) * S, accent, 2, 0.95);
        if (tPhys < pr.h.arrival) holeRing(g, xc + pr.wh[stepI] * S, sy0 + pr.h.at(tPhys) * S, accent2, 2.1, 0.95, 1);
      }
      if (st === 'mip-crossing') txt(g, L('pairsLine'), xc + 12, sy0 + sh * 0.5, { alpha: 0.8 * clamp(cross * 2 - 0.4) });

      // drift annotations
      const dA = p.drift * (1 - p.speed);
      if (dA > 0.02) {
        const tx = sx0 + sw + 14;
        txt(g, L('electrons'), tx, sy0 + sh * 0.2, { color: accent, alpha: dA });
        txt(g, `μₑ = ${PH.MU_E} cm²/Vs`, tx, sy0 + sh * 0.2 + 15, { mono: true, alpha: 0.75 * dA });
        if (!tiny) arrow(g, tx + 4, sy0 + sh * 0.2 - 16, tx + 4, sy0 + sh * 0.2 - 40, { color: accent, alpha: dA, width: 1.25, head: 6 });
        txt(g, L('holes'), tx, sy0 + sh * 0.8, { color: accent2, alpha: dA });
        txt(g, `μₕ = ${PH.MU_H} cm²/Vs`, tx, sy0 + sh * 0.8 + 16, { mono: true, alpha: 0.75 * dA });
        if (!tiny) arrow(g, tx + 4, sy0 + sh * 0.8 + 32, tx + 4, sy0 + sh * 0.8 + 56, { color: accent2, alpha: dA, width: 1.25, head: 6 });
      }

      // clock
      if (p.drift > 0.02) txt(g, `t = ${ctx.formatNumber(tPhys, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ns`, tiny ? 14 : cx + 12, tiny ? 16 : sy0 + sh + 26, { align: 'left', mono: true, alpha: 0.9 * p.drift });

      // ---- arrival-time bars
      if (p.speed > 0.02) {
        const a = p.speed;
        const x0 = narrow ? w * 0.47 : w * 0.43;
        const x1 = w - 26;
        const tMax = 20;
        const X = (t: number) => x0 + ((x1 - x0) * t) / tMax;
        const yE = sy0 + sh * (tiny ? 0.3 : 0.3);
        const yH = sy0 + sh * (tiny ? 0.68 : 0.62);
        const ya = sy0 + sh * (tiny ? 0.95 : 0.86);
        // axis
        line(g, x0, ya, x1, ya, fg, 0.5 * a);
        for (let t = 0; t <= tMax; t += 5) {
          line(g, X(t), ya, X(t), ya + 4, fg, 0.5 * a);
          txt(g, tiny && t === 20 ? '20 ns' : String(t), X(t), ya + 14, { align: 'center', mono: true, alpha: 0.65 * a });
        }
        if (!tiny) txt(g, L('timeNs'), x1, ya + 30, { align: 'right', alpha: 0.8 * a });
        const row = (y: number, name: string, col: string, arr: number[], tLast: number, hollow: boolean) => {
          txt(g, name, x0, y - (tiny ? 28 : 30), { color: col, alpha: a });
          // arrival ticks of the 60 pairs (distribution)
          g.strokeStyle = col;
          g.lineWidth = 1;
          g.globalAlpha = 0.55 * a;
          for (const t of arr) {
            g.beginPath();
            g.moveTo(X(t), y - (tiny ? 16 : 20));
            g.lineTo(X(t), y - (tiny ? 8 : 10));
            g.stroke();
          }
          g.globalAlpha = 1;
          // progress bar
          const tt = Math.min(tPhys, tLast);
          g.fillStyle = col;
          g.globalAlpha = (hollow ? 0.55 : 0.85) * a;
          g.fillRect(x0, y - 5, X(tt) - x0, 10);
          g.globalAlpha = 0.4 * a;
          g.strokeStyle = fg;
          g.strokeRect(x0 + 0.5, y - 4.5, X(tLast) - x0, 9);
          g.globalAlpha = 1;
          if (tPhys >= tLast) {
            line(g, X(tLast), y - 22, X(tLast), y + 12, col, a, 1.25);
            txt(g, `${ctx.formatNumber(tLast, { maximumFractionDigits: 0 })} ns`, X(tLast) + 8, y, { mono: true, color: col, alpha: a });
          }
        };
        row(yE, L('electronsShort'), accent, pairs.map((q) => q.e.arrival), tE, false);
        row(yH, L('holesShort'), accent2, pairs.map((q) => q.h.arrival), tH, true);
        if (!tiny) txt(g, L('tickKey'), x0, sy0 - 8, { alpha: 0.65 * a });
      }
      g.font = FONT_MONO;
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, loop: ['drift'], anim: { 'mip-crossing': 1.6, speed: 6.5 }, draw });
  },
};
export default mod;

/**
 * hi.jet — back-to-back dijet in the overlap region; one jet crosses the medium and loses energy (path-length² model),
 * then a schematic R_AA(pT): hadrons far below 1, photons / Z bosons near 1.
 * Brightness along a track = remaining jet energy E(s). Track length grows with the jet energy.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, clamp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, createStage, drawLens, lensDensity, makeLayer, splitLayout, txt, type G } from './_s3-common';

const STATES = ['dijet', 'quenched', 'raa-plot'] as const;
const B = 0.9;
const K_LOSS = 0.6; // fractional energy loss = K_LOSS * L² (L in nuclear radii), capped
const SPEED = 1.5; // R per second, only sets the animation pace

type P = { vx: number; vy: number; th: number; q: number; plot: number; L: number };
const TARGETS: Record<string, P> = {
  dijet: { vx: 0.46, vy: 0.12, th: Math.PI / 2, q: 0, plot: 0, L: 0 },
  quenched: { vx: -0.45, vy: 0.02, th: 0.05, q: 1, plot: 0, L: 0 },
  'raa-plot': { vx: -0.45, vy: 0.02, th: 0.05, q: 1, plot: 1, L: 1 },
};

/** Path length inside the medium, marching from (x,y) along angle th. */
function pathInMedium(x: number, y: number, th: number) {
  let s = 0;
  while (s < 2 && lensDensity(B, x + Math.cos(th) * s, y + Math.sin(th) * s) > 0.004) s += 0.02;
  return s;
}

const raaHadron = (pT: number) => {
  const l = Math.log10(pT);
  return 0.17 + 0.38 * smooth(Math.log10(8), Math.log10(200), l) + 0.11 * (1 - smooth(Math.log10(5), Math.log10(8), l));
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const rnd = mulberry32(99);
    const TR = 9;
    const off = Array.from({ length: TR }, (_, i) => (i / (TR - 1) - 0.5) * 2 + (rnd() - 0.5) * 0.15);
    const len = Array.from({ length: TR }, () => 0.85 + 0.15 * rnd());
    const soft = Array.from({ length: 30 }, () => ({ s: rnd(), a: (rnd() - 0.5) * 2, r: 0.12 + 0.3 * rnd(), sg: rnd() < 0.5 ? 1 : -1 }));
    const layer = makeLayer();
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;

    const draw = (g: G, s: { w: number; h: number }, p: P, ts: number) => {
      const { w, h } = s;
      const lay = splitLayout(w, h, p.L);
      const R = lay.panel;
      const cx = R.x + R.w / 2;
      const cy = R.y + R.h / 2;
      const S = Math.max(20, Math.min(R.w, R.h) / (2 * 2.45));
      const X = (x: number) => cx + x * S;
      const Y = (y: number) => cy - y * S;
      g.save();
      g.beginPath();
      g.rect(R.x, R.y, R.w, R.h);
      g.clip();
      g.strokeStyle = fg;
      g.lineWidth = 1;
      g.globalAlpha = 0.28;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.arc(X((sx * B) / 2), Y(0), S, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
      drawLens(g, B, cx, cy, S, 0.9);

      const head = ts * SPEED;
      const small = R.w < 520;
      // Jets: A along +u, B along -u
      for (const dir of [1, -1] as const) {
        const th = p.th + (dir === 1 ? 0 : Math.PI);
        const ux = Math.cos(th);
        const uy = Math.sin(th);
        const nx = -uy;
        const ny = ux;
        const Lm = pathInMedium(p.vx, p.vy, th);
        // Only jet A (dir = +1) is the one that crosses the medium in the quenched state
        const q = dir === 1 ? p.q : 0;
        const loss = Math.min(0.88, K_LOSS * Lm * Lm) * q;
        const Eend = 1 - loss;
        const E = (d: number) => 1 - loss * Math.pow(clamp(d / Math.max(Lm, 0.05)), 2);
        const Dmax = 0.45 + 1.25 * Eend;
        for (let j = 0; j < TR; j++) {
          const D = Dmax * len[j];
          const spread = 0.13 + 0.3 * loss;
          const end = Math.min(D, head);
          const n = 28;
          let px = X(p.vx);
          let py = Y(p.vy);
          for (let i = 1; i <= n; i++) {
            const d = (i / n) * end;
            const lat = off[j] * spread * d;
            const wx = p.vx + ux * d + nx * lat;
            const wy = p.vy + uy * d + ny * lat;
            const e = E(d);
            g.globalAlpha = Math.max(0.04, e) * (j === (TR >> 1) ? 0.95 : 0.5) * (1 - 0.4 * (d / D));
            g.strokeStyle = accent;
            g.lineWidth = j === (TR >> 1) ? 1.6 : 1;
            g.beginPath();
            g.moveTo(px, py);
            px = X(wx);
            py = Y(wy);
            g.lineTo(px, py);
            g.stroke();
          }
          // hadron at the track end
          if (head >= D * 0.98) {
            g.globalAlpha = 0.9 * E(D);
            g.fillStyle = accent;
            g.beginPath();
            g.arc(px, py, 1.8, 0, Math.PI * 2);
            g.fill();
          }
        }
        // soft particles: energy deposited in the medium, wide angles
        if (q > 0.01) {
          for (const sp of soft) {
            const d = sp.s * Lm;
            if (head < d) continue;
            const grow = clamp((head - d) / 0.9);
            const ang = th + sp.sg * (0.35 + 1.2 * Math.abs(sp.a));
            const wx = p.vx + ux * d + Math.cos(ang) * sp.r * grow;
            const wy = p.vy + uy * d + Math.sin(ang) * sp.r * grow;
            g.globalAlpha = 0.75 * q * (0.3 + 0.7 * grow);
            g.fillStyle = accent2;
            g.beginPath();
            g.arc(X(wx), Y(wy), 1.5, 0, Math.PI * 2);
            g.fill();
          }
        }
        // leading-parton arrow marker beyond the cone
        if (head >= Dmax * 0.9) {
          const ax = p.vx + ux * (Dmax + 0.05);
          const ay = p.vy + uy * (Dmax + 0.05);
          arrow(g, X(p.vx + ux * Dmax * 0.9), Y(p.vy + uy * Dmax * 0.9), X(ax), Y(ay), { color: accent, alpha: 0.9 * Math.max(0.25, Eend), width: 1.5, head: 6 });
          if (!small) {
            const lx = X(p.vx + ux * (Dmax + 0.16));
            const ly = Y(p.vy + uy * (Dmax + 0.16));
            const lab = dir === 1 ? (p.q > 0.5 ? L('quenchedJet') : L('jet')) : p.q > 0.5 ? L('recoil') : L('jet');
            txt(g, lab, lx, ly, { align: ux > 0.3 ? 'left' : ux < -0.3 ? 'right' : 'center', base: uy > 0.3 ? 'bottom' : uy < -0.3 ? 'top' : 'middle', alpha: 0.85 });
          }
        }
      }
      g.globalAlpha = 1;
      // hard scattering vertex
      g.strokeStyle = fg;
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(X(p.vx), Y(p.vy), 3.5, 0, Math.PI * 2);
      g.stroke();
      if (!small) {
        txt(g, L('vertex'), X(p.vx) - 9, Y(p.vy) - 14, { align: 'right', alpha: 0.8 });
        if (p.q > 0.5) txt(g, L('medium'), X(0), Y(-1.18), { align: 'center', alpha: 0.7 * p.q });
      }
      g.restore();

      layer(g, w, h, p.plot, (g2) => {
        const xs = [5, 10, 20, 50, 100, 200].map((v) => ({ v, label: String(v) }));
        const pl = plot(g2, ctx, lay.plotR, { min: 5, max: 200, log: true, label: L('pT'), ticks: xs }, { min: 0, max: 1.3, label: 'R_AA', ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }] });
        pl.axes();
        pl.hline(1, { color: fg, dash: [4, 4], alpha: 0.55 });
        pl.curve(() => 1, { color: accent2, width: 1.75 });
        pl.text(5.6, 1.1, L('photons'), { color: accent2, alpha: 1 });
        pl.curve(raaHadron, { color: accent, width: 1.75 });
        pl.text(6, 0.4, L('hadrons'), { color: accent, alpha: 1 });
        pl.text(200, 1.1, L('noMedium'), { align: 'right', alpha: 0.65 });
      });
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, loop: [], anim: { dijet: 2.6, quenched: 2.6, 'raa-plot': 2.6 }, tau: 0.7, draw: (g, s, p, e) => draw(g, s, p, e.ts) });
  },
};
export default mod;

/**
 * det.cloud-chamber — side view of a diffusion cloud chamber, and why a track shows up only in one layer.
 * Physics (textbook, schematic numbers): the cold plate (z = 0) is at temperature T_c, the alcohol pool (z = 1) is warm. Temperature falls linearly with
 * depth, so the saturation pressure falls exponentially, p_sat(z) = exp(−a (1 − z)) with a = 3.5 (units of the pool's saturation pressure).
 * Vapour diffuses from the pool to the plate: p_v(z) rises linearly from p_sat(0) at the plate to 1 at the pool.
 * Supersaturation S = p_v / p_sat is largest low in the box. Ions seed droplets only where S exceeds the nucleation threshold (S > 3 here): that band
 * is the sensitive layer. Ions are made along the whole path, droplets form only inside the band.
 * Vapour dots: density ∝ p_v(z); they diffuse and drift to the plate (condense) and are replaced from the pool.
 * Box: 20 cm wide (scale bar 5 cm). Muons: directions follow dN/dΩ ∝ cos²θ (cos θ = u^(1/3)); alpha: ≈ 4 cm range in air.
 */
import type { SceneModule } from '../shared/types';
import { approach, clamp, mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { createStage, dot, hash01, line, makeLayer, rgba, txt, type Env, type G, type Rect } from './_d1-common';

const STATES = ['vapour', 'track', 'muons'] as const;
type P = { pl: number; vap: number };
const TARGETS: Record<string, P> = { vapour: { pl: 1, vap: 1 }, track: { pl: 0, vap: 0.3 }, muons: { pl: 0, vap: 0.3 } };

const A_T = 3.5;
const S_CRIT = 3;
const pSat = (z: number) => Math.exp(-A_T * (1 - z));
const pV = (z: number) => pSat(0) + (1 - pSat(0)) * z;
const sOf = (z: number) => pV(z) / pSat(z);
let zLo = 0;
let zHi = 1;
(() => {
  let lo = -1;
  let hi = -1;
  for (let i = 0; i <= 1000; i++) {
    const z = i / 1000;
    if (sOf(z) > S_CRIT) {
      if (lo < 0) lo = z;
      hi = z;
    }
  }
  zLo = lo;
  zHi = hi;
})();

const BOX_CM = 20;
const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const { accent, accent2, fg } = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const layPlot = makeLayer();
    const rnd = mulberry32(1911);
    const N = Math.round(280 * Math.max(0.5, ctx.quality));
    // vapour molecules: (x ∈ [0,1], z) with z drawn from the p_v profile by rejection
    const sampleZ = () => {
      for (;;) {
        const z = rnd();
        if (rnd() < pV(z)) return z;
      }
    };
    const mol = Array.from({ length: N }, () => ({ x: rnd(), z: sampleZ(), wx: 0, wz: 0 }));

    const layout = (w: number, h: number, pl: number) => {
      const wide = w >= 560 && w > h * 1.05;
      if (wide) {
        const bh = Math.min(h - 120, w * 0.4);
        const bw = Math.min(bh * 1.35, w * 0.5);
        const plW = Math.min(w * 0.26, 260);
        const gap = 70;
        const groupW = bw + gap + plW;
        const xBoth = (w - groupW) / 2;
        const xAlone = (w - bw) / 2;
        const bx = xAlone + (xBoth - xAlone) * pl;
        const by = (h - bh) / 2 - 8;
        return { wide, box: { x: bx, y: by, w: bw, h: bh } as Rect, pr: { x: bx + bw + gap, y: by, w: plW, h: bh } as Rect };
      }
      const bw = w - 48;
      const bh = Math.min(h * 0.46, bw * 0.75);
      const by = 26;
      return { wide, box: { x: 24, y: by, w: bw, h: bh } as Rect, pr: { x: 60, y: by + bh + 54, w: w - 60 - 40, h: Math.max(60, h - (by + bh + 54) - 50) } as Rect };
    };
    const zy = (b: Rect, z: number) => b.y + b.h * (1 - z);

    // one track: straight line from (x0,y0) at angle (from vertical) over length len (px); returns droplet/ion drawing at age (s)
    const drawTrack = (g: G, b: Rect, x0: number, y0: number, ang: number, len: number, age: number, o: { thick?: number; alpha?: number; seed?: number; ions?: boolean }) => {
      if (age < 0) return;
      const dx = Math.sin(ang);
      const dy = Math.cos(ang);
      const thick = o.thick ?? 1;
      const al = o.alpha ?? 1;
      const seed = o.seed ?? 1;
      const grow = clamp(age / 0.25); // the particle crosses at ≈ c: effectively instantaneous
      const step = 2.4 / thick;
      for (let s = 0, i = 0; s < len * grow; s += step, i++) {
        const x = x0 + dx * s;
        const y = y0 + dy * s;
        if (x < b.x + 2 || x > b.x + b.w - 2 || y < b.y + 2 || y > b.y + b.h - 2) continue;
        const z = 1 - (y - b.y) / b.h;
        const inBand = z >= zLo && z <= zHi;
        const jx = (hash01(seed * 977 + i) - 0.5) * 1.4;
        const jy = (hash01(seed * 977 + i + 5000) - 0.5) * 1.4;
        if ((o.ions ?? true) && age < 0.7 && i % 3 === 0) dot(g, x + jx, y + jy, 1.2, accent, 0.75 * al * (1 - smooth(0.35, 0.7, age)));
        if (inBand) {
          const a = clamp((age - 0.12) / 0.35); // nucleation
          const r = (0.5 + 1.3 * Math.sqrt(clamp((age - 0.12) / 1.0))) * thick;
          const fade = 1 - smooth(1.1, 2.3, age);
          const fall = 5 * Math.max(0, age - 0.5) ** 2;
          if (a > 0 && fade > 0.01) dot(g, x + jx, y + jy + fall, r, fg, 0.85 * a * fade * al);
        }
      }
    };

    const draw = (g: G, s: { w: number; h: number; dt: number }, p: P, env: Env) => {
      const { w, h } = s;
      const lay = layout(w, h, p.pl);
      const b = lay.box;
      const dt = s.dt;
      // box
      g.strokeStyle = rgba(fg, 0.5);
      g.lineWidth = 1;
      g.strokeRect(b.x, b.y, b.w, b.h);
      // sensitive layer
      const yTop = zy(b, zHi);
      const yBot = zy(b, zLo);
      g.fillStyle = rgba(accent, 0.1);
      g.fillRect(b.x, yTop, b.w, yBot - yTop);
      line(g, b.x, yTop, b.x + b.w, yTop, accent, 0.5, 1, [4, 4]);
      line(g, b.x, yBot, b.x + b.w, yBot, accent, 0.5, 1, [4, 4]);
      // cold plate and pool
      g.fillStyle = rgba(fg, 0.55);
      g.fillRect(b.x, b.y + b.h - 4, b.w, 4);
      g.fillStyle = rgba(fg, 0.18);
      g.fillRect(b.x, b.y, b.w, 5);
      txt(g, L('pool'), b.x + 8, b.y + 18, { alpha: 0.7 });
      txt(g, L('plate'), b.x + 8, b.y + b.h - 14, { alpha: 0.7 });
      txt(g, L('layer'), b.x + 8, (yTop + yBot) / 2, { color: accent, alpha: 0.95 * (0.35 + 0.65 * p.vap) });
      // vapour molecules
      if (dt > 0) {
        const k = Math.exp(-dt / 0.6);
        for (const m of mol) {
          m.wx = m.wx * k + (rnd() - 0.5) * 0.02 * Math.sqrt(dt * 60);
          m.wz = m.wz * k + (rnd() - 0.5) * 0.02 * Math.sqrt(dt * 60);
        }
      }
      if (p.vap > 0.01) for (const m of mol) dot(g, b.x + clamp(m.x + m.wx) * b.w, zy(b, clamp(m.z + m.wz, 0.01, 0.99)), 1.3, fg, 0.55 * p.vap);
      // scale bar
      const pxCm = b.w / BOX_CM;
      const sbY = b.y + b.h + 20;
      line(g, b.x, sbY, b.x + 5 * pxCm, sbY, fg, 0.75, 1);
      line(g, b.x, sbY - 3, b.x, sbY + 3, fg, 0.75, 1);
      line(g, b.x + 5 * pxCm, sbY - 3, b.x + 5 * pxCm, sbY + 3, fg, 0.75, 1);
      txt(g, '5 cm', b.x + 5 * pxCm + 8, sbY, { mono: true, alpha: 0.8 });

      // tracks
      const T = env.reduced ? 0.95 : env.t;
      if (env.state === 'track') {
        const period = 3.2;
        const age = env.reduced ? 0.9 : T % period;
        drawTrack(g, b, b.x + b.w * 0.42, b.y + 4, 0.38, b.h * 1.1, age, {});
        txt(g, L('ions'), b.x + b.w * 0.42 + 14, b.y + b.h * 0.08, { color: accent, alpha: 0.85 * (age < 0.9 ? 1 : 0.3) });
        txt(g, L('droplets'), b.x + b.w - 8, (yTop + yBot) / 2 + 36, { align: 'right', alpha: 0.8 });
      } else if (env.state === 'muons') {
        // one muon every 1.1 s (time-lapse), zenith angle from cos²; kept 2.3 s
        const k0 = Math.floor(T / 1.1);
        for (let k = k0; k >= Math.max(0, k0 - 2); k--) {
          const age = T - k * 1.1;
          const c3 = Math.cbrt(0.04 + 0.96 * hash01(k + 3));
          const th = Math.acos(c3) * (hash01(k + 17) < 0.5 ? -1 : 1);
          const x0 = b.x + b.w * (0.2 + 0.6 * hash01(k + 29)) - Math.tan(th) * b.h * 0.5;
          drawTrack(g, b, x0, b.y + 4, th, b.h / Math.max(0.3, Math.cos(th)), env.reduced ? 0.9 + k * 0.0 : age, { seed: k + 2, ions: false, alpha: 1 });
        }
        if (env.reduced) {
          drawTrack(g, b, b.x + b.w * 0.55, b.y + 4, -0.5, b.h * 1.2, 0.9, { seed: 40, ions: false });
          drawTrack(g, b, b.x + b.w * 0.75, b.y + 4, 0.15, b.h * 1.1, 0.7, { seed: 41, ions: false });
        }
        // alpha: from a source at the left wall, ≈ 4 cm range (× the same scale as the box), thick dense track
        const ageA = env.reduced ? 0.8 : (T + 1.5) % 4.4;
        const yA = (yTop + yBot) / 2 + 6;
        dot(g, b.x + 8, yA - 4, 2.6, fg, 0.9);
        drawTrack(g, b, b.x + 8, yA - 4, Math.PI / 2 - 0.08, 4 * pxCm, ageA, { thick: 2, seed: 77, ions: false });
        txt(g, L('alpha'), b.x + 14 + 4 * pxCm, yA + 20, { alpha: 0.85 });
        txt(g, L('muon'), b.x + b.w - 8, b.y + 18, { align: 'right', alpha: 0.85 });
        txt(g, L('timelapse'), b.x + b.w - 8, b.y + 36, { align: 'right', alpha: 0.6 });
      }

      // supersaturation plot: vapour pressure p_v and saturation pressure p_sat against height
      layPlot(g, w, h, p.pl, (g2) => {
        const pr = lay.pr;
        const pl = plot(g2, ctx, pr, { min: 0, max: 1, label: L('pressure'), ticks: [] }, { min: 0, max: 1, label: L('height'), ticks: [] });
        // axes: swap roles so that height is vertical
        pl.axes();
        const X = (v: number) => pr.x + v * pr.w;
        const Yz = (z: number) => pr.y + pr.h * (1 - z);
        // supersaturated region (p_v > p_sat) and the sensitive band
        g2.fillStyle = rgba(accent, 0.12);
        g2.beginPath();
        for (let i = 0; i <= 80; i++) {
          const z = i / 80;
          const x = X(pV(z));
          i ? g2.lineTo(x, Yz(z)) : g2.moveTo(x, Yz(z));
        }
        for (let i = 80; i >= 0; i--) {
          const z = i / 80;
          g2.lineTo(X(pSat(z)), Yz(z));
        }
        g2.closePath();
        g2.fill();
        g2.strokeStyle = accent;
        g2.lineWidth = 1.5;
        g2.beginPath();
        g2.moveTo(X(pV(0)), Yz(0));
        g2.lineTo(X(pV(1)), Yz(1));
        g2.stroke();
        g2.strokeStyle = fg;
        g2.globalAlpha = 0.9;
        g2.beginPath();
        for (let i = 0; i <= 80; i++) {
          const z = i / 80;
          i ? g2.lineTo(X(pSat(z)), Yz(z)) : g2.moveTo(X(pSat(z)), Yz(z));
        }
        g2.stroke();
        g2.globalAlpha = 1;
        line(g2, pr.x, Yz(zHi), pr.x + pr.w, Yz(zHi), accent, 0.5, 1, [4, 4]);
        line(g2, pr.x, Yz(zLo), pr.x + pr.w, Yz(zLo), accent, 0.5, 1, [4, 4]);
        txt(g2, L('vapourCurve'), X(pV(0.98)) - 6, Yz(0.98) + 14, { color: accent, align: 'right' });
        txt(g2, L('satCurve'), X(pSat(0.8)) + 8, Yz(0.8) + 2, { align: 'left' });
        txt(g2, 'S > ' + S_CRIT, pr.x + pr.w - 4, (Yz(zHi) + Yz(zLo)) / 2, { mono: true, align: 'right', color: accent });
      });
      void approach;
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, loop: ['vapour', 'track', 'muons'], draw: (g, s, p, e) => draw(g, s, p, e) });
  },
};
export default mod;

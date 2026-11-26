/**
 * dm.evidence — Canvas2D, steps. Five panels cross-fade (one weight per state):
 *   coma     ~34 cluster galaxies, arrows ∝ speed (Gaussian velocity components, σ = 1000 km/s). Each arrow is split at the escape
 *            speed the visible matter alone could hold (∝ √M); the part beyond it is bright. A mass cloud (≈ 6× the visible mass,
 *            the ratio Ω_m/Ω_b) fades in and raises that threshold by √6 until every arrow is "held".
 *   rotation tilted disc of stars, orbiting with v(r); tracers carry observed arrows (model total) and dashed expected arrows (disc only).
 *   lensing  thin point-lens geometry: a ray from the source bends by α = A/b at the lens plane; the two rays that reach the observer
 *            are solved from the lens equation; inset shows the resulting image arcs on the sky. Mass contours appear last.
 *   bullet   two galaxy groups with lensing-mass contours on them; hot gas (β-model X-ray brightness, inferno) left between them.
 *   cmb      sky patch synthesised from plane waves with power ∝ D(ℓ)/ℓ; right: schematic angular power spectrum with and without dark matter.
 * Everything is a schematic built from textbook formulas; no measured values.
 */
import type { SceneModule } from '../shared/types';
import { clamp, gaussian, lerp, mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, createStage, interpolateInferno, makeStars, omega, rgba, rgbOf, txt, type G } from './_dm1-common';
import { vDisc, vTotal } from './_dm1-rotation';

const STATES = ['coma', 'rotation', 'lensing', 'bullet', 'cmb'] as const;
type P = Record<(typeof STATES)[number], number>;
const TARGETS = Object.fromEntries(STATES.map((s) => [s, Object.fromEntries(STATES.map((t) => [t, t === s ? 1 : 0]))])) as Record<string, P>;
const ARROW_PX_PER_KMS = 0.025;

// schematic angular power spectrum D(ℓ): oscillation (−cos ψ + δ)² with baryon loading δ, Silk damping envelope
const rawD = (l: number, dm: boolean) => {
  const psi = Math.PI * (l / 300 + 0.27);
  const delta = dm ? 0.17 : 0.4;
  const env = Math.exp(-((l / (dm ? 1000 : 800)) ** 2)) * (dm ? 1 : 1 / (1 + (l / 650) ** 2));
  return (0.22 + (-Math.cos(psi) + delta) ** 2) * env;
};
const D_NORM = 1 / Math.max(...Array.from({ length: 240 }, (_, i) => Math.max(rawD(i * 5, true), rawD(i * 5, false))));
const Dl = (l: number, dm: boolean) => rawD(l, dm) * D_NORM;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const { accent, fg, bg } = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const reveal: Record<string, number> = {};
    // Reveal clock of a panel: follows the time since its state was entered while it is the active one, keeps its value while fading out.
    const rv = (key: string, w: number, ts: number) => {
      if (w < 0.004) reveal[key] = 0;
      else if (w > 0.5) reveal[key] = ts;
      return reveal[key] ?? 0;
    };

    // --- coma data
    const rndC = mulberry32(1933);
    const comaG = Array.from({ length: 34 }, () => {
      let vx = gaussian(rndC);
      let vy = gaussian(rndC);
      const m = Math.hypot(vx, vy);
      if (m > 2.6) {
        vx *= 2.6 / m;
        vy *= 2.6 / m;
      }
      let x = gaussian(rndC) * 0.45;
      let y = gaussian(rndC) * 0.45;
      const rr = Math.hypot(x, y);
      if (rr > 1.25) {
        x *= 1.25 / rr;
        y *= 1.25 / rr;
      }
      return { x, y, vx: vx * 1000, vy: vy * 1000 };
    });
    const M_RATIO = 6.4; // (Ω_b + Ω_c) / Ω_b
    const V_ESC_TOT = 3000;
    const V_ESC_VIS = V_ESC_TOT / Math.sqrt(M_RATIO);

    // --- rotation data
    const rotStars = makeStars(Math.round(900 * ctx.quality), 77);
    const ROT_TR = [2, 4, 6, 8, 10, 12, 14];
    const rotPhi = ROT_TR.map((_, i) => 0.4 + i * 2.39996);
    const TILT = Math.cos((60 * Math.PI) / 180);

    // --- lensing data
    const rndL = mulberry32(2203);
    const lensGal = Array.from({ length: 22 }, () => ({ x: gaussian(rndL) * 0.45, y: gaussian(rndL) * 0.4 }));

    // --- bullet data
    const rndB = mulberry32(1006);
    const bulA = Array.from({ length: 24 }, () => ({ x: gaussian(rndB), y: gaussian(rndB) * 0.8 }));
    const bulB = Array.from({ length: 16 }, () => ({ x: gaussian(rndB) * 0.8, y: gaussian(rndB) * 0.7 }));

    // --- cmb data: plane waves with random direction and phase, ℓ uniform in [60, 900]
    const rndM = mulberry32(2725);
    const modes = Array.from({ length: 90 }, () => {
      const l = 60 + rndM() * 640;
      const a = rndM() * Math.PI * 2;
      const k = l / 51; // cycles across the patch (patch ≈ 7° wide)
      return { kx: Math.cos(a) * k, ky: Math.sin(a) * k, ph: rndM() * Math.PI * 2, a0: Math.sqrt(Dl(l, false) / l), a1: Math.sqrt(Dl(l, true) / l) };
    });
    const NP = 96;
    const f0 = new Float32Array(NP * NP);
    const f1 = new Float32Array(NP * NP);
    for (let j = 0; j < NP; j++)
      for (let i = 0; i < NP; i++) {
        let s0 = 0;
        let s1 = 0;
        for (const m of modes) {
          const c = Math.cos(2 * Math.PI * (m.kx * (i / NP) + m.ky * (j / NP)) + m.ph);
          s0 += m.a0 * c;
          s1 += m.a1 * c;
        }
        f0[j * NP + i] = s0;
        f1[j * NP + i] = s1;
      }
    const sd = (f: Float32Array) => Math.sqrt(f.reduce((a, v) => a + v * v, 0) / f.length);
    const sd0 = sd(f0);
    const sd1 = sd(f1);
    let patch: HTMLCanvasElement | null = null;
    let patchB = -1;
    const paintPatch = (b: number) => {
      patch ??= Object.assign(document.createElement('canvas'), { width: NP, height: NP });
      if (Math.abs(b - patchB) < 0.004) return patch;
      patchB = b;
      const pg = patch.getContext('2d')!;
      const img = pg.createImageData(NP, NP);
      for (let k = 0; k < NP * NP; k++) {
        const z = lerp(f0[k] / sd0, f1[k] / sd1, b); // standardised, power in the colour range is the same; amplitude of peaks differs in shape only
        const col = interpolateInferno(clamp(0.5 + 0.2 * z, 0.08, 0.92));
        const [cr, cg, cb] = rgbOf(col);
        img.data[k * 4] = cr;
        img.data[k * 4 + 1] = cg;
        img.data[k * 4 + 2] = cb;
        img.data[k * 4 + 3] = 255;
      }
      pg.putImageData(img, 0, 0);
      return patch;
    };

    const massRings = (g: G, x: number, y: number, rx: number, ry: number, a: number, rings = [0.45, 0.8, 1.2]) => {
      if (a < 0.005) return;
      g.save();
      g.fillStyle = rgba(accent, 0.1 * a);
      g.beginPath();
      g.ellipse(x, y, rx * rings[2], ry * rings[2], 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = accent;
      g.lineWidth = 0.9;
      g.globalAlpha = 0.75 * a;
      for (const f of rings) {
        g.beginPath();
        g.ellipse(x, y, rx * f, ry * f, 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { coma: 5, lensing: 6, bullet: 5, cmb: 5 },
      loop: ['rotation'],
      draw(g, s, p, env) {
        const { w: W, h: H } = s;
        const narrow = W < 560;
        const short = H < 330;

        // ---------------------------------------------------------------- coma
        if (p.coma > 0.004) {
          const t = rv('coma', p.coma, env.ts);
          const mass = smooth(1.2, 3.4, t);
          g.save();
          g.globalAlpha = p.coma;
          const m = Math.min(W * 0.26, H * 0.3); // px per Mpc
          const cx = W / 2;
          const cy = H * 0.52;
          massRings(g, cx, cy, m, m, mass, [0.4, 0.8, 1.35]);
          const kv = (0.22 * m) / 1000;
          const vth = lerp(V_ESC_VIS, V_ESC_TOT, mass);
          for (const gl of comaG) {
            const x = cx + gl.x * m;
            const y = cy + gl.y * m;
            const v = Math.hypot(gl.vx, gl.vy);
            const ux = gl.vx / v;
            const uy = gl.vy / v;
            const cut = Math.min(v, vth);
            arrow(g, x, y, x + ux * cut * kv, y + uy * cut * kv, { color: fg, alpha: 0.55 * p.coma, width: 1, head: v > vth ? 0.1 : 5 });
            if (v > vth) arrow(g, x + ux * cut * kv, y + uy * cut * kv, x + ux * v * kv, y + uy * v * kv, { color: accent, alpha: p.coma, width: 1.5, head: 5.5 });
            g.fillStyle = fg;
            g.beginPath();
            g.arc(x, y, 2.4, 0, Math.PI * 2);
            g.fill();
          }
          // legends
          const lx = 20;
          txt(g, L('coma'), lx, 20, { alpha: 0.95 });
          txt(g, L('comaFast'), lx, 38, { alpha: 0.85 * (1 - mass), color: accent });
          txt(g, L('comaHeld'), lx, 38, { alpha: 0.85 * mass });
          const by = H - 22;
          arrow(g, lx, by - 24, lx + 1000 * kv, by - 24, { color: fg, alpha: 0.8, width: 1.25, head: 5 });
          txt(g, '1000 km/s', lx + 1000 * kv + 8, by - 24, { mono: true, alpha: 0.85 });
          g.strokeStyle = fg;
          g.globalAlpha = 0.7 * p.coma;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(lx, by);
          g.lineTo(lx + m, by);
          g.moveTo(lx, by - 4);
          g.lineTo(lx, by + 4);
          g.moveTo(lx + m, by - 4);
          g.lineTo(lx + m, by + 4);
          g.stroke();
          g.globalAlpha = p.coma;
          txt(g, '1 Mpc', lx + m + 8, by, { mono: true, alpha: 0.85 });
          if (mass > 0.2 && !narrow) txt(g, L('comaMass'), W - 20, 26, { align: 'right', color: accent, alpha: 0.95 * mass });
          g.restore();
        }

        // ---------------------------------------------------------------- rotation
        if (p.rotation > 0.004) {
          g.save();
          g.globalAlpha = p.rotation;
          const S = Math.min(W * 0.42, (short ? (H - 72) / 2 : H * 0.46) / TILT) / 15;
          const cx = W / 2;
          const cy = short ? H * 0.6 : H * 0.5;
          g.fillStyle = fg;
          for (const st of rotStars) {
            const ph = st.phi + omega(st.r) * env.t;
            g.globalAlpha = p.rotation * st.a * 0.8;
            g.fillRect(cx + st.r * Math.cos(ph) * S - 0.7, cy - st.r * Math.sin(ph) * TILT * S - 0.7, 1.5, 1.5);
          }
          g.globalAlpha = p.rotation;
          ROT_TR.forEach((r, i) => {
            const ph = rotPhi[i] + omega(r) * env.t;
            const x = cx + r * Math.cos(ph) * S;
            const y = cy - r * Math.sin(ph) * TILT * S;
            const tx = -Math.sin(ph);
            const ty = -Math.cos(ph) * TILT;
            const nx = -ty;
            const ny = tx;
            const nn = Math.hypot(nx, ny) || 1;
            const ox = (nx / nn) * 5;
            const oy = (ny / nn) * 5;
            const kv = ARROW_PX_PER_KMS * S;
            arrow(g, x + ox, y + oy, x + ox + tx * vDisc(r) * kv, y + oy + ty * vDisc(r) * kv, { color: fg, alpha: 0.75 * p.rotation, width: 1, head: 5, dash: [3, 3] });
            arrow(g, x, y, x + tx * vTotal(r) * kv, y + ty * vTotal(r) * kv, { color: accent, alpha: p.rotation, width: 1.5, head: 5.5 });
            g.fillStyle = accent;
            g.beginPath();
            g.arc(x, y, 2.4, 0, Math.PI * 2);
            g.fill();
          });
          const lx = 20;
          const ly = short ? 18 : H - 52;
          arrow(g, lx, ly, lx + 40, ly, { color: accent, width: 1.5, head: 5.5 });
          txt(g, L('observed'), lx + 50, ly, { alpha: 0.9 });
          arrow(g, lx, ly + 18, lx + 40, ly + 18, { color: fg, width: 1, head: 5, dash: [3, 3], alpha: 0.8 });
          txt(g, L('expected'), lx + 50, ly + 18, { alpha: 0.9 });
          if (!short) txt(g, L('rotation'), lx, 26, { alpha: 0.95 });
          g.restore();
        }

        // ---------------------------------------------------------------- lensing
        if (p.lensing > 0.004) {
          const t = rv('lensing', p.lensing, env.ts);
          const rays = smooth(0.2, 2.8, t);
          const mass = smooth(3.0, 4.6, t);
          g.save();
          g.globalAlpha = p.lensing;
          const xo = W * 0.07;
          const xl = W * 0.5;
          const xs = W * 0.93;
          const cy = H * (narrow ? 0.62 : 0.58);
          const Dlp = xl - xo;
          const Dsp = xs - xo;
          const bE = Math.min(H * 0.14, W * 0.11);
          const A = (bE * bE * Dsp) / (Dlp * (Dsp - Dlp));
          const k = (A * (Dsp - Dlp)) / Dlp;
          const ys = 0.5 * bE * (Dsp / Dlp); // source offset above the axis
          const disc = Math.sqrt(ys * ys + 4 * Dsp * k);
          const thP = (ys + disc) / (2 * Dsp);
          const thM = (ys - disc) / (2 * Dsp);
          const Y = (v: number) => cy - v;
          const src = { x: xs, y: ys };
          const path = (b: number): [number, number][] => {
            const s1 = (src.y - b) / (xs - xl); // slope on the source side of the lens (y up, x to the right)
            const s2 = s1 + A / b;
            return [
              [xs, Y(src.y)],
              [xl, Y(b)],
              [xo, Y(b + s2 * (xo - xl))],
            ];
          };
          const drawPath = (pts: [number, number][], prog: number, style: { color: string; width: number; alpha: number; dash?: number[] }) => {
            const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
            const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
            let d = prog * (l1 + l2);
            g.strokeStyle = style.color;
            g.lineWidth = style.width;
            g.globalAlpha = style.alpha * p.lensing;
            g.setLineDash(style.dash ?? []);
            g.beginPath();
            g.moveTo(pts[0][0], pts[0][1]);
            const seg = (a: [number, number], b: [number, number], len: number) => {
              const f = Math.min(1, d / len);
              g.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
              d -= len;
            };
            seg(pts[0], pts[1], l1);
            if (d > 0) seg(pts[1], pts[2], l2);
            g.stroke();
            g.setLineDash([]);
            g.globalAlpha = p.lensing;
          };
          // optical axis and undeflected line
          g.strokeStyle = fg;
          g.globalAlpha = 0.25 * p.lensing;
          g.lineWidth = 1;
          g.setLineDash([2, 5]);
          g.beginPath();
          g.moveTo(xo, cy);
          g.lineTo(xs, cy);
          g.stroke();
          g.setLineDash([]);
          g.globalAlpha = p.lensing;
          // lens plane
          g.strokeStyle = fg;
          g.globalAlpha = 0.2 * p.lensing;
          g.beginPath();
          g.moveTo(xl, cy - bE * 3);
          g.lineTo(xl, cy + bE * 3);
          g.stroke();
          g.globalAlpha = p.lensing;
          // ray family
          for (const f of [0.7, 1.6, 2.6]) for (const sg of [1, -1]) drawPath(path(sg * f * bE), rays, { color: fg, width: 1, alpha: 0.2 });
          // undeflected line from the source to the observer
          drawPath([[xs, Y(src.y)], [(xs + xo) / 2, Y(src.y * 0.5)], [xo, cy]], rays, { color: fg, width: 1, alpha: 0.5, dash: [4, 4] });
          // the two rays that reach the observer
          drawPath(path(thP * Dlp), rays, { color: accent, width: 1.75, alpha: 1 });
          drawPath(path(thM * Dlp), rays, { color: accent, width: 1.75, alpha: 1 });
          // cluster
          massRings(g, xl, cy, bE * 0.9, bE * 0.9, mass, [0.6, 1.0, 1.5]);
          g.fillStyle = fg;
          for (const gl of lensGal) {
            g.globalAlpha = 0.9 * p.lensing;
            g.beginPath();
            g.arc(xl + gl.x * bE * 0.8, cy + gl.y * bE * 0.8, 2, 0, Math.PI * 2);
            g.fill();
          }
          // source galaxy (ellipse, size encodes nothing but position) and observer
          g.globalAlpha = 0.9 * p.lensing;
          g.strokeStyle = fg;
          g.lineWidth = 1.25;
          g.beginPath();
          g.ellipse(xs, Y(src.y), 6, 3, -0.4, 0, Math.PI * 2);
          g.stroke();
          g.beginPath();
          g.arc(xo, cy, 3, 0, Math.PI * 2);
          g.fillStyle = fg;
          g.fill();
          g.globalAlpha = p.lensing;
          txt(g, L('observer'), xo, cy + 18, { align: 'left', alpha: 0.85 });
          txt(g, L('cluster'), xl, cy + bE * 1.7 + 16, { align: 'center', alpha: 0.85 });
          txt(g, L('source'), xs, Y(src.y) - 16, { align: 'right', alpha: 0.85 });
          txt(g, 'α ≈ 4GM / (c² b)', W - 20, narrow ? H - 18 : 26, { align: 'right', mono: true, alpha: 0.85 });
          // inset: what the observer sees
          const ri = Math.min(66, H * 0.16, W * 0.2, short ? 34 : 66);
          const ix = 20 + ri;
          const iy = 22 + ri + (narrow ? 0 : 0);
          g.save();
          g.beginPath();
          g.arc(ix, iy, ri, 0, Math.PI * 2);
          g.fillStyle = rgba(bg, 0.6);
          g.fill();
          g.strokeStyle = fg;
          g.globalAlpha = 0.35 * p.lensing;
          g.lineWidth = 1;
          g.stroke();
          g.clip();
          const fs = (ri * 0.62) / thP;
          massRings(g, ix, iy, thP * fs * 0.8, thP * fs * 0.8, mass, [0.5, 1.0, 1.7]);
          g.globalAlpha = p.lensing;
          // Einstein ring (dashed), true source, two arcs
          const thE = bE / Dlp;
          g.strokeStyle = fg;
          g.globalAlpha = 0.3 * p.lensing;
          g.setLineDash([2, 4]);
          g.beginPath();
          g.arc(ix, iy, thE * fs, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
          g.globalAlpha = p.lensing;
          g.fillStyle = fg;
          g.globalAlpha = 0.6 * p.lensing;
          g.beginPath();
          g.arc(ix, iy - (ys / Dsp) * fs, 1.8, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = p.lensing * smooth(1.8, 3.0, t);
          g.strokeStyle = accent;
          g.lineWidth = 3;
          g.lineCap = 'round';
          g.beginPath();
          g.arc(ix, iy, thP * fs, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
          g.stroke();
          g.lineWidth = 2.2;
          g.beginPath();
          g.arc(ix, iy, Math.abs(thM) * fs, Math.PI / 2 - 0.3, Math.PI / 2 + 0.3);
          g.stroke();
          g.restore();
          g.globalAlpha = p.lensing;
          txt(g, L('arcs'), ix + ri + 12, iy - 8, { alpha: 0.9 * smooth(1.8, 3.0, t), color: accent });
          if (!short) txt(g, L('seen'), ix + ri + 12, iy + 8, { alpha: 0.7 });
          if (mass > 0.3 && !short) txt(g, L('massMap'), xl, cy - bE * 1.7 - 12, { align: 'center', color: accent, alpha: 0.95 * mass });
          g.restore();
        }

        // ---------------------------------------------------------------- bullet
        if (p.bullet > 0.004) {
          const t = rv('bullet', p.bullet, env.ts);
          const mass = smooth(1.0, 3.0, t);
          g.save();
          g.globalAlpha = p.bullet;
          const U = Math.min(W * 0.1, H * 0.16); // length unit
          const cy = H * 0.5;
          const ax = W * 0.2;
          const bx = W * 0.8;
          // hot gas: β-model surface brightness (1 + (r/rc)²)^(-3β + 1/2), β = 2/3 -> (1 + x²)^(-1.5)
          const gas = (x: number, y: number, rc: number, a: number, rx: number) => {
            const gr = g.createRadialGradient(x, y, 0, x, y, rx);
            for (let i = 0; i <= 18; i++) {
              const q = i / 18;
              const I = (1 + (q * rx / rc) ** 2) ** -1.5 * (1 - smooth(0.8, 1, q));
              gr.addColorStop(q, rgba(interpolateInferno(0.12 + 0.8 * I), clamp(I * 1.3) * a));
            }
            g.fillStyle = gr;
            g.beginPath();
            g.arc(x, y, rx, 0, Math.PI * 2);
            g.fill();
          };
          gas(W * 0.455, cy, U * 0.55, 0.9 * p.bullet, U * 1.5);
          gas(W * 0.55, cy, U * 0.45, 0.95 * p.bullet, U * 1.35);
          // bow shock ahead of the right gas lump
          g.strokeStyle = interpolateInferno(0.8);
          g.lineWidth = 1.25;
          g.globalAlpha = 0.85 * p.bullet;
          g.beginPath();
          g.arc(W * 0.55 - U * 0.1, cy, U * 1.1, -0.9, 0.9);
          g.stroke();
          g.globalAlpha = p.bullet;
          // galaxies
          g.fillStyle = fg;
          for (const gl of bulA) {
            g.beginPath();
            g.arc(ax + gl.x * U * 0.65, cy + gl.y * U * 0.65, 2.1, 0, Math.PI * 2);
            g.fill();
          }
          for (const gl of bulB) {
            g.beginPath();
            g.arc(bx + gl.x * U * 0.55, cy + gl.y * U * 0.55, 2.1, 0, Math.PI * 2);
            g.fill();
          }
          massRings(g, ax, cy, U * 0.75, U * 0.75, mass, [0.8, 1.4, 2.0]);
          massRings(g, bx, cy, U * 0.6, U * 0.6, mass, [0.8, 1.4, 2.0]);
          // motion arrows (direction of each group after the collision)
          arrow(g, ax, cy + U * 2.45, ax - U * 1.4, cy + U * 2.45, { color: fg, width: 1.25, head: 5, alpha: 0.8 * p.bullet });
          arrow(g, bx, cy + U * 2.45, bx + U * 1.4, cy + U * 2.45, { color: fg, width: 1.25, head: 5, alpha: 0.8 * p.bullet });
          txt(g, L('moving'), ax - U * 1.4, cy + U * 2.45 + 16, { align: 'left', alpha: 0.8 });
          txt(g, L('moving'), bx + U * 1.4, cy + U * 2.45 + 16, { align: 'right', alpha: 0.8 });
          // labels
          txt(g, L('galaxies'), ax, cy - U * 2.0 - 34, { align: 'center', alpha: 0.85 });
          txt(g, L('galaxies'), bx, cy - U * 2.0 - 34, { align: 'center', alpha: 0.85 });
          txt(g, L('lensMass'), ax, cy - U * 2.0 - 16, { align: 'center', color: accent, alpha: 0.95 * mass });
          txt(g, L('lensMass'), bx, cy - U * 2.0 - 16, { align: 'center', color: accent, alpha: 0.95 * mass });
          txt(g, L('gas'), W * 0.5, cy + U * 1.65 + 14, { align: 'center', alpha: 0.9 });
          g.strokeStyle = fg;
          g.globalAlpha = 0.4 * p.bullet;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(W * 0.5, cy + U * 1.65);
          g.lineTo(W * 0.5, cy + U * 0.3);
          g.stroke();
          g.globalAlpha = 0.85 * p.bullet;
          if (!narrow) txt(g, L('shock'), W * 0.55 + U * 1.15, cy - U * 0.9, { align: 'left', alpha: 0.75 });
          g.restore();
        }

        // ---------------------------------------------------------------- cmb
        if (p.cmb > 0.004) {
          const t = rv('cmb', p.cmb, env.ts);
          const b = smooth(0.8, 3.2, t);
          g.save();
          g.globalAlpha = p.cmb;
          const stack = narrow && !short;
          const side = stack ? Math.min(W - 80, H * 0.34) : short ? Math.min(H - 56, W * 0.34) : Math.min(W * 0.36, H * 0.6);
          const px = stack ? (W - side) / 2 : short ? 14 : 36;
          const py = stack ? 44 : short ? 30 : (H - side) / 2 - 8;
          g.imageSmoothingEnabled = true;
          g.drawImage(paintPatch(b), px, py, side, side);
          txt(g, L('patch'), px, py - 16, { alpha: 0.9 });
          if (!short) txt(g, L('patchSub'), px, py + side + 16, { alpha: 0.75 });
          // spectrum
          const rr = stack
            ? { x: 40, y: py + side + 62, w: W - 40 - 24, h: Math.max(80, H - (py + side + 62) - 52) }
            : short
              ? { x: px + side + 40, y: 34, w: W - (px + side + 40) - 18, h: H - 34 - 44 }
              : { x: px + side + 76, y: (H - side) / 2 + 12, w: W - (px + side + 76) - 36, h: side - 40 };
          const pl = plot(
            g,
            ctx,
            rr,
            { min: 0, max: 1200, label: short ? L('angularShort') : L('angular'), ticks: [0, 400, 800, 1200].map((v) => ({ v, label: String(v) })) },
            { min: 0, max: 1.15, label: L('power'), ticks: [] },
          );
          pl.axes();
          pl.curve((l) => Dl(l, false), { color: fg, dash: [5, 4], width: 1.25, alpha: 0.8 }, 240);
          pl.curve((l) => Dl(l, true), { color: accent, width: 1.9 }, 240);
          [1, 2, 3].forEach((n) => {
            const l = 300 * (n - 0.27);
            pl.text(l, Dl(l, true) + 0.08, L(`peak${n}`), { align: 'center', alpha: 0.9, color: accent });
          });
          pl.text(short ? 1200 : 930, Dl(930, true) + (short ? 0.3 : 0.12), L(short ? 'withDmShort' : 'withDm'), { align: short ? 'right' : 'left', color: accent, alpha: 0.95 });
          pl.text(330, 0.97, L(short ? 'withoutDmShort' : 'withoutDm'), { align: 'left', alpha: 0.85 });
          g.restore();
        }
      },
    });
  },
};
export default mod;

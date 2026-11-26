/**
 * dm.hook — Canvas2D, scrub (topic hero). One timeline u = stateIndex + progress:
 *   galaxy-visible 0–1: a tilted spiral disc of stars (exponential disc, 2 arms), seen close up, with a scale bar.
 *   halo-reveal 1–2:    the view pulls back while a faint density map (iso-density contours) of the dark halo fades in.
 *   rotation-curve 2–3: the view moves in again; stars orbit with v(r) from the model; arrows ∝ v; inset plot v(r).
 * Marks: each star is one star at (r, φ); its angular speed is v(r)/r from _dm1-rotation.ts (30 Myr of galactic time per second).
 * The halo map is the projected pseudo-isothermal density Σ ∝ (1 + R²/r_c²)^(−1/2): low alpha plus contours, never a glow.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, lerp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, makeLayer, makeStars, omega, R_DISC, rgba, txt } from './_dm1-common';
import { vDisc, vTotal } from './_dm1-rotation';

const STATES = ['galaxy-visible', 'halo-reveal', 'rotation-curve'] as const;
const TILT = Math.cos((55 * Math.PI) / 180);
const R_HALO = 60; // kpc: extent of the drawn halo map (about 4 visible-disc radii)
const TRACERS = [1.5, 3, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5];
const ARROW_PX_PER_KMS = 0.025; // arrow length = v · 0.025 · (px per kpc)

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const stars = makeStars(Math.round(2400 * ctx.quality), 4461);
    const layer = makeLayer();
    const L = (k: string) => ctx.label(k);
    const { accent, fg } = ctx.theme;
    const tracerPhi = TRACERS.map((_, i) => 0.7 + i * 2.39996); // golden-angle spread
    let u = 0;
    let uD = 0;
    let idx = 0;
    let clock = 0; // scene seconds, advances only in rotation-curve

    const c = createCanvas2D(ctx, (g, s) => {
      uD = approach(uD, u, s.dt, 0.15);
      if (Math.abs(uD - u) < 0.002) uD = u;
      if (uD > 2.02 && !ctx.reducedMotion) clock += s.dt;
      c.animate = uD !== u || (u >= 2 && !ctx.reducedMotion);
      draw(g, s.w, s.h, uD);
    });

    function draw(g: CanvasRenderingContext2D, W: number, H: number, uu: number) {
      const narrow = W < 560;
      const half = uu < 1 ? 13 : uu < 2 ? lerp(13, R_HALO * 1.1, smooth(0, 1, uu - 1)) : lerp(R_HALO * 1.1, 28, smooth(0, 1, uu - 2));
      const cx = W / 2;
      const cy = H * (narrow ? (uu > 1.5 ? 0.6 : 0.5) : 0.5);
      const S = Math.min(W, narrow ? H * 0.8 : H) / 2 / half; // px per kpc
      const halo = smooth(0, 1, uu - 1);
      const arrowsA = smooth(2.1, 2.7, uu);
      const T = ctx.reducedMotion ? 0 : clock;
      const rot = (r: number) => omega(r) * T;

      // dark-halo density map: Σ(R) with iso-density contours
      if (halo > 0.003) {
        const rc = 12;
        const sig = (R: number) => (1 / Math.sqrt(1 + (R / rc) ** 2)) * (1 - smooth(0.75, 1, R / R_HALO));
        const rPx = R_HALO * S;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rPx);
        for (let i = 0; i <= 20; i++) gr.addColorStop(i / 20, rgba(accent, 0.34 * halo * sig((i / 20) * R_HALO)));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(cx, cy, rPx, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = accent;
        g.lineWidth = 0.8;
        for (const lv of [0.6, 0.4, 0.25, 0.12]) {
          let lo = 0;
          let hi = R_HALO;
          for (let k = 0; k < 24; k++) {
            const m = (lo + hi) / 2;
            sig(m) > lv ? (lo = m) : (hi = m);
          }
          g.globalAlpha = 0.5 * halo;
          g.beginPath();
          g.arc(cx, cy, lo * S, 0, Math.PI * 2);
          g.stroke();
        }
        g.globalAlpha = 1;
      }

      // stars on a tilted disc
      g.fillStyle = fg;
      const sz = clamp(S * 0.11, 1, 2.4);
      for (const st of stars) {
        const ph = st.phi + rot(st.r);
        const x = cx + st.r * Math.cos(ph) * S;
        const y = cy - st.r * Math.sin(ph) * TILT * S;
        g.globalAlpha = st.a * (uu < 1 ? 0.3 + 0.7 * smooth(0, 0.8, uu) : 1);
        g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;

      // tracers with velocity arrows (length ∝ v)
      if (arrowsA > 0.01) {
        TRACERS.forEach((r, i) => {
          const ph = tracerPhi[i] + rot(r);
          const x = cx + r * Math.cos(ph) * S;
          const y = cy - r * Math.sin(ph) * TILT * S;
          const len = vTotal(r) * ARROW_PX_PER_KMS * S * arrowsA;
          arrow(g, x, y, x - Math.sin(ph) * len, y - Math.cos(ph) * TILT * len, { color: accent, width: 1.25, head: 5.5, alpha: arrowsA });
          g.globalAlpha = arrowsA;
          g.fillStyle = accent;
          g.beginPath();
          g.arc(x, y, 2.2, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        });
        const la = smooth(2.4, 2.8, uu);
        const lx = 20;
        const ly = narrow ? H - 46 : H - 64;
        const al = 200 * ARROW_PX_PER_KMS * S;
        arrow(g, lx, ly, lx + al, ly, { color: accent, width: 1.25, head: 5.5, alpha: la });
        txt(g, '200 km/s', lx + al + 8, ly, { mono: true, alpha: 0.85 * la });
        txt(g, L('arrows'), lx, ly + 15, { alpha: 0.8 * la });
      }

      // scale bar 10 kpc
      {
        const bx = 20;
        const by = H - 20;
        const bl = 10 * S;
        g.strokeStyle = fg;
        g.globalAlpha = 0.7;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + bl, by);
        g.moveTo(bx, by - 4);
        g.lineTo(bx, by + 4);
        g.moveTo(bx + bl, by - 4);
        g.lineTo(bx + bl, by + 4);
        g.stroke();
        g.globalAlpha = 1;
        txt(g, '10 kpc', bx + bl + 8, by, { mono: true, alpha: 0.8 });
      }

      // halo label
      {
        const a = clamp((halo - 0.5) / 0.4) * (1 - smooth(2.0, 2.3, uu));
        if (a > 0.01) {
          const lx = narrow ? 20 : W - 24;
          txt(g, L('halo'), lx, 28, { align: narrow ? 'left' : 'right', alpha: 0.95 * a, color: accent });
          txt(g, L('haloSub'), lx, 46, { align: narrow ? 'left' : 'right', alpha: 0.75 * a });
        }
      }

      // inset: v(r), disc only (dashed) and with halo (solid)
      layer(g, W, H, arrowsA, (g2) => {
        const iw = narrow ? 190 : Math.min(300, W * 0.3);
        const ih = narrow ? 56 : Math.min(170, H * 0.3);
        const x0 = narrow ? W - iw - 8 + 40 : W - iw - 20 + 44;
        const rr = narrow ? { x: x0, y: 14, w: iw - 40 - 62, h: ih } : { x: x0, y: 40, w: iw - 44 - 92, h: ih };
        g2.fillStyle = rgba(ctx.theme.bg, 0.55);
        g2.fillRect(rr.x - 44, rr.y - (narrow ? 12 : 28), rr.w + 44 + (narrow ? 66 : 100), rr.h + (narrow ? 12 : 28) + 44);
        const pl = plot(
          g2,
          ctx,
          rr,
          { min: 0, max: 30, label: narrow ? '' : 'r (kpc)', ticks: [0, 10, 20, 30].map((v) => ({ v, label: String(v) })) },
          { min: 0, max: 300, label: narrow ? '' : 'v (km/s)', ticks: [0, 100, 200, 300].map((v) => ({ v, label: String(v) })) },
        );
        pl.axes();
        pl.curve((r) => vDisc(r), { color: fg, dash: [4, 3], width: 1.25, alpha: 0.9 });
        pl.curve((r) => vTotal(r), { color: accent, width: 1.75 });
        for (const r of TRACERS) pl.dot(r, vTotal(r), 2.2, accent);
        pl.text(30.8, vDisc(30), L('visibleOnly'), { alpha: 0.85 });
        pl.text(30.8, vTotal(30) + 14, L('withHalo'), { alpha: 0.95, color: accent });
      });
    }

    const set = (i: number, p: number, imm: boolean) => {
      idx = i;
      u = i + clamp(p);
      if (imm || ctx.reducedMotion) uD = u;
      else c.animate = true;
      c.invalidate();
    };
    return {
      setState(state: string, opts: SetStateOptions) {
        const i = Math.max(0, STATES.indexOf(state as (typeof STATES)[number]));
        set(i, opts.immediate || ctx.reducedMotion ? 1 : opts.direction > 0 ? 0 : 1, opts.immediate);
      },
      setProgress(p) {
        set(idx, p, false);
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

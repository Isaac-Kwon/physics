/**
 * hi.hook — Canvas2D, scrub. Side view, beam axis horizontal.
 * One continuous timeline u = stateIndex + progress:
 *   dark 0–1 (nuclei fade in) · approach 1–2 (constant speed ~c) · impact 2–3 (overlap, white flash)
 *   fireball 3–4 (ellipsoid expands, colour temperature falls) · tracks 4–5 (charged tracks leave radially).
 * Marks: the two edge-on "pancakes" are Lorentz-contracted nuclei (thickness exaggerated: 14 fm/γ ≈ 0.005 fm is invisible);
 * the fireball is additive emission coloured by temperature; each track is one charged particle, polar angle from a flat
 * rapidity plateau, brightness ~ momentum, length ~ β·t.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, gaussian, mulberry32, smooth } from '../shared/canvas2d';
import { hotColor, rgba } from './_s1-common';

const STATES = ['dark', 'approach', 'impact', 'fireball', 'tracks'] as const;

interface Track {
  dx: number;
  dy: number;
  beta: number;
  bright: number;
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const nTracks = Math.round(2200 * ctx.quality);
    const rnd = mulberry32(2760);
    const tracks: Track[] = [];
    for (let i = 0; i < nTracks; i++) {
      const eta = Math.max(-4.2, Math.min(4.2, gaussian(rnd) * 1.3)); // plateau-like rapidity density
      const pT = -0.5 * Math.log(1 - rnd() * 0.999) + 0.08; // GeV, exponential, <pT> ~ 0.5
      const p = pT * Math.cosh(eta);
      const m = rnd() < 0.82 ? 0.14 : rnd() < 0.6 ? 0.49 : 0.94; // mostly pions
      const beta = p / Math.sqrt(p * p + m * m);
      const theta = 2 * Math.atan(Math.exp(-eta)); // polar angle from the beam axis
      const phi = rnd() * Math.PI * 2;
      tracks.push({ dx: Math.cos(theta), dy: Math.sin(theta) * Math.cos(phi), beta, bright: clamp(Math.log10(1 + p * 3) / 1.6) });
    }
    let u = 0;
    let uD = 0;
    let idx = 0;
    const c = createCanvas2D(ctx, (g, s) => {
      uD = approach(uD, u, s.dt, 0.12);
      if (Math.abs(uD - u) < 0.002) uD = u;
      c.animate = uD !== u;
      draw(g, s.w, s.h, uD);
    });

    function draw(g: CanvasRenderingContext2D, W: number, H: number, uu: number) {
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(H * 0.3, W * 0.2); // nucleus half-height (radius)
      const t = 5; // half-thickness of a pancake, px (exaggerated)
      const D0 = W * 0.4;
      let d: number;
      let fade: number;
      if (uu < 1) {
        d = D0;
        fade = 0.06 + 0.54 * smooth(0, 1, uu);
      } else if (uu < 2) {
        d = D0 + (t - D0) * (uu - 1);
        fade = 0.6;
      } else if (uu < 3) {
        d = t * (1 - (uu - 2));
        fade = 0.6;
      } else {
        d = (D0 - t) * (uu - 3);
        fade = 0.6 * (1 - smooth(3, 3.9, uu));
      }
      for (const sgn of [-1, 1]) {
        if (fade < 0.01) break;
        g.save();
        g.globalAlpha = fade;
        g.fillStyle = ctx.theme.accent;
        g.beginPath();
        g.ellipse(cx + sgn * d, cy, t, R, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      g.save();
      g.globalCompositeOperation = 'lighter';
      if (uu > 2 && uu < 3.15) {
        const ov = clamp(uu - 2);
        const a = (1 - smooth(3, 3.15, uu)) * (0.25 + 0.7 * ov);
        const wd = Math.max(1.2, 2 * t * ov);
        g.fillStyle = rgba(hotColor(1), a);
        g.beginPath();
        g.ellipse(cx, cy, wd / 2, R, 0, 0, Math.PI * 2);
        g.fill();
      }
      // fireball: thin tall slab at first, expands into an ellipsoid and cools
      if (uu >= 2.95) {
        const f = clamp(uu - 3);
        const ry = R * (0.95 + 0.15 * clamp(uu - 3, 0, 2));
        const rx = Math.max(t, ry * 1.25 * Math.min(1, Math.sqrt(f) + 0.03));
        const T = 1 - 0.4 * smooth(0, 1, uu - 3) - 0.12 * clamp(uu - 4);
        const life = 1 - 0.55 * smooth(4, 5, uu);
        const a0 = clamp((uu - 2.95) / 0.1) * life;
        const hot = hotColor(T);
        const edge = hotColor(T - 0.18);
        g.save();
        g.translate(cx, cy);
        g.scale(rx / ry, 1);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry);
        gr.addColorStop(0, rgba(hot, 0.95 * a0));
        gr.addColorStop(0.65, rgba(hot, 0.7 * a0));
        gr.addColorStop(0.9, rgba(edge, 0.22 * a0));
        gr.addColorStop(1, rgba(edge, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(0, 0, ry, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      g.restore();
      if (uu > 4) {
        const f = clamp(uu - 4);
        const L = Math.min(W, H) * 0.6;
        g.save();
        g.lineWidth = 0.7;
        g.lineCap = 'round';
        const buckets = 4;
        for (let b = 0; b < buckets; b++) {
          g.beginPath();
          for (const tr of tracks) {
            if (Math.min(buckets - 1, Math.floor(tr.bright * buckets)) !== b) continue;
            const r = f * L * tr.beta;
            g.moveTo(cx, cy);
            g.lineTo(cx + tr.dx * r, cy + tr.dy * r);
          }
          g.strokeStyle = ctx.theme.fg;
          g.globalAlpha = (0.05 + 0.09 * b) * smooth(0, 0.15, f);
          g.stroke();
        }
        g.restore();
      }
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

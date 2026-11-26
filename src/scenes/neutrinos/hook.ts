/**
 * nu.hook — Canvas2D, scrub. One timeline u = stateIndex + progress; each state's progress plays that state's own move:
 *   dark 0–1   dashed neutrino paths fade in (parallel, as far from the source)
 *   sun 1–2    the Sun appears; the paths fan out from it (density ∝ 1/r in this 2D slice), the Earth is a dot 8 light-minutes away
 *   through-earth 2–3   the Earth grows to a disc in the middle; the paths cross it unchanged
 *   thumbnail 3–4       zoom (log scale, ×~10⁹) from 12,700 km down to a 1 cm square at the surface
 * Marks: a dashed line is a neutrino path. Line spacing is fixed on screen at every scale because the flux is uniform:
 * 60 lines cross the 1 cm square, so each line stands for 6×10¹⁰/60 = 10⁹ neutrinos per second (NU.SOLAR_FLUX_CM2_S).
 * Dash motion is the direction of travel only (speed not to scale). The Sun, the Earth dot and the Sun–Earth distance are not to scale.
 */
import { interpolateInferno } from 'd3-scale-chromatic';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, lerp, mulberry32, smooth } from '../shared/canvas2d';
import { NU } from '../../data/neutrinos';
import { arrow, line, sci, textWidth, txt, wrap, type G } from './_n1-common';

const STATES = ['dark', 'sun', 'through-earth', 'thumbnail'] as const;
const FLUX = NU.SOLAR_FLUX_CM2_S.value; // cm⁻² s⁻¹
const LINES = 60; // lines crossing the 1 cm square at the end
const R_EARTH = 6.371e6; // m
const LINE_ALPHA = 0.34;

const lenFmt = (m: number) => (m < 1 ? `${(m * 100).toPrecision(2)} cm` : m < 1e3 ? `${m.toPrecision(2)} m` : `${sci(m)} m`);
const tz = (n: number) => {
  n = Math.abs(n);
  if (n === 0) return 20;
  let k = 0;
  while (!(n & 1)) {
    n >>= 1;
    k++;
  }
  return k;
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const L = (k: string) => ctx.label(k);
    const { accent, fg, bg } = ctx.theme;
    const rnd = mulberry32(4451);
    const phase = Array.from({ length: 400 }, () => rnd() * 16);
    let u = 0;
    let uD = 0;
    let idx = 0;
    const c = createCanvas2D(ctx, (g, s) => {
      uD = approach(uD, u, s.dt, 0.12);
      if (Math.abs(uD - u) < 0.002) uD = u;
      c.animate = true; // dashes always travel while the figure is on screen
      draw(g, s.w, s.h, uD, s.t);
    });

    c.animate = !ctx.reducedMotion;

    const tag = (g: G, s: string, x: number, y: number, o: { align?: CanvasTextAlign; mono?: boolean; alpha?: number; color?: string } = {}) => {
      const a = o.alpha ?? 1;
      if (a < 0.02) return;
      const w = textWidth(g, s, o.mono) + 8;
      const al = o.align ?? 'center';
      const x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
      g.save();
      g.globalAlpha = 0.82 * a;
      g.fillStyle = bg;
      g.fillRect(x0, y - 9, w, 18);
      g.restore();
      txt(g, s, al === 'center' ? x : al === 'right' ? x - 4 : x + 4, y, { align: al, mono: o.mono, alpha: 0.92 * a, color: o.color });
    };

    function draw(g: G, W: number, H: number, uu: number, t: number) {
      const cx = W / 2;
      const cy = H / 2;
      const sq = 0.42 * Math.min(W, H); // screen size of the 1 cm square in the last frame
      const d = sq / LINES; // line spacing
      const RE0 = Math.min(H * 0.23, W * 0.3);
      const k0 = RE0 / R_EARTH; // px per metre at the Earth-sized view
      const Zmax = sq / 0.01 / k0;
      const xR = 0.9 * W;
      const xS0 = 0.1 * W;

      const lineA = LINE_ALPHA * smooth(0, 0.8, uu);
      const sunIn = uu < 2 ? smooth(0, 1, uu - 1) : 1 - smooth(2, 3, uu);
      const fan = uu < 2 ? smooth(0, 1, uu - 1) : 1 - smooth(2, 3, uu);
      const sMove = smooth(2, 3, uu);
      const xS = lerp(xS0, -0.15 * W, sMove);
      const rSun = 20;

      // Earth geometry
      let xE: number, RE: number, earthA: number;
      const pz = clamp(uu - 3);
      const Z = Zmax ** pz;
      const q = smooth(0, 1, pz);
      const xP = lerp(cx + RE0, cx, q); // surface point under the thumbnail
      if (uu < 2) {
        xE = xR;
        RE = 3;
        earthA = sunIn;
      } else if (uu < 3) {
        xE = lerp(xR, cx, sMove);
        RE = lerp(3, RE0, sMove);
        earthA = 1;
      } else {
        RE = RE0 * Z;
        xE = xP - RE;
        earthA = 1 - smooth(0.2, 0.5, pz);
      }
      if (earthA > 0.01) {
        g.save();
        g.globalAlpha = earthA;
        g.beginPath();
        g.arc(xE, cy, Math.min(RE, 2e6), 0, Math.PI * 2);
        if (RE > 4) {
          g.fillStyle = fg;
          g.globalAlpha = 0.1 * earthA;
          g.fill();
          g.globalAlpha = 0.45 * earthA;
          g.strokeStyle = fg;
          g.lineWidth = 1;
          g.stroke();
        } else {
          g.fillStyle = ctx.theme.accent2;
          g.globalAlpha = earthA;
          g.fill();
        }
        g.restore();
      }

      // Neutrino paths
      const M = Math.ceil(H / 2 / d) + 2;
      const drawLines = (clip: boolean, a: number, color: string) => {
        g.save();
        g.strokeStyle = color;
        g.lineWidth = 1;
        g.setLineDash([6, 10]);
        for (let i = -M; i <= M; i++) {
          const yi = cy + i * d;
          if (clip && Math.abs(yi - cy) > sq / 2) continue;
          const si = (yi - cy) / (xR - xS0);
          const x0 = lerp(0, xS, fan);
          const ph = phase[(i + 200 + 400) % 400];
          g.lineDashOffset = -(t * 46) - ph;
          g.globalAlpha = a;
          g.beginPath();
          const xa = Math.max(0, x0);
          g.moveTo(xa, yi - si * fan * (xR - xa));
          g.lineTo(W, yi + si * fan * (W - xR));
          g.stroke();
        }
        g.restore();
      };
      drawLines(false, lineA, fg);

      // Sun
      if (sunIn > 0.02) {
        g.save();
        g.globalAlpha = sunIn;
        g.fillStyle = interpolateInferno(0.82);
        g.beginPath();
        g.arc(xS, cy, rSun, 0, Math.PI * 2);
        g.fill();
        g.restore();
        tag(g, L('sun'), xS + rSun + 8, cy + rSun + 14, { align: 'left', alpha: sunIn * (1 - smooth(2, 2.4, uu)) });
      }
      // Sun–Earth distance (1.5×10¹¹ m, light takes 8.3 min)
      const dimA = smooth(1.3, 2, uu) * (1 - smooth(2, 2.4, uu));
      if (dimA > 0.02) {
        const yy = cy + Math.min(H * 0.24, 150);
        arrow(g, xS + 12, yy, xR - 12, yy, { color: fg, alpha: 0.6 * dimA, width: 1, head: 6 });
        arrow(g, xR - 12, yy, xS + 12, yy, { color: fg, alpha: 0.6 * dimA, width: 1, head: 6 });
        tag(g, `${sci(1.496e11, 2)} m`, (xS + xR) / 2 - 8, yy - 14, { mono: true, alpha: dimA });
        tag(g, L('lightMinutes'), (xS + xR) / 2 + 8, yy + 14, { alpha: dimA });
        tag(g, L('earthDot'), xR, cy + 16, { alpha: dimA, align: 'right' });
      }
      // Earth diameter
      const earthLab = smooth(2.5, 3, uu) * (1 - smooth(0, 0.12, uu - 3));
      if (earthLab > 0.02) {
        const yy = cy + RE + 20;
        arrow(g, xE - RE, yy, xE + RE, yy, { color: fg, alpha: 0.6 * earthLab, width: 1, head: 6 });
        arrow(g, xE + RE, yy, xE - RE, yy, { color: fg, alpha: 0.6 * earthLab, width: 1, head: 6 });
        tag(g, `${L('rock')}`, xE, yy + 16, { alpha: earthLab });
        tag(g, L('passUnchanged'), xE, cy - RE - 18, { alpha: earthLab });
      }

      // Thumbnail square (1 cm × 1 cm) and what crosses it
      if (uu > 3) {
        const px = Math.max(6, 0.01 * k0 * Z);
        g.save();
        g.strokeStyle = accent;
        g.lineWidth = 1.5;
        g.globalAlpha = smooth(0, 0.08, pz);
        g.strokeRect(xP - px / 2, cy - px / 2, px, px);
        g.restore();
        if (px > sq * 0.9) {
          g.save();
          g.beginPath();
          g.rect(xP - px / 2, cy - px / 2, px, px);
          g.clip();
          drawLines(true, 0.9 * smooth(0.5, 0.9, pz), accent);
          g.restore();
        }
        if (pz > 0.12 && px < sq * 0.9) tag(g, L('cm2'), xP + px / 2 + 10, cy - px / 2 - 10, { align: 'left', alpha: smooth(0.1, 0.2, pz) });
        const a = smooth(0.8, 1, pz);
        if (a > 0.02) {
          tag(g, L('cm2'), xP, cy - px / 2 - 16, { alpha: a });
          tag(g, `${sci(FLUX)} ${L('perSecond')}`, xP, cy + px / 2 + 18, { mono: false, alpha: a });
          if (!ctx.reducedMotion && t > 0.1) tag(g, `${sci(FLUX * t, 2)} ${L('since')}`, xP, cy + px / 2 + 40, { alpha: a, color: accent });
        }
        // zoom readout
        const view = W / (k0 * Z);
        tag(g, `${L('view')} ${lenFmt(view)}`, W - 12, 18, { align: 'right', mono: true, alpha: smooth(0, 0.05, pz) });
      }

      // Legend: what a line means
      {
        const maxW = Math.min(W - 24, 440);
        const lines = wrap(g, W < 560 ? L('legendShort') : L('legend'), maxW - 40);
        const h = lines.length * 15 + 8;
        g.save();
        g.globalAlpha = 0.82;
        g.fillStyle = bg;
        g.fillRect(8, H - h - 8, maxW, h);
        g.restore();
        line(g, 14, H - h + 2, 34, H - h + 2, { color: fg, alpha: 0.7, dash: [6, 4] });
        lines.forEach((l, i) => txt(g, l, i === 0 ? 40 : 14, H - h + 2 + i * 15, { base: 'middle', alpha: 0.8 }));
      }
    }

    const set = (i: number, p: number, imm: boolean) => {
      idx = i;
      u = i + clamp(p);
      if (imm || ctx.reducedMotion) uD = u;
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

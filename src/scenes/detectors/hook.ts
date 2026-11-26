/**
 * det.hook — topic hero, scrub. End view (transverse plane) of a collision in a solenoid field.
 *   dark 0–1: a faint vertex dot · burst 1–2: ~10² charged tracks grow from the vertex · detector 2–3: camera pulls out, the barrel layers appear.
 * Physics: each track is a circle of radius R = pT / (0.3 B) with B = 3.8 T (the rule of thumb from the measurement layer),
 * pT = 0.25 GeV/c + exponential (mean 0.9); all particles travel at ≈ c, so the drawn arc length is the same for every track at one instant.
 * Tracks with 2R < tracker radius (1.1 m) curl up and never leave the tracker. Colour = pT (viridis, stiffer = brighter);
 * curvature sign = charge sign. The radial bar at the calorimeter is the energy deposit, length ∝ pT.
 * Layer radii follow a CMS-like barrel (metres): tracker 1.1, ECAL 1.29–1.75, HCAL 1.8–2.9, magnet 3.0–3.5, muon 4.0–7.4. Schematic.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, mulberry32, smooth } from '../shared/canvas2d';
import { dot, line, rgba, txt, viridisLit, type G } from './_d1-common';

const STATES = ['dark', 'burst', 'detector'] as const;
const B_T = 3.8;
const R_TRK = 1.1;
const R_OUT = 7.4;

interface Trk {
  phi0: number;
  sig: number;
  R: number;
  sExit: number;
  pT: number;
  t: number;
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const rnd = mulberry32(4441);
    const n = Math.max(40, Math.round(110 * ctx.quality));
    const trks: Trk[] = [];
    for (let i = 0; i < n; i++) {
      const pT = 0.25 + -Math.log(1 - rnd() * 0.998) * 0.9;
      const R = pT / (0.3 * B_T);
      const sExit = 2 * R > R_TRK ? 2 * R * Math.asin(R_TRK / (2 * R)) : Infinity;
      trks.push({ phi0: rnd() * Math.PI * 2, sig: rnd() < 0.5 ? 1 : -1, R, sExit, pT, t: clamp(Math.log10(pT / 0.25) / Math.log10(30)) });
    }
    const { fg, accent } = ctx.theme;
    const L = (k: string) => ctx.label(k);

    const pos = (t: Trk, s: number): [number, number] => {
      // centre at the left (CCW) or right (CW) normal of the initial direction; rotate the vertex about it
      const cx = -t.sig * t.R * Math.sin(t.phi0);
      const cy = t.sig * t.R * Math.cos(t.phi0);
      const psi = (t.sig * s) / t.R;
      const vx = -cx;
      const vy = -cy;
      return [cx + vx * Math.cos(psi) - vy * Math.sin(psi), cy + vx * Math.sin(psi) + vy * Math.cos(psi)];
    };

    let u = 0;
    let uD = 0;
    let idx = 0;
    const c = createCanvas2D(ctx, (g, s) => {
      uD = approach(uD, u, s.dt, 0.12);
      if (Math.abs(uD - u) < 0.002) uD = u;
      c.animate = uD !== u;
      draw(g, s.w, s.h, uD);
    });

    function draw(g: G, W: number, H: number, uu: number) {
      const cx = W / 2;
      const cy = H / 2;
      const m = Math.min(W, H);
      const S0 = (m * 0.5) / 1.25;
      const S1 = (m * 0.44) / R_OUT;
      const S = uu <= 2 ? S0 : S0 * Math.pow(S1 / S0, smooth(2, 3, uu));
      const X = (x: number) => cx + x * S;
      const Y = (y: number) => cy - y * S;

      // detector layers (end view), fade in while the camera pulls out
      const la = smooth(2.1, 2.75, uu);
      if (la > 0.01) {
        g.save();
        g.globalAlpha = la;
        const ring = (r0: number, r1: number, cells: number, a: number) => {
          g.strokeStyle = fg;
          g.lineWidth = 1;
          g.globalAlpha = la * a;
          for (const r of [r0, r1]) {
            g.beginPath();
            g.arc(cx, cy, r * S, 0, Math.PI * 2);
            g.stroke();
          }
          g.globalAlpha = la * a * 0.5;
          g.beginPath();
          for (let k = 0; k < cells; k++) {
            const a0 = (k / cells) * Math.PI * 2;
            g.moveTo(cx + Math.cos(a0) * r0 * S, cy + Math.sin(a0) * r0 * S);
            g.lineTo(cx + Math.cos(a0) * r1 * S, cy + Math.sin(a0) * r1 * S);
          }
          g.stroke();
        };
        ring(0.04, R_TRK, 0, 0.6); // tracker
        ring(1.29, 1.75, 90, 0.55); // ECAL
        ring(1.8, 2.9, 40, 0.5); // HCAL
        // magnet coil: two heavier lines
        g.strokeStyle = accent;
        g.lineWidth = 1.5;
        g.globalAlpha = la * 0.7;
        for (const r of [3.0, 3.5]) {
          g.beginPath();
          g.arc(cx, cy, r * S, 0, Math.PI * 2);
          g.stroke();
        }
        ring(4.0, 4.5, 24, 0.45); // muon stations
        ring(5.2, 5.8, 32, 0.45);
        ring(6.8, R_OUT, 40, 0.45);
        g.restore();
      }

      // tracks
      const p = clamp(uu - 1);
      if (uu > 1) {
        const head = p * 1.45; // arc length reached by every particle (all at ≈ c)
        for (const t of trks) {
          const s = Math.min(head, t.sExit === Infinity ? 1.6 : t.sExit);
          const pts: [number, number][] = [];
          const steps = Math.max(2, Math.ceil(s / 0.02));
          for (let i = 0; i <= steps; i++) pts.push(pos(t, (s * i) / steps));
          g.strokeStyle = viridisLit(t.t);
          g.globalAlpha = 0.5 + 0.45 * t.t;
          g.lineWidth = 1;
          g.beginPath();
          pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
          g.stroke();
          // energy deposit in the calorimeter for tracks that reached it
          if (t.sExit !== Infinity && head > t.sExit + 0.08 && uu > 2.15) {
            const [ex, ey] = pos(t, t.sExit);
            const ang = t.phi0 + (t.sig * t.sExit) / t.R;
            const r0 = 1.29;
            const len = 0.1 + 0.34 * t.t;
            const gap = Math.max(0, r0 - R_TRK);
            const x0 = ex + Math.cos(ang) * gap;
            const y0 = ey + Math.sin(ang) * gap;
            g.strokeStyle = viridisLit(t.t);
            g.globalAlpha = la * 0.9;
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(X(x0), Y(y0));
            g.lineTo(X(x0 + Math.cos(ang) * len), Y(y0 + Math.sin(ang) * len));
            g.stroke();
          }
        }
        g.globalAlpha = 1;
      }

      // vertex
      const va = uu < 1 ? 0.22 + 0.5 * smooth(0, 1, uu) : 0.9;
      dot(g, cx, cy, uu < 1 ? 2.2 : 2, rgba(fg, 1), va);

      // scale bar (10 m) once the whole detector is in view
      const sa = smooth(2.5, 2.95, uu);
      if (sa > 0.01) {
        const bw = 10 * S;
        const bx = 16;
        const by = H - 22;
        line(g, bx, by, bx + bw, by, fg, 0.8 * sa, 1);
        line(g, bx, by - 4, bx, by + 4, fg, 0.8 * sa, 1);
        line(g, bx + bw, by - 4, bx + bw, by + 4, fg, 0.8 * sa, 1);
        txt(g, '10 m', bx + bw / 2, by - 11, { mono: true, align: 'center', alpha: 0.85 * sa });
        txt(g, L('notToScale'), bx + bw / 2, by + 11, { align: 'center', alpha: 0.6 * sa });
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

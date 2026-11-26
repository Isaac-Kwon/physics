/**
 * sc.walkthrough-hybrid — cross-section of a hybrid pixel module (ATLAS-like), drawn to scale in µm:
 *   sensor 150 µm (fully depleted) · bump bonds Ø20 µm · readout chip 150 µm · pixel pitch 50 µm.
 * Keyframes (kf) move the camera: 0 module · 1 sensor · 2 bump · 3 amplifier · 4 map (cross-section fades) · 5 exploded view.
 * Pulse: MIP charge in 150 µm ≈ 80 µm⁻¹ × 150 µm = 1.2×10⁴ e (SC.PAIRS_PER_UM_MPV); threshold ~2×10³ e (schematic).
 */
import type { SceneModule } from '../shared/types';
import { clamp, lerp, mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { box, createStage, dimH, dimV, dot, dualLayout, interpolateInferno, line, plate, txt, arrow, makeLayer, type G } from './_sc2-common';

const STATES = ['goal', 'drift', 'bump', 'amplify', 'readout', 'trick'] as const;
type P = { kf: number; ex: number; grid: number; wave: number; map: number; lg: number; ld: number; lb: number; la: number; lt: number };
const mk = (kf: number, ex: number, o: Partial<P>): P => ({ kf, ex, grid: 0, wave: 0, map: 0, lg: 0, ld: 0, lb: 0, la: 0, lt: 0, ...o });
const TARGETS: Record<string, P> = {
  goal: mk(0, 0, { grid: 1, lg: 1 }),
  drift: mk(1, 0, { ld: 1 }),
  bump: mk(2, 0, { lb: 1 }),
  amplify: mk(3, 0, { wave: 1, la: 1 }),
  readout: mk(3, 0, { map: 1 }),
  trick: mk(4, 70, { lt: 1 }),
};

const T_S = 150; // sensor thickness (µm)
const BUMP_D = 20;
const T_C = 150; // chip thickness (µm)
const PITCH = 50;
const Y_BUMP = T_S + BUMP_D / 2; // bump centre
const Y_CHIP = T_S + BUMP_D; // chip top surface
const XMIN = -325; // module drawn from pixel −6 to +5 (12 pixels)
const XMAX = 275;
const TX = 8; // track position (µm), inside pixel 0
const A_PEAK = (SC.PAIRS_PER_UM_MPV.value as number) * T_S; // electrons
const THR = 2000; // electrons (schematic)

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const F = (v: number, o?: Intl.NumberFormatOptions) => ctx.formatNumber(v, o);
    const { accent, accent2, fg, bg } = ctx.theme;
    const rnd = mulberry32(5);
    const pairs = Array.from({ length: 36 }, (_, i) => ({ y: ((i + rnd()) / 36) * T_S, dx: (rnd() - 0.5) * 3 }));
    const layMap = makeLayer();
    const layCross = makeLayer();
    const layGrid = makeLayer();
    const layWave = makeLayer();

    // pulse: smooth rise over tr, exponential tail
    const TR = 0.35;
    const pulse = (t: number) => (t <= 0 ? 0 : smooth(0, TR, t) * Math.exp(-Math.max(0, t - TR) / 0.55));
    const tCross = (() => {
      let t = 0;
      while (pulse(t) * A_PEAK < THR && t < 2) t += 0.001;
      return t;
    })();
    const tOff = (() => {
      let t = TR;
      while (pulse(t) * A_PEAK > THR && t < 3) t += 0.001;
      return t;
    })();

    const keyframes = (main: { w: number; h: number }) => {
      const sGoal = (main.w - 110) / (XMAX - XMIN);
      const sDrift = (main.h - 60) / 200;
      const sZoom = Math.min(3.6, (main.h - 50) / 100);
      return [
        { S: sGoal, fy: (T_S + BUMP_D + T_C) / 2, fx: (XMIN + XMAX) / 2 },
        { S: sDrift, fy: 92, fx: 0 },
        { S: sZoom, fy: Y_BUMP + 14, fx: 0 },
        { S: sZoom, fy: Y_CHIP + 6, fx: 0 },
        { S: (main.h - 100) / (T_S + BUMP_D + T_C + 70), fy: (T_S + BUMP_D + T_C) / 2, fx: (XMIN + XMAX) / 2 },
      ];
    };

    const drawCross = (g: G, main: { x: number; y: number; w: number; h: number }, p: P, t: number, env: { reduced: boolean; state: string }, alpha: number) => {
      const kfs = keyframes(main);
      const i = Math.min(kfs.length - 2, Math.floor(p.kf));
      const f = clamp(p.kf - i);
      const S = Math.exp(lerp(Math.log(kfs[i].S), Math.log(kfs[i + 1].S), f));
      const fy = lerp(kfs[i].fy, kfs[i + 1].fy, f);
      const fx = lerp(kfs[i].fx, kfs[i + 1].fx, f);
      const cx0 = main.x + main.w / 2;
      const cy0 = main.y + main.h / 2;
      const X = (u: number) => cx0 + (u - fx) * S;
      const Y = (u: number) => cy0 + (u - fy) * S;
      const ex = p.ex;
      const ys = -ex / 2; // sensor shift
      const yc = ex / 2; // chip + bump shift
      const circ = smooth(1.2, 2.6, S);
      g.save();
      g.globalAlpha = alpha;
      g.beginPath();
      g.rect(main.x, main.y, main.w, main.h);
      g.clip();
      const xl = X(XMIN);
      const xr = X(XMAX);
      const wm = xr - xl;

      // sensor
      box(g, xl, Y(ys), wm, T_S * S, { fill: accent, fa: 0.1, stroke: fg, alpha: 0.4 });
      box(g, xl, Y(ys) - 1, wm, Math.max(2, 2.5 * S), { fill: accent2, alpha: 0.8 }); // back plane (HV)
      // chip
      box(g, xl, Y(Y_CHIP + yc), wm, T_C * S, { fill: fg, fa: 0.08, stroke: fg, alpha: 0.4 });
      for (let k = -6; k <= 5; k++) {
        const x = X(k * PITCH);
        // implant + pad on the sensor, pixel boundary
        box(g, x - 15 * S, Y(T_S + ys) - Math.max(3, 4 * S), 30 * S, Math.max(3, 4 * S), { fill: accent, alpha: 0.9 });
        line(g, X(k * PITCH + PITCH / 2), Y(ys + T_S * 0.55), X(k * PITCH + PITCH / 2), Y(T_S + ys), fg, { alpha: 0.28, dash: [2, 3] });
        line(g, X(k * PITCH + PITCH / 2), Y(Y_CHIP + yc), X(k * PITCH + PITCH / 2), Y(Y_CHIP + yc + 28), fg, { alpha: 0.28, dash: [2, 3] });
        // bump (moves with the chip)
        const by = Y(Y_BUMP + yc);
        g.save();
        g.fillStyle = accent2;
        g.globalAlpha = 0.95;
        g.beginPath();
        g.arc(x, by, (BUMP_D / 2) * S, 0, Math.PI * 2);
        g.fill();
        g.restore();
        // chip circuits (amplifier, discriminator, memory) per pixel
        if (circ > 0.02) {
          const y0 = Y_CHIP + yc + 5;
          g.save();
          g.globalAlpha = circ * 0.9;
          g.strokeStyle = accent2;
          g.lineWidth = 1.25;
          g.beginPath();
          g.moveTo(X(k * PITCH - 18), Y(y0));
          g.lineTo(X(k * PITCH - 18), Y(y0 + 14));
          g.lineTo(X(k * PITCH - 5), Y(y0 + 7));
          g.closePath();
          g.stroke();
          g.strokeRect(X(k * PITCH + 1), Y(y0), 12 * S, 14 * S);
          for (let m = 0; m < 3; m++) g.strokeRect(X(k * PITCH + 17), Y(y0 + m * 5), 6 * S, 4 * S);
          g.beginPath();
          g.moveTo(X(k * PITCH - 5), Y(y0 + 7));
          g.lineTo(X(k * PITCH + 1), Y(y0 + 7));
          g.moveTo(X(k * PITCH + 13), Y(y0 + 7));
          g.lineTo(X(k * PITCH + 17), Y(y0 + 7));
          g.moveTo(x, by + (BUMP_D / 2) * S);
          g.lineTo(x, Y(y0 + 7));
          g.lineTo(X(k * PITCH - 18), Y(y0 + 7));
          g.stroke();
          g.restore();
        }
      }

      // the particle track
      const trackA = 0.55;
      g.save();
      g.strokeStyle = fg;
      g.globalAlpha = trackA;
      g.setLineDash([5, 4]);
      g.lineWidth = 1.25;
      g.beginPath();
      g.moveTo(X(TX), Y(ys) - 32);
      g.lineTo(X(TX), Y(T_S + ys) + 6);
      g.stroke();
      g.restore();
      arrow(g, X(TX), Y(ys) - 34, X(TX), Y(ys) - 8, { color: fg, alpha: 0.8, head: 6 });

      // pairs
      if (p.kf < 3.5) {
        const T = 3.4;
        const tau = env.reduced ? 1.0 : (t % T);
        const live = env.state === 'drift' || env.state === 'goal' ? 1 : 0;
        const vE = T_S / 2.0;
        const vH = T_S / 3.2;
        for (const q of pairs) {
          const ye = Math.min(T_S, q.y + vE * (env.state === 'goal' ? 0 : tau));
          const yh = Math.max(0, q.y - vH * (env.state === 'goal' ? 0 : tau));
          const collectedE = ye >= T_S;
          if (env.state === 'drift' || env.state === 'goal') {
            if (!collectedE) dot(g, X(TX + q.dx), Y(ye + ys), Math.max(1.4, 0.9 * S), accent, live);
            if (yh > 0.5) dot(g, X(TX + q.dx), Y(yh + ys), Math.max(1.6, 1 * S), fg, 0.8 * live, true);
          }
        }
      }
      if (p.kf > 1.5 && p.kf < 3.9) {
        // collected electrons at the pixel electrode
        for (let k = 0; k < 7; k++) dot(g, X(TX - 9 + k * 3), Y(T_S - 4 - (k % 2) * 3), Math.max(1.5, 0.8 * S), accent, 0.9);
      }
      g.restore();

      // labels (outside the clip)
      const lab = (s: string, u: number, v: number, o: { align?: CanvasTextAlign; a?: number; color?: string } = {}) =>
        plate(g, bg, s, X(u), Y(v), { align: o.align ?? 'left', alpha: (o.a ?? 1) * alpha, color: o.color });
      if (p.lg > 0.01) {
        const rx = xr + 10;
        const tx = (s: string, v: number, c?: string) => txt(g, s, rx, Y(v), { alpha: p.lg * alpha, color: c });
        tx(L('sensor'), T_S / 2, accent);
        tx(L('bumps'), Y_BUMP, accent2);
        tx(L('chip'), Y_CHIP + T_C / 2);
        txt(g, `${F(T_S)} µm`, rx, Y(T_S / 2) + 16, { mono: true, alpha: p.lg * alpha * 0.7 });
        txt(g, `${F(T_C)} µm`, rx, Y(Y_CHIP + T_C / 2) + 16, { mono: true, alpha: p.lg * alpha * 0.7 });
        txt(g, L('particle'), X(TX) + 10, Y(0) - 26, { alpha: p.lg * alpha * 0.8 });
      }
      if (p.ld > 0.01) {
        const a = p.ld;
        dimV(g, X(XMIN) + 28, Y(0), Y(T_S), `${F(T_S)} µm`, fg, { side: 1, alpha: 0.75 * a * alpha });
        lab(L('depleted'), -105, 36, { a, align: 'left' });
        lab(L('eDrift'), TX + 14, 110, { a, color: accent });
        lab(L('hDrift'), TX + 14, 24, { a });
        lab(L('backPlane'), 62, -2, { a: a * 0.8 });
        dimH(g, X(-PITCH / 2), X(PITCH / 2), Y(Y_CHIP + 20), `${F(PITCH)} µm`, fg, { alpha: 0.75 * a * alpha });
        lab(L('pixelElectrode'), 30, T_S - 8, { a: a * 0.9, color: accent });
      }
      if (p.lb > 0.01) {
        const a = p.lb;
        lab(L('bumpBond'), 19, T_S - 24, { a, color: accent2 });
        dimV(g, X(-14), Y(Y_BUMP - BUMP_D / 2), Y(Y_BUMP + BUMP_D / 2), `${F(BUMP_D)} µm`, fg, { side: -1, alpha: 0.75 * a * alpha });
        lab(L('sensorEnd'), -PITCH * 1.45, T_S - 20, { a: a * 0.8 });
        lab(L('chipEnd'), -PITCH * 1.45, Y_CHIP + 26, { a: a * 0.8 });
      }
      if (p.la > 0.01) {
        const a = p.la;
        const y0 = Y_CHIP + 5;
        const ll: [string, number, number, number][] = [[L('amplifier'), -12, -22, y0 + 28], [L('discriminator'), 7, -8, y0 + 44], [L('memory'), 20, 6, y0 + 60]];
        for (const [t, bx, lx, ly] of ll) {
          line(g, X(bx), Y(y0 + 15), X(lx + 4), Y(ly - 4), fg, { alpha: 0.35 * a * alpha });
          lab(t, lx, ly, { a });
        }
      }
      if (p.lt > 0.01) {
        const a = p.lt;
        lab(L('sensorOpt'), XMIN + 20, ys + 40, { a, color: accent });
        lab(L('chipOpt'), XMIN + 20, Y_CHIP + yc + 60, { a });
        lab(L('bumpsJoin'), XMIN + 20, (ys + T_S + Y_BUMP + yc - BUMP_D / 2) / 2, { a, color: accent2 });
        lab(L('separately'), XMAX - 20, T_S / 2 + 10, { a, align: 'right' });
      }
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['drift'],
      anim: { amplify: 3.5 },
      draw(g, s, p, env) {
        const { w, h } = s;
        const lay = dualLayout(w, h, 0.62);
        const crossA = 1 - p.map;
        const mw = lerp(w - 28, lay.main.w, clamp(p.grid + p.wave));
        const mainR = { x: 14, y: 14, w: mw, h: h - 28 };
        layCross(g, w, h, crossA, (g2) => drawCross(g2, mainR, p, s.t, env, 1));

        // goal: pixel grid in top view with one fired pixel
        layGrid(g, w, h, p.grid * crossA, (g2) => {
          const a = lay.aux;
          const n = 6;
          const c = Math.min(46, (a.w - 20) / n, (a.h - 90) / n);
          const gx = a.x + (a.w - n * c) / 2;
          const gy = a.y + (a.h - n * c) / 2;
          txt(g2, L('topView'), gx, gy - 24, { alpha: 0.8 });
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) box(g2, gx + i * c, gy + j * c, c, c, { stroke: fg, alpha: 0.35, fill: i === 2 && j === 3 ? accent : undefined, fa: 0.8 });
          dimH(g2, gx + 4 * c, gx + 5 * c, gy + n * c + 14, `${F(PITCH)} µm`, fg);
          plate(g2, bg, L('oneHit'), gx + 2.5 * c, gy + 3.5 * c - c * 1.15, { align: 'center' });
        });

        // amplify: pulse and discriminator output
        layWave(g, w, h, p.wave * crossA, (g2) => {
          const a = lay.aux;
          const r = { x: a.x + 56, y: a.y + 30, w: a.w - 56 - 14, h: a.h * 0.55 };
          const pl = plot(g2, ctx, r, { min: 0, max: 2.2, label: L('time'), ticks: [] }, {
            min: 0,
            max: 14000,
            label: L('signalE'),
            ticks: [
              { v: 0, label: '0' },
              { v: THR, label: F(THR) },
              { v: Math.round(A_PEAK), label: F(Math.round(A_PEAK / 100) * 100) },
            ],
          });
          pl.axes();
          const t0 = 0.3;
          const prog = env.reduced ? 1 : smooth(0.2, 2.6, env.ts);
          pl.curve((x) => A_PEAK * pulse(x - t0), { color: accent, width: 1.75, progress: prog });
          pl.hline(THR, { color: accent2, dash: [4, 4], alpha: 0.9 });
          pl.text(2.2, THR + 1100, L('threshold'), { align: 'right', color: accent2, alpha: 1 });
          // discriminator output (digital), below the plot
          const dy = r.y + r.h + 66;
          const dh = 22;
          const xOn = pl.X(t0 + tCross);
          const xOff = pl.X(t0 + tOff);
          const xs = pl.X(2.2 * prog);
          g2.save();
          g2.strokeStyle = accent;
          g2.lineWidth = 1.5;
          g2.beginPath();
          g2.moveTo(r.x, dy);
          g2.lineTo(Math.min(xs, xOn), dy);
          if (xs > xOn) {
            g2.lineTo(xOn, dy - dh);
            g2.lineTo(Math.min(xs, xOff), dy - dh);
            if (xs > xOff) {
              g2.lineTo(xOff, dy);
              g2.lineTo(xs, dy);
            }
          }
          g2.stroke();
          g2.restore();
          if (prog > 0.95 || xs > xOn + 2) {
            line(g2, xOn, r.y + r.h, xOn, dy - dh - 4, accent2, { alpha: 0.5, dash: [2, 3] });
            plate(g2, bg, L('hitFlag'), xOn + 6, dy - dh - 12, { color: accent, alpha: 1 });
          }
          txt(g2, L('discOut'), r.x, dy + 16, { alpha: 0.75 });
        });

        // readout: pixel map with fired pixels and the cluster centroid
        layMap(g, w, h, p.map, (g2) => {
          const cols = 14;
          const rows = 9;
          const c = Math.min(40, (w - 50) / cols, (h - 110) / rows);
          const gx = (w - cols * c) / 2;
          const gy = 44;
          const fired: [number, number, number][] = [
            [6, 3, 0.72],
            [7, 3, 0.45],
            [7, 4, 0.3],
            [11, 6, 0.55],
            [11, 7, 0.38],
          ];
          for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) box(g2, gx + i * c, gy + j * c, c, c, { stroke: fg, alpha: 0.28 });
          for (const [i, j, q] of fired) box(g2, gx + i * c, gy + j * c, c, c, { fill: interpolateInferno(0.15 + 0.75 * q), stroke: fg, alpha: 0.9 });
          const cl = fired.slice(0, 3);
          const sum = cl.reduce((a, b) => a + b[2], 0);
          const mx = gx + (cl.reduce((a, b) => a + (b[0] + 0.5) * b[2], 0) / sum) * c;
          const my = gy + (cl.reduce((a, b) => a + (b[1] + 0.5) * b[2], 0) / sum) * c;
          g2.save();
          g2.strokeStyle = accent;
          g2.lineWidth = 1.75;
          g2.beginPath();
          g2.moveTo(mx - 7, my - 7);
          g2.lineTo(mx + 7, my + 7);
          g2.moveTo(mx - 7, my + 7);
          g2.lineTo(mx + 7, my - 7);
          g2.stroke();
          g2.restore();
          plate(g2, bg, L('centroid'), gx + 5.8 * c, gy + 2.0 * c - 8, { align: 'right', color: accent });
          plate(g2, bg, L('otherParticle'), gx + 10.7 * c, gy + 6.5 * c, { align: 'right' });
          dimH(g2, gx + (cols - 1) * c, gx + cols * c, gy + rows * c + 14, `${F(PITCH)} µm`, fg);
          txt(g2, L('firedPixels'), gx, gy - 22, { alpha: 0.85 });
          txt(g2, L('colourIs'), gx + cols * c, gy - 22, { align: 'right', alpha: 0.7 });
        });
      },
    });
  },
};
export default mod;

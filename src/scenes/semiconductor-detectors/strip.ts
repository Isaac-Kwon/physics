/**
 * sc.strip — top view of a strip sensor (N = 12 drawn strips).
 *   strips: one fired strip = one coordinate; N channels instead of N² for pixels of the same pitch.
 *   stereo: a second layer tilted by α (exaggerated; real modules use tens of mrad); two particles give 2 real + 2 ghost crossings.
 * Intersection of fired strip a (x = x_a) and fired strip b (u_b = (x−cx)cosα − (y−cy)sinα) is solved exactly.
 */
import type { SceneModule } from '../shared/types';
import { smooth } from '../shared/canvas2d';
import { arrow, box, createStage, dot, line, plate, txt, type G } from './_sc2-common';

const STATES = ['strips', 'stereo'] as const;
type P = { b: number; cnt: number };
const TARGETS: Record<string, P> = { strips: { b: 0, cnt: 1 }, stereo: { b: 1, cnt: 0 } };
const N = 12;
const ALPHA = (18 * Math.PI) / 180;
const A1 = 5;
const A2 = 6;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg, bg } = ctx.theme;
    const cs = Math.cos(ALPHA);
    const sn = Math.sin(ALPHA);

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { stereo: 3.2 },
      draw(g: G, s, p, env) {
        const { w, h } = s;
        const Wr = Math.min(w - 40, 560);
        const Hr = Math.min(h - 150, Wr * 0.62);
        const rx = (w - Wr) / 2;
        const ry = 52;
        const cx = rx + Wr / 2;
        const cy = ry + Hr / 2;
        const pitch = Wr / N;
        const xa = (a: number) => rx + (a + 0.5) * pitch;
        const ub = (b: number) => (b - (N - 1) / 2) * pitch;
        const yAt = (a: number, b: number) => cy + ((xa(a) - cx) * cs - ub(b)) / sn;
        const inside = (y: number) => y > ry + 10 && y < ry + Hr - 10;

        // Choose the two fired stereo strips so that all four crossings fall inside the sensor and are well separated.
        let best = { b1: 3, b2: 4, m: -1 };
        for (let b1 = 0; b1 < N; b1++) {
          for (let b2 = 0; b2 < N; b2++) {
            if (b1 === b2) continue;
            const ys = [yAt(A1, b1), yAt(A2, b2), yAt(A1, b2), yAt(A2, b1)];
            if (!ys.every(inside)) continue;
            const sorted = [...ys].sort((a, b) => a - b);
            const gap = Math.min(sorted[1] - sorted[0], sorted[2] - sorted[1], sorted[3] - sorted[2]);
            if (gap > best.m) best = { b1, b2, m: gap };
          }
        }
        const { b1, b2 } = best;
        const hit1 = { x: xa(A1), y: yAt(A1, b1) };
        const hit2 = { x: xa(A2), y: yAt(A2, b2) };
        const ghosts = [
          { x: xa(A1), y: yAt(A1, b2) },
          { x: xa(A2), y: yAt(A2, b1) },
        ];
        // strips state: one particle, hit placed at the same crossing so the two states line up
        const second = env.state === 'stereo' ? (env.reduced ? 1 : smooth(1.4, 2.3, env.ts)) : 0;

        box(g, rx, ry, Wr, Hr, { fill: accent, fa: 0.07, stroke: fg, alpha: 0.45 });
        g.save();
        g.beginPath();
        g.rect(rx, ry, Wr, Hr);
        g.clip();
        // layer 1: vertical strips
        for (let a = 0; a < N; a++) {
          const fired = a === A1 || (a === A2 && second > 0);
          if (fired) box(g, xa(a) - pitch * 0.35, ry, pitch * 0.7, Hr, { fill: accent, fa: fired && a === A2 ? 0.45 * second : 0.45 });
          line(g, xa(a), ry, xa(a), ry + Hr, fg, { alpha: 0.28 });
        }
        // layer 2: strips tilted by α about the centre
        if (p.b > 0.01) {
          const Lg = Hr + Wr;
          for (let b = 0; b < N; b++) {
            const ox = cx + cs * ub(b);
            const oy = cy - sn * ub(b);
            const x0 = ox - sn * Lg;
            const y0 = oy - cs * Lg;
            const x1 = ox + sn * Lg;
            const y1 = oy + cs * Lg;
            const fired = b === b1 || (b === b2 && second > 0);
            if (fired) {
              g.save();
              g.globalAlpha = p.b * 0.45 * (b === b2 ? second : 1);
              g.strokeStyle = accent2;
              g.lineWidth = pitch * 0.7;
              g.beginPath();
              g.moveTo(x0, y0);
              g.lineTo(x1, y1);
              g.stroke();
              g.restore();
            }
            line(g, x0, y0, x1, y1, fg, { alpha: 0.28 * p.b });
          }
        }
        g.restore();

        // readout row (copper) under layer 1
        for (let a = 0; a < N; a++) box(g, xa(a) - pitch * 0.35, ry + Hr + 5, pitch * 0.7, 9, { fill: accent2, alpha: a === A1 ? 1 : 0.45 });
        txt(g, L('readout'), rx, ry + Hr + 30, { alpha: 0.7 });

        // hits
        const flash = env.reduced ? 1 : smooth(0, 0.5, env.ts);
        dot(g, hit1.x, hit1.y, 4, accent, flash);
        dot(g, hit1.x, hit1.y, 8, fg, 0.6 * flash, true);
        if (env.state === 'strips' || p.cnt > 0.01) {
          // strips: position along the strip is not measured
          const yTop = ry + 6;
          const yBot = ry + Hr - 6;
          g.save();
          g.globalAlpha = p.cnt;
          arrow(g, hit1.x + pitch * 0.55, hit1.y - 8, hit1.x + pitch * 0.55, yTop + 6, { color: fg, alpha: 0.55, head: 5 });
          arrow(g, hit1.x + pitch * 0.55, hit1.y + 8, hit1.x + pitch * 0.55, yBot - 6, { color: fg, alpha: 0.55, head: 5 });
          g.restore();
          plate(g, bg, L('alongUnknown'), hit1.x + pitch * 0.55 + 8, hit1.y + 26, { alpha: p.cnt });
          plate(g, bg, L('xMeasured'), hit1.x - pitch * 0.55 - 4, hit1.y - 20, { align: 'right', alpha: p.cnt });
        }
        if (p.b > 0.5) {
          dot(g, hit2.x, hit2.y, 4, accent, second);
          dot(g, hit2.x, hit2.y, 8, fg, 0.6 * second, true);
          for (const gh of ghosts) {
            g.save();
            g.globalAlpha = 0.75 * second;
            g.strokeStyle = fg;
            g.setLineDash([3, 3]);
            g.lineWidth = 1;
            g.beginPath();
            g.arc(gh.x, gh.y, 7, 0, Math.PI * 2);
            g.stroke();
            g.restore();
            plate(g, bg, L('ghost'), gh.x + 12, gh.y, { alpha: second * 0.9 });
          }
          plate(g, bg, L('realHit'), hit1.x - 12, hit1.y - 3, { align: 'right', alpha: 0.9 });
        }

        // header: counts (strips) or the stereo angle (stereo)
        if (p.cnt > 0.01) {
          txt(g, `${L('channels')}  ${ctx.formatNumber(N)} ${L('strips')}`, rx, 18, { alpha: p.cnt });
          txt(g, `${ctx.formatNumber(N)} × ${ctx.formatNumber(N)} = ${ctx.formatNumber(N * N)} ${L('pixelsSame')}`, rx, 36, { alpha: p.cnt * 0.75 });
        }
        if (p.b > 0.01) {
          txt(g, L('layer1'), rx, 18, { alpha: p.b, color: accent });
          txt(g, L('layer2'), rx, 36, { alpha: p.b, color: accent2 });
          // α sketch
          const ax = rx + Wr - 24;
          const ay = 12;
          const len = 30;
          line(g, ax, ay, ax, ay + len, fg, { alpha: 0.6 * p.b, dash: [2, 3] });
          line(g, ax, ay, ax - Math.sin(ALPHA) * len, ay + Math.cos(ALPHA) * len, accent2, { lw: 1.5, alpha: p.b });
          g.save();
          g.globalAlpha = 0.8 * p.b;
          g.strokeStyle = fg;
          g.beginPath();
          g.arc(ax, ay, 18, Math.PI / 2, Math.PI / 2 + ALPHA);
          g.stroke();
          g.restore();
          txt(g, 'α', ax + 8, ay + 22, { mono: true, alpha: p.b });
          txt(g, L('exaggerated'), ax - 26, ay + 14, { align: 'right', alpha: 0.65 * p.b });
        }
      },
    });
  },
};
export default mod;

/**
 * det.trigger — rates and selection.
 *   rate: a 3 microsecond window of the 40 MHz clock (120 bunch crossings, 25 ns apart, drawn one by one), and a log scale of the rates
 *         40 MHz crossings, ~100 kHz after the first level, ~1 kHz stored (DET.LHC_BUNCH_CROSSING_HZ, DET.L1_ACCEPT_HZ, DET.STORED_EVENTS_HZ low end).
 *   levels: the ratios are drawn to scale: 400 crossings (10 us of beam) -> 1 passes level 1 (100 kHz / 40 MHz = 1/400);
 *           100 level-1 accepts (1 ms) -> 1 stored (100 kHz / 1 kHz = 1/100). Rejected dots fall away.
 *   streaming: every hit is time-stamped (arrival time minus a known channel delay) and sorted into collisions in the buffer.
 * Which crossings pass is a seeded pick: schematic, the criterion itself is not modelled.
 */
import { interpolateViridis } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, mulberry32, lerp } from '../shared/canvas2d';
import { DET } from '../../data/detectors';
import { arrow, dot, line, txt } from '../common/_draw';
import { makeClock } from './_d2-common';

const STATES = ['rate', 'levels', 'streaming'] as const;
type St = (typeof STATES)[number];
const F_BX = DET.LHC_BUNCH_CROSSING_HZ.value as number;
const F_L1 = DET.L1_ACCEPT_HZ.value as number;
const F_ST = (DET.STORED_EVENTS_HZ.value as readonly [number, number])[0];
const N1 = Math.round(F_BX / F_L1); // 400
const N2 = Math.round(F_L1 / F_ST); // 100

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const nf = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const clk = makeClock(ctx);
    const rnd = mulberry32(404);
    let state: St = 'rate';
    const acc1 = Math.floor(rnd() * N1);
    const acc2 = Math.floor(rnd() * N2);
    // streaming hits
    const T0 = [14, 39, 64];
    const hitsS = T0.flatMap((t0, ci) => Array.from({ length: 22 }, () => ({ ci, t: t0 + 1.2 * (rnd() + rnd() + rnd() - 1.5), delay: 30 * rnd() })));
    const ord = hitsS.map((hh, i) => ({ ...hh, arr: hh.t + hh.delay, i })).sort((a, b) => a.arr - b.arr);

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      const narrow = w < 560;
      const pad = narrow ? 14 : 28;
      const W = w - 2 * pad;

      if (state === 'rate') {
        // clock window
        const y0 = 70;
        txt(g, L('window'), pad, y0 - 30, { color: th.fg, alpha: 0.8 });
        const n = 120;
        const tp = clk.p(0.0, 1.2);
        for (let i = 0; i < n; i++) {
          if (i / n > tp) break;
          const x = pad + ((i + 0.5) / n) * W;
          line(g, x, y0, x, y0 + 22, th.fg, 1, 0.75);
        }
        line(g, pad, y0 + 22, pad + W, y0 + 22, th.fg, 1, 0.4);
        const x1 = pad + (0.5 / n) * W;
        const x2 = pad + (1.5 / n) * W;
        line(g, x1, y0 - 12, x2, y0 - 12, th.accent, 1, 1);
        txt(g, '25 ns', x2 + 6, y0 - 12, { mono: true, color: th.accent, alpha: 1 });
        txt(g, '3 μs', pad + W, y0 + 40, { mono: true, color: th.fg, align: 'right', alpha: 0.7 });
        txt(g, L('crossing'), pad, y0 + 40, { color: th.fg, alpha: 0.7 });

        // log scale of rates
        const by = y0 + 110;
        const lo = 2;
        const hi = 8;
        const X = (hz: number) => pad + ((Math.log10(hz) - lo) / (hi - lo)) * W;
        line(g, pad, by + 100, pad + W, by + 100, th.fg, 1, 0.5);
        [[1e3, '1 kHz'], [1e4, '10 kHz'], [1e5, '100 kHz'], [1e6, '1 MHz'], [1e7, '10 MHz']].forEach(([v, lab]) => {
          line(g, X(v as number), by + 100, X(v as number), by + 104, th.fg, 1, 0.5);
          txt(g, lab as string, X(v as number), by + 118, { mono: true, color: th.fg, align: 'center', alpha: 0.6 });
        });
        const bars: [number, string, string, number][] = [
          [F_BX, 'crossings', th.fg, 0],
          [F_ST, 'stored', th.accent, 1],
        ];
        bars.forEach(([hz, key, col, i]) => {
          const yy = by + i * 46;
          const q = clk.p(0.5 + i * 0.5, 0.8);
          g.save();
          g.fillStyle = col;
          g.globalAlpha = 0.9;
          g.fillRect(X(1e2), yy, (X(hz) - X(1e2)) * q, 18);
          g.restore();
          txt(g, L(key), X(1e2), yy - 9, { color: col, alpha: 0.95 });
          txt(g, hz >= 1e6 ? `${nf(hz / 1e6)} MHz` : `${nf(hz / 1e3)} kHz`, X(hz) + 8, yy + 9, { mono: true, color: col, alpha: q });
        });
        txt(g, `1 : ${nf(F_BX / F_ST)}`, pad + W, by + 59, { mono: true, color: th.fg, align: 'right', alpha: 0.85 * clk.p(1.2, 0.5) });
        txt(g, L('logNote'), pad + W, by + 140, { color: th.fg, align: 'right', alpha: 0.55 });
        return;
      }

      if (state === 'levels') {
        const cols1 = narrow ? 40 : 40;
        const rows1 = Math.ceil(N1 / cols1);
        const tight = h < 400;
        const sp = Math.min(12, (W - 2) / cols1, (h - (tight ? 165 : 200)) / (rows1 + 1.3 * Math.ceil(N2 / 20)));
        const r = Math.max(1.4, Math.min(2.6, sp * 0.26));
        const cols2 = 20;
        const sp2 = sp * (tight ? 1.3 : 2);
        const rows2 = Math.ceil(N2 / cols2);
        const gh1 = rows1 * sp;
        const gh2 = rows2 * sp2;
        const y1 = tight ? 34 : 44;
        const gate1 = y1 + gh1 + (tight ? 18 : 28);
        const y2 = gate1 + (tight ? 42 : 46);
        const gate2 = y2 + gh2 + (tight ? 18 : 28);
        const y3 = gate2 + (tight ? 34 : 46);
        const x0 = pad + (W - (cols1 - 1) * sp) / 2;
        const drop1 = clk.p(0.35, 0.6);
        const drop2 = clk.p(0.75, 0.6);
        // stage 1
        txt(g, `${L('s1')}  ·  ${nf(N1)} ${L('crossings')} = ${nf((N1 * 25) / 1000)} μs`, pad, y1 - (tight ? 16 : 20), { color: th.fg, alpha: 0.85 });
        for (let i = 0; i < N1; i++) {
          const x = x0 + (i % cols1) * sp;
          const y = y1 + Math.floor(i / cols1) * sp + sp / 2;
          if (i === acc1) dot(g, x, y + drop1 * 0 + (gate1 - y1 - gh1) * 0, r * 1.5, th.accent, 1);
          else dot(g, x, y + drop1 * 12, r, th.fg, 0.8 - 0.66 * drop1);
        }
        // gate 1
        line(g, pad, gate1, pad + W, gate1, th.accent, 1, 0.85, [6, 4]);
        txt(g, `${L('l1')}  ·  ${L(narrow ? 'l1tS' : 'l1t')}  ·  1 : ${nf(N1)}  ·  ${nf(F_BX / 1e6)} MHz → ${nf(F_L1 / 1e3)} kHz`, pad, gate1 + 15, { color: th.accent, alpha: 1 });
        // stage 2
        txt(g, `${L('s2')}  ·  ${nf(N2)} ${L('accepts')} = ${nf((N2 * 10) / 1000)} ms`, pad, y2 - (tight ? 10 : 14), { color: th.fg, alpha: 0.85 });
        const x02 = pad + (W - (cols2 - 1) * sp2) / 2;
        for (let i = 0; i < N2; i++) {
          const x = x02 + (i % cols2) * sp2;
          const y = y2 + Math.floor(i / cols2) * sp2 + sp2 / 2;
          if (i === acc2) dot(g, x, y, r * 1.5, th.accent, 1);
          else dot(g, x, y + drop2 * 12, r, th.fg, 0.8 - 0.66 * drop2);
        }
        line(g, pad, gate2, pad + W, gate2, th.accent, 1, 0.85, [6, 4]);
        txt(g, `${L('hlt')}  ·  ${narrow ? '' : L('hltt') + '  ·  '}1 : ${nf(N2)}  ·  ${nf(F_L1 / 1e3)} kHz → ${nf(F_ST / 1e3)} kHz`, pad, gate2 + 15, { color: th.accent, alpha: 1 });
        const q3 = clk.p(1.2, 0.5);
        dot(g, pad + 8, y3 + 4, r * 1.8, th.accent, q3);
        txt(g, `${L('stored')}  ·  ${nf(F_ST / 1e3)} kHz  ·  1 : ${nf(F_BX / F_ST)} ${L('ofCross')}`, pad + 22, y3 + 4, { color: th.accent, alpha: q3 });
        return;
      }

      // streaming
      const ya = 90;
      const yb = Math.min(h - 80, ya + 150);
      const Tm = 110;
      const X = (t: number) => pad + (t / Tm) * W;
      txt(g, L('arrival'), pad, ya - 40, { color: th.fg, alpha: 0.85 });
      txt(g, L('timestamp'), pad, yb - 40, { color: th.accent, alpha: 0.9 });
      line(g, pad, ya, pad + W, ya, th.fg, 1, 0.35);
      line(g, pad, yb, pad + W, yb, th.fg, 1, 0.35);
      for (let t = 0; t <= Tm; t += 25) {
        line(g, X(t), yb, X(t), yb + 4, th.fg, 1, 0.5);
        txt(g, String(t), X(t), yb + 16, { mono: true, color: th.fg, align: 'center', alpha: 0.6 });
      }
      txt(g, 'ns', pad + W, yb + 32, { mono: true, color: th.fg, align: 'right', alpha: 0.7 });
      const mv = clk.p(0.9, 1.2);
      ord.forEach((hh, k) => dot(g, X(Math.min(Tm, hh.arr)), ya + ((k % 5) - 2) * 9, 2.4, th.fg, 0.28));
      ord.forEach((hh, k) => {
        const xa = X(Math.min(Tm, hh.arr));
        const xb = X(hh.t);
        const ypos = ya + ((k % 5) - 2) * 9;
        const yq = yb + ((hh.i % 5) - 2) * 9;
        const x = lerp(xa, xb, mv);
        const y = lerp(ypos, yq, mv);
        g.save();
        g.fillStyle = mv > 0.6 ? interpolateViridis(0.15 + 0.35 * hh.ci) : th.fg;
        g.globalAlpha = 0.9;
        g.beginPath();
        g.arc(x, y, 2.4, 0, Math.PI * 2);
        g.fill();
        g.restore();
      });
      T0.forEach((t0, i) => {
        txt(g, `${L('coll')} ${i + 1}`, X(t0), yb + 52, { color: interpolateViridis(0.15 + 0.35 * i), align: 'center', alpha: clk.p(2.0, 0.5) });
        line(g, X(t0 - 6), yb + 40, X(t0 + 6), yb + 40, interpolateViridis(0.15 + 0.35 * i), 1.5, clk.p(2.0, 0.5));
      });
      arrow(g, pad + W / 2, ya + 24, pad + W / 2, yb - 26, th.fg, 1, 0.5 * clk.p(0.6, 0.4), 6);
      txt(g, L('sort'), pad + W / 2 + 10, (ya + yb) / 2, { color: th.fg, alpha: 0.7 * clk.p(0.6, 0.4) });
    });
    c.animate = true;
    return {
      setState(st: string, o: SetStateOptions) {
        state = (STATES as readonly string[]).includes(st) ? (st as St) : 'rate';
        clk.reset();
        if (o.immediate || ctx.reducedMotion) clk.finish();
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

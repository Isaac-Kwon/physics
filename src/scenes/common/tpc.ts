/**
 * shared.tpc — Canvas2D principle drawing of a time projection chamber (topic-neutral: gas or liquid, any experiment).
 * A charged particle crosses the drift volume and leaves ionization electrons; the field E pushes them at a constant
 * drift speed v_d to the readout plane. Plane coordinate = position, arrival time = depth: x = x_plane - v_d t.
 *   drift   : the particle, the electrons drifting, the readout plane recording them (loops).
 *   readout : same, plus the reconstruction of the original positions from the arrival times (end frame stays).
 * Charge per cluster varies (Landau-like, seeded); dot area and readout bar length encode that charge.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32, clamp, smooth } from '../shared/canvas2d';
import { arrow, dot, line, ring, txt } from './_draw';

const STATES = ['drift', 'readout'] as const;
const N = 15;
const PERIOD = 8.5; // s per loop
const T_TRACK = 0.9; // s: particle crosses
const T_DRIFT = 4.2; // s: farthest electron drift time

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const rnd = mulberry32(11);
    // cluster charge: heavy-tailed positive (Landau-like), mean ~1
    const charge = Array.from({ length: N }, () => 0.45 + 0.55 * -Math.log(1 - rnd() * 0.93));
    let readout = 0; // level 0..1
    let target = 0;
    const L = (k: string) => ctx.label(k);

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      readout = approach(readout, target, s.dt, 0.5);
      const padL = 18;
      const bx = padL + 6;
      const bw = Math.max(80, w - padL - 6 - 70);
      const by = 30;
      const bh = Math.max(60, h - by - 52);
      const planeX = bx + bw;
      // phase clock
      let tc: number;
      if (ctx.reducedMotion) tc = T_TRACK + T_DRIFT * 0.62;
      else tc = s.t % PERIOD;
      if (ctx.reducedMotion && target > 0.5) tc = T_TRACK + T_DRIFT + 0.5;
      const tdr = Math.max(0, tc - T_TRACK); // time since ionization
      const vd = (bw * 0.86) / T_DRIFT; // px/s
      const trk = clamp(tc / T_TRACK);

      // drift volume + field cage
      g.save();
      g.strokeStyle = th.fg;
      g.lineWidth = 1;
      g.globalAlpha = 0.4;
      g.strokeRect(bx, by, bw, bh);
      g.restore();
      line(g, bx, by, bx, by + bh, th.fg, 2, 0.7); // cathode
      line(g, planeX, by, planeX, by + bh, th.accent2, 2.2, 0.95); // readout plane
      txt(g, L('cathode'), bx, by - 12, { color: th.fg, alpha: 0.7 });
      txt(g, L('readout'), planeX, by - 12, { color: th.accent2, align: 'right', alpha: 0.95 });
      // electric field arrows (electrons feel force opposite to E: E points toward the cathode)
      for (let i = 0; i < 3; i++) {
        const y = by + bh * (0.2 + 0.3 * i);
        arrow(g, bx + bw * 0.62, y, bx + bw * 0.62 - 38, y, th.fg, 1, 0.3, 5);
      }
      txt(g, L('field'), bx + bw * 0.62 - 20, by + bh * 0.2 - 12, { color: th.fg, align: 'center', alpha: 0.6 });

      // track: from upper left to lower middle (crosses many drift depths)
      const x0 = bx + bw * 0.1;
      const y0 = by + 4;
      const x1 = bx + bw * 0.58;
      const y1 = by + bh - 4;
      line(g, x0, y0, x0 + (x1 - x0) * trk, y0 + (y1 - y0) * trk, th.fg, 1.2, 0.55);
      if (trk < 1) dot(g, x0 + (x1 - x0) * trk, y0 + (y1 - y0) * trk, 3, th.fg, 0.9);
      txt(g, L('track'), x0 + 12, y0 + 12, { color: th.fg, alpha: 0.8 });

      // electrons
      const pads = 18;
      const padH = bh / pads;
      const padSum = new Array(pads).fill(0);
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N;
        const ex = x0 + (x1 - x0) * u;
        const ey = y0 + (y1 - y0) * u;
        if (trk < u) continue;
        const tArr = (planeX - ex) / vd;
        const arrived = tdr >= tArr;
        const px = arrived ? planeX : ex + vd * tdr;
        const r = 2 + 2 * Math.sqrt(charge[i]);
        // ghost of the original position (readout state: reconstructed from arrival time)
        if (readout > 0.02) {
          ring(g, ex, ey, r + 1.5, th.fg, 1, 0.55 * readout * (arrived ? 1 : 0.4));
          if (arrived) line(g, planeX - 4, ey, ex + r + 2, ey, th.fg, 1, 0.22 * readout, [2, 3]);
        }
        if (arrived) {
          padSum[Math.min(pads - 1, Math.floor((ey - by) / padH))] += charge[i];
          dot(g, planeX, ey, r, th.accent, 0.95);
        } else dot(g, px, ey, r, th.accent, 0.95);
      }
      // readout pads: bar length = collected charge (right of the plane)
      for (let k = 0; k < pads; k++) {
        const yy = by + padH * (k + 0.5);
        line(g, planeX + 3, yy - padH / 2, planeX + 6, yy - padH / 2, th.accent2, 1, 0.35);
        if (padSum[k] > 0) line(g, planeX + 8, yy, planeX + 8 + 18 * padSum[k], yy, th.accent2, Math.max(2, padH * 0.55), 0.9);
      }
      txt(g, L('pads'), w - 4, by + bh + 14, { color: th.accent2, align: 'right', alpha: 0.9 });

      // drift arrow label
      arrow(g, bx + bw * 0.62, by + bh * 0.86, bx + bw * 0.62 + 56, by + bh * 0.86, th.accent, 1.2, 0.8, 6);
      txt(g, L('electrons'), bx + bw * 0.62, by + bh * 0.86 + 14, { color: th.accent, alpha: 0.9 });

      // bottom axis: arrival time <-> depth
      const ay = by + bh + 26;
      line(g, planeX, ay, bx, ay, th.fg, 1, 0.45);
      arrow(g, bx + 24, ay, bx, ay, th.fg, 1, 0.45, 5);
      txt(g, '0', planeX, ay + 11, { mono: true, color: th.fg, align: 'center', alpha: 0.6 });
      txt(g, L('timeaxis'), (bx + planeX) / 2, ay + 12, { color: th.fg, align: 'center', alpha: 0.75 });
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N;
        const ex = x0 + (x1 - x0) * u;
        if (trk < u) continue;
        if (tdr >= (planeX - ex) / vd) {
          const a = readout > 0.02 ? 0.9 : 0.55;
          line(g, ex, ay - 4, ex, ay + 4, th.accent, 1.4, a);
        }
      }
      if (readout > 0.02) {
        txt(g, L('recon'), x1 + 14, y1 - 10, { color: th.fg, alpha: 0.85 * smooth(0, 1, readout) });
      }
    });
    c.animate = true;

    return {
      setState(state: string, _o: SetStateOptions) {
        target = state === 'readout' ? 1 : 0;
        if (_o.immediate || ctx.reducedMotion) readout = target;
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

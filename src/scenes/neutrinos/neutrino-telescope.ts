/**
 * nu.neutrino-telescope — P9 walkthrough of IceCube (vertical slice, to scale).
 * 10 of the 86 strings (125 m apart) with all 60 sensors each (17 m apart) between 1.45 and 2.45 km depth
 * (NU.ICECUBE_DEPTH_KM, NU.ICECUBE_STRINGS). An up-going muon at 55 degrees crosses the slice at speed c (beta = 1).
 * Cherenkov angle in ice: n = 1.32 -> 40.9 degrees (cos theta = 1/n).
 * Arrival time of the direct light at a sensor at longitudinal position z and perpendicular distance rho from the track:
 *   t = (z + rho tan(theta)) / c          (emission point z - rho / tan(theta), photon speed c/n)
 * Light seen A ~ exp(-rho / 80 m) / (20 m + rho) (geometric spreading and absorption, relative units); a sensor "fires" if A is
 * above a threshold. Timing: sensors coloured by t (viridis). Direction: a grid fit of (angle, offset) to the times with 15 ns
 * jitter added, minimising the squared residuals of the formula above.
 * Simplifications: in-plane geometry only, no scattering of light in ice, no PMT noise, one muon.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, gaussian, clamp, smooth } from '../shared/canvas2d';
import { NU } from '../../data/neutrinos';
import { createStage, arrow, dim, dot, glow, interpolateViridis, line, ray, ring, txt } from './_n2-common';

const STATES = ['lattice', 'muon', 'timing', 'direction', 'earth-shield'] as const;
const C = 0.2998; // km/us
const N_ICE = 1.32;
const THETA = Math.acos(1 / N_ICE);
const TANT = Math.tan(THETA);
const NSTR = 10;
const DX = 0.125;
const NSEN = 60;
const D0 = NU.ICECUBE_DEPTH_KM.value as readonly [number, number];
const ANG = (55 * Math.PI) / 180;
const DIR: [number, number] = [Math.cos(ANG), -Math.sin(ANG)]; // (x, depth): up-going = depth decreasing
const Q: [number, number] = [0.05, 1.95];

type P = { lat: number; muon: number; col: number; fit: number; earth: number };
const TARGETS: Record<string, P> = {
  lattice: { lat: 1, muon: 0, col: 0, fit: 0, earth: 0 },
  muon: { lat: 1, muon: 1, col: 0, fit: 0, earth: 0 },
  timing: { lat: 1, muon: 0, col: 1, fit: 0, earth: 0 },
  direction: { lat: 1, muon: 0, col: 1, fit: 1, earth: 0 },
  'earth-shield': { lat: 0, muon: 0, col: 0, fit: 0, earth: 1 },
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const rnd = mulberry32(86);

    interface Sen {
      x: number;
      d: number;
      z: number;
      rho: number;
      t: number;
      A: number;
      on: boolean;
    }
    const sens: Sen[] = [];
    for (let i = 0; i < NSTR; i++)
      for (let j = 0; j < NSEN; j++) {
        const x = (i - (NSTR - 1) / 2) * DX;
        const d = D0[0] + (j * (D0[1] - D0[0])) / (NSEN - 1);
        const rx = x - Q[0];
        const rd = d - Q[1];
        const z = rx * DIR[0] + rd * DIR[1];
        const rho = Math.abs(rx * DIR[1] - rd * DIR[0]);
        const t = (z + rho * TANT) / C;
        const A = Math.exp(-rho / 0.08) / (0.02 + rho);
        sens.push({ x, d, z, rho, t, A, on: A > 4 });
      }
    const lit = sens.filter((q) => q.on);
    const tMin = Math.min(...lit.map((q) => q.t));
    const tMax = Math.max(...lit.map((q) => q.t));
    const aMax = Math.max(...lit.map((q) => q.A));
    const aSum = lit.reduce((s, q) => s + q.A, 0);
    // direction fit from jittered times
    const noisy = lit.map((q) => q.t + gaussian(rnd) * 0.015);
    let best = { ang: 0, off: 0, chi: 1e9 };
    for (let a = 30; a <= 80; a += 0.25) {
      const ar = (a * Math.PI) / 180;
      const dx = Math.cos(ar);
      const dd = -Math.sin(ar);
      for (let off = -0.3; off <= 0.3; off += 0.01) {
        const px = Q[0] + -dd * off; // perpendicular offset
        const pd = Q[1] + dx * off;
        let mean = 0;
        const res = lit.map((q, i) => {
          const rx = q.x - px;
          const rd = q.d - pd;
          const z = rx * dx + rd * dd;
          const rho = Math.abs(rx * dd - rd * dx);
          const r = noisy[i] - (z + rho * TANT) / C;
          mean += r;
          return r;
        });
        mean /= res.length;
        const chi = res.reduce((s, r) => s + (r - mean) ** 2, 0);
        if (chi < best.chi) best = { ang: a, off, chi };
      }
    }
    const first = lit.reduce((m, q) => (q.t < m.t ? q : m), lit[0]);
    const last = lit.reduce((m, q) => (q.t > m.t ? q : m), lit[0]);
    const mu = Array.from({ length: 12 }, () => rnd());

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { muon: 5, timing: 5, direction: 3, 'earth-shield': 3 },
      draw(g, s, lv, env) {
        const { w, h } = s;
        const narrow = w < 520;
        const fin = env.ts >= 1e3;
        const ts = env.ts;
        const st = env.state;
        const kk = Math.min(h - 150, (w - 190) / 1.3);
        const cx = w * 0.5 + (narrow ? 14 : 0);
        const ytop = 66;
        const X = (x: number) => cx + x * kk;
        const Y = (d: number) => ytop + (d - D0[0]) * kk;
        const spanT = tMax - tMin;
        const tcl = fin ? 1e3 : tMin - 0.2 + (ts / 4) * (spanT + 0.6);
        const tc = st === 'muon' ? (fin ? tMax + 0.3 : -1.0 / C + (ts / 4.5) * (tMax + 0.3 + 1.0 / C)) : tcl;

        // ---------------- lattice ----------------
        if (lv.lat > 0.01) {
          const a = lv.lat;
          // depth axis with a break
          const ax = X(-(NSTR - 1) / 2 * DX) - 52;
          line(g, ax, 20, ax, ytop - 18, th.fg, 1, 0.5 * a);
          line(g, ax, ytop - 8, ax, Y(D0[1]) + 14, th.fg, 1, 0.5 * a);
          line(g, ax - 5, ytop - 16, ax + 5, ytop - 12, th.fg, 1, 0.7 * a);
          line(g, ax - 5, ytop - 12, ax + 5, ytop - 8, th.fg, 1, 0.7 * a);
          line(g, ax, 20, ax + 8, 20, th.fg, 1, 0.5 * a);
          if (!narrow) txt(g, `${L('surface')}`, ax + 12, 20, { color: th.fg, alpha: 0.8 * a });
          [D0[0], D0[1]].forEach((d) => {
            line(g, ax - 4, Y(d), ax + 4, Y(d), th.fg, 1, 0.6 * a);
            txt(g, `${ctx.formatNumber(d, { minimumFractionDigits: 2 })} km`, ax - 8, Y(d), { mono: true, color: th.fg, align: 'right', alpha: 0.85 * a });
          });
          txt(g, L('depth'), ax - 8, ytop - 30, { color: th.fg, align: 'right', alpha: 0.75 * a });
          // strings and sensors
          for (let i = 0; i < NSTR; i++) line(g, X((i - (NSTR - 1) / 2) * DX), Y(D0[0]) - 6, X((i - (NSTR - 1) / 2) * DX), Y(D0[1]) + 6, th.fg, 1, 0.3 * a);
          dim(g, X(-(NSTR - 1) / 2 * DX), ytop - 22, X(-(NSTR - 1) / 2 * DX + DX), ytop - 22, '125 m', th.fg, 0.7 * a * (1 - lv.fit));
          const unlit = 1 - lv.col * 0.7;
          sens.forEach((q) => {
            const on = q.on;
            let col = th.fg;
            let al = 0.5 * unlit;
            let r = 1.3;
            const arrived = on && q.t <= tc;
            if (lv.muon > 0.01 && arrived) {
              col = th.accent2;
              al = 1;
              r = 2.6;
            }
            if (lv.col > 0.01 && on && (q.t <= tcl || st === 'direction')) {
              col = interpolateViridis(clamp((q.t - tMin) / spanT));
              al = 1;
              r = st === 'direction' ? 1.2 + 3 * Math.sqrt(q.A / aMax) : 2.6;
            }
            dot(g, X(q.x), Y(q.d), r, col, al * a);
          });
          // lattice labels
          if (st === 'lattice') {
            const lx = narrow ? 14 : X((NSTR - 1) / 2 * DX) + 24;
            const ly = narrow ? h - 24 : Y(D0[0]) + 14;
            txt(g, L('strings'), lx, ly, { color: th.fg, alpha: 0.95 * a });
            if (!narrow) {
              txt(g, L('sliceNote'), lx, ly + 20, { color: th.fg, alpha: 0.7 * a });
              txt(g, L('spacing'), lx, ly + 40, { color: th.fg, alpha: 0.7 * a });
            }
          }
          // muon track and Cherenkov light
          if (lv.muon > 0.01) {
            const sA = -1.0;
            const sB = 0.9;
            const sNow = clamp(C * tc, sA, sB); // muon position (km) along the track
            const p0: [number, number] = [X(Q[0] + DIR[0] * sA), Y(Q[1] + DIR[1] * sA)];
            const p1: [number, number] = [X(Q[0] + DIR[0] * sNow), Y(Q[1] + DIR[1] * sNow)];
            line(g, p0[0], p0[1], p1[0], p1[1], th.accent, 1.6, lv.muon * a);
            dot(g, p1[0], p1[1], 3, th.accent, lv.muon * a);
            // photon rays from emission points to the cone surface (to scale)
            for (let e = sA; e <= Math.min(sNow, sB); e += 0.2) {
              const reach = Math.min(0.22, (tc - e / C) * (C / N_ICE));
              if (reach <= 0) continue;
              [1, -1].forEach((sg) => {
                const ca = Math.cos(THETA);
                const sa = Math.sin(THETA) * sg;
                const dx = DIR[0] * ca - DIR[1] * sa;
                const dd = DIR[1] * ca + DIR[0] * sa;
                const ex = Q[0] + DIR[0] * e;
                const ed = Q[1] + DIR[1] * e;
                ray(g, X(ex), Y(ed), X(ex + dx * reach), Y(ed + dd * reach), th.accent2, 0.3 * lv.muon * a, 1);
              });
            }
            txt(g, L('muon'), p0[0] + 10, p0[1] - 10, { color: th.accent, alpha: lv.muon * a });
            const ex = Q[0] + DIR[0] * 0.55;
            txt(g, `θ = ${f0((THETA * 180) / Math.PI)}°`, X(ex) + 14, Y(Q[1] + DIR[1] * 0.4) + 8, { mono: true, color: th.fg, alpha: 0.9 * lv.muon * a });
            txt(g, `t = ${f1(Math.max(0, tc - tMin))} µs`, w - 14, 24, { mono: true, color: th.fg, align: 'right', alpha: 0.9 * lv.muon * a });
          }
          if (lv.col > 0.01) {
            // colour bar: arrival time
            const bx = w - 150;
            const by = h - 40;
            for (let i = 0; i < 100; i++) {
              g.save();
              g.globalAlpha = lv.col * a;
              g.fillStyle = interpolateViridis(i / 99);
              g.fillRect(bx + i * 1.2, by, 1.4, 8);
              g.restore();
            }
            txt(g, '0', bx, by + 20, { mono: true, color: th.fg, alpha: 0.85 * lv.col * a });
            txt(g, `${f1(spanT)} µs`, bx + 120, by + 20, { mono: true, color: th.fg, align: 'right', alpha: 0.85 * lv.col * a });
            txt(g, L('arrival'), bx, by - 10, { color: th.fg, alpha: 0.85 * lv.col * a });
            if (st === 'timing') txt(g, `t = ${f1(Math.max(0, Math.min(tcl, tMax) - tMin))} µs`, w - 14, 24, { mono: true, color: th.fg, align: 'right', alpha: 0.9 * lv.col * a });
          }
          if (lv.fit > 0.01) {
            const b = lv.fit;
            ring(g, X(first.x), Y(first.d), 7, th.fg, 1, b);
            ring(g, X(last.x), Y(last.d), 7, th.fg, 1, b);
            txt(g, L('first'), X(first.x) + 10, Y(first.d) + 14, { color: th.fg, alpha: b });
            txt(g, L('last'), X(last.x) - 10, Y(last.d) - 12, { color: th.fg, align: 'right', alpha: b });
            const ar = (best.ang * Math.PI) / 180;
            const dx = Math.cos(ar);
            const dd = -Math.sin(ar);
            const px = Q[0] + -dd * best.off;
            const pd = Q[1] + dx * best.off;
            arrow(g, X(px - dx * 0.55), Y(pd - dd * 0.55), X(px + dx * 0.7), Y(pd + dd * 0.7), th.accent, 1.8, b, 9);
            txt(g, `${L('fitDir')} ${f1(best.ang)}°`, narrow ? w - 14 : 14, 26, { mono: false, color: th.accent, align: narrow ? 'right' : 'left', alpha: b });
            // energy bar
            const ex = 14;
            const ey = h - 40;
            g.save();
            g.globalAlpha = b;
            g.strokeStyle = th.fg;
            g.strokeRect(ex, ey, 110, 10);
            g.fillStyle = th.fg;
            g.fillRect(ex, ey, 110 * clamp(aSum / 9000, 0.05, 1), 10);
            g.restore();
            txt(g, L('light'), ex, ey - 10, { color: th.fg, alpha: 0.9 * b });
            txt(g, L('sizeNote'), ex, ey + 24, { color: th.fg, alpha: 0.7 * b });
          }
        }

        // ---------------- Earth as a filter ----------------
        if (lv.earth > 0.01) {
          const a = lv.earth;
          const ys = h * 0.26;
          const bx = w * 0.5;
          const dy = h * 0.46;
          const bw = Math.min(110, w * 0.2);
          const bh = Math.min(70, h * 0.14);
          g.save();
          g.globalAlpha = 0.07 * a;
          g.fillStyle = th.fg;
          g.fillRect(14, ys, w - 28, h - ys - 12);
          g.restore();
          line(g, 14, ys, w - 14, ys, th.fg, 1, 0.6 * a);
          if (!narrow) txt(g, L('surfaceIce'), 18, ys - 10, { color: th.fg, alpha: 0.85 * a });
          g.save();
          g.globalAlpha = 0.9 * a;
          g.strokeStyle = th.accent;
          g.lineWidth = 1.2;
          g.strokeRect(bx - bw / 2, dy, bw, bh);
          g.restore();
          txt(g, L('detector'), bx, dy + bh / 2, { color: th.accent, align: 'center', alpha: a });
          // muons from above: grey, they arrive at the detector
          const k = smooth(0, 1.5, fin ? 9 : ts);
          [-0.08, 0.08, 0.24, 0.4].forEach((u, i) => {
            const x0 = bx + u * w;
            line(g, x0, 28, bx + (u - 0.08) * bw, dy, th.fg, 1, 0.55 * a * k + 0.15 * a, []);
            arrow(g, x0 + (bx + (u - 0.08) * bw - x0) * 0.8, 28 + (dy - 28) * 0.8, bx + (u - 0.08) * bw, dy, th.fg, 1, 0.55 * a, 5);
            void i;
          });
          txt(g, narrow ? L('fromAboveS') : L('fromAbove'), 22, 40, { color: th.fg, alpha: 0.95 * a });
          if (!narrow) txt(g, L('fromAbove2'), 22, 58, { color: th.fg, alpha: 0.7 * a });
          // up-going: a neutrino from far below, its muon reaching the detector
          const nx0 = bx + w * 0.3;
          const ny0 = h - 18;
          const vx = bx + bw * 0.25;
          const vy = dy + bh + 60;
          line(g, nx0, ny0, vx, vy, th.fg, 1, 0.7 * a, [5, 4]);
          line(g, vx, vy, bx + bw * 0.1, dy + bh, th.accent, 1.8, a);
          dot(g, vx, vy, 2.5, th.fg, a);
          txt(g, narrow ? L('nuThroughS') : L('nuThrough'), (nx0 + vx) / 2 + 14, (ny0 + vy) / 2 + 12, { color: th.fg, alpha: 0.9 * a });
          txt(g, narrow ? L('upMuonS') : L('upMuon'), vx + 12, vy - 4, { color: th.accent, alpha: a });
          // a cosmic-ray muon from the other side: stopped in the Earth
          const sx0 = bx - w * 0.3;
          const sy0 = h - 18;
          const sx1 = bx - w * 0.12;
          const sy1 = h - 18 - (h - dy - bh) * 0.5;
          line(g, sx0, sy0, sx1, sy1, th.fg, 1, 0.6 * a);
          line(g, sx1 - 4, sy1 - 4, sx1 + 4, sy1 + 4, th.fg, 1.2, a);
          line(g, sx1 - 4, sy1 + 4, sx1 + 4, sy1 - 4, th.fg, 1.2, a);
          txt(g, narrow ? L('stoppedS') : L('stopped'), sx1 - 10, sy1 - 14, { color: th.fg, align: 'right', alpha: 0.9 * a });
          txt(g, L('earth'), 22, h - 30, { color: th.fg, alpha: 0.7 * a });
          void glow;
          void mu;
        }
      },
    });
  },
};
export default mod;

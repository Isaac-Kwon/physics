/**
 * det.walkthrough-muon — P9 Detection Walkthrough: a drift-tube muon spectrometer (ATLAS-MDT-like).
 * Top strip: the (r, z) bending plane, r horizontal (0 to 11 m), calorimeters at 1.5-4.3 m, three chamber stations at 5, 7.5, 10 m inside a toroidal
 * field (azimuthal, so perpendicular to this plane, drawn as crosses). The track is the exact parabola y = tan(phi) x - kappa x^2 with
 * kappa = 0.3 B / (2 p), B = 0.5 T (average over the path), p = 20 GeV/c; the sagitta s = 0.3 B L^2 / (8 p) = 23 mm for L = 5 m is computed.
 * Tube close-up: radius 15 mm, drift velocity DET.DRIFT_VELOCITY_MDT_CM_US (~2 cm/us, Ar/CO2 MDT gas), drift time t = r / v_d from the geometry.
 * Chamber: four staggered layers of 30 mm tubes; drift circles have radius d_i = distance of the true track to wire i (no smearing drawn).
 * Simplifications: constant drift velocity (real: nonlinear, ATLAS MDT max drift time ~700 ns), straight chamber segment, no delta rays.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, mulberry32 } from '../shared/canvas2d';
import { DET } from '../../data/detectors';
import { arrow, dot, line, rect, ring, txt, fieldSymbol } from '../common/_draw';
import { makeClock, stepLevels, type Lv } from './_d2-common';

const STATES = ['goal', 'drift-tube', 'circles', 'fit', 'muon-trick'] as const;
type St = (typeof STATES)[number];
const VD = (DET.DRIFT_VELOCITY_MDT_CM_US.value as number) * 10; // cm/µs → mm/µs (2 cm/µs = 20 mm/µs)
const VD_MM_NS = VD / 1000;
const SIGMA_TUBE_UM = DET.SPATIAL_RES_DRIFT_TUBE_UM.value as number;
const B_T = 0.5;
const P_GEV = 20;
const KAPPA = (0.3 * B_T) / (2 * P_GEV); // 1/m
const STATIONS = [5, 7.5, 10];
const R_TUBE = 15; // mm
const PITCH_Y = R_TUBE * 2 * Math.sqrt(3) / 2; // staggered layers
const NL = 4;
const NT = 6;
const SAG = KAPPA * 2.5 * 2.5 * 1000; // mm, middle station relative to the chord
const L_CH = 5;

const TARGET: Record<St, Lv> = {
  goal: { zoom: 0, fit: 0, tube: 0, cham: 0, trick: 0, line: 0 },
  'drift-tube': { zoom: 1, fit: 0, tube: 1, cham: 0, trick: 0, line: 0 },
  circles: { zoom: 1, fit: 0, tube: 0, cham: 1, trick: 0, line: 0 },
  fit: { zoom: 1, fit: 1, tube: 0, cham: 1, trick: 0, line: 1 },
  'muon-trick': { zoom: 0, fit: 0, tube: 0, cham: 0, trick: 1, line: 0 },
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number, d = 1) => ctx.formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d });
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const clk = makeClock(ctx);
    const rnd = mulberry32(5);
    const lv: Lv = { ...TARGET.goal };
    let tgt: Lv = { ...TARGET.goal };
    let state: St = 'goal';

    // --- tube close-up: track chord at impact parameter b, ionization clusters along it
    const B_IMP = 9; // mm
    const TILT = 0.2; // rad
    const clusters = (() => {
      const out: { x: number; y: number; r: number }[] = [];
      // chord: points P(s) = b * n + s * u, u = direction, n = normal; keep inside the tube
      const ux = Math.cos(TILT);
      const uy = Math.sin(TILT);
      const nx = -uy;
      const ny = ux;
      const half = Math.sqrt(R_TUBE * R_TUBE - B_IMP * B_IMP);
      const n = 9;
      for (let i = 0; i < n; i++) {
        const s = -half + ((i + 0.5 + 0.3 * (rnd() - 0.5)) * 2 * half) / n;
        const x = B_IMP * nx + s * ux;
        const y = B_IMP * ny + s * uy;
        out.push({ x, y, r: Math.hypot(x, y) });
      }
      return { pts: out, u: [ux, uy], n: [nx, ny], half };
    })();

    // --- chamber: wires, true track, hit tubes
    const wires: { x: number; y: number; layer: number }[] = [];
    for (let l = 0; l < NL; l++) for (let k = 0; k < NT; k++) wires.push({ x: (k + (l % 2 ? 1 : 0.5)) * 2 * R_TUBE, y: l * PITCH_Y + R_TUBE, layer: l });
    // track: line through (x0, 0) with direction angle ang from the layer normal (x = x0 + tan(ang) * y)
    const ANG = 0.14;
    const X0 = 3.1 * R_TUBE * 2 - 4;
    const distTo = (w: { x: number; y: number }) => Math.abs((w.x - X0) * Math.cos(ANG) - w.y * Math.sin(ANG)); // distance of wire to the track line
    const hits = wires.map((w) => ({ ...w, d: distTo(w) })).filter((w) => w.d < R_TUBE - 0.5);

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      stepLevels(lv, tgt, s.dt, 0.45);
      const wide = w >= 640 && w > h * 1.15;
      const narrow = w < 560;
      // strip
      const sx = narrow ? 14 : 30;
      const sw = w - sx - (narrow ? 14 : 30);
      const sbs = wide || h < w * 0.9;
      const stripH = Math.max(narrow ? 84 : 120, h * (0.62 - (narrow && sbs ? 0.3 : 0.32) * lv.zoom + 0.1 * lv.fit));
      const sy = 10 + (1 - lv.zoom) * Math.max(0, (h - stripH - 20) / 2 - 10);
      const yc = sy + stripH / 2;
      const kx = sw / 11.2;
      const X = (m: number) => sx + m * kx;
      const cmp = narrow || kx < 62;
      const modeA = 1 - lv.fit;
      const modeB = lv.fit;

      // ---- mode A: true-aspect strip ----
      if (modeA > 0.02) {
        const Y = (m: number) => yc - m * kx;
        const hh = Math.min(1.25, (stripH / 2 - 26) / kx);
        g.save();
        g.globalAlpha = modeA;
        // calorimeters
        [
          [1.5, 2.0, 'ecal'],
          [2.3, 4.3, 'hcal'],
        ].forEach(([a, b, key]) => {
          rect(g, X(a as number), Y(hh), ((b as number) - (a as number)) * kx, 2 * hh * kx, th.fg, 1, 0.5, 0.08);
          txt(g, L((cmp ? key + 'S' : key) as string), X(((a as number) + (b as number)) / 2), Y(hh) - 10, { color: th.fg, align: 'center', alpha: 0.75 });
        });
        // toroid field region
        for (let m = 4.7; m < 10.8; m += 0.75)
          for (let y = -hh + 0.35; y < hh; y += 0.7) fieldSymbol(g, X(m), Y(y), false, th.fg, 0.28, 3.2);
        if (!cmp) txt(g, L('field'), X(7.6), Y(hh) - 10, { color: th.fg, align: 'center', alpha: 0.6 });
        // stations
        STATIONS.forEach((m, i) => {
          rect(g, X(m) - 0.12 * kx, Y(hh), 0.24 * kx, 2 * hh * kx, th.accent2, 1.2, 0.9, 0.12);
          txt(g, L((cmp ? 'st' : 'station') + i), X(m), Y(-hh) + 14, { color: th.accent2, align: 'center', alpha: 0.85 });
        });
        // IP and beam axis
        dot(g, X(0), Y(0), 2.5, th.fg, 0.9);
        txt(g, L('ip'), X(0) + 4, Y(0) - 14, { color: th.fg, alpha: 0.7 });
        if (!cmp) txt(g, L('radius'), X(11.1), Y(-hh) + 14, { color: th.fg, align: 'right', alpha: 0.6 });
        // scale ticks (metres)
        for (let m = 0; m <= 10; m += 2) txt(g, String(m), X(m), Y(-hh) + 30, { mono: true, color: th.fg, align: 'center', alpha: 0.5 });
        // muon track (parabola in the field region, straight elsewhere), phi = 0.05
        const prog = state === 'goal' ? clk.p(0.1, 1.4) : 1;
        const trk = (m: number) => 0.05 * m - (m > 4.5 ? KAPPA * (m - 4.5) * (m - 4.5) : 0);
        g.save();
        g.beginPath();
        g.strokeStyle = th.accent;
        g.lineWidth = 1.6;
        const mEnd = 10.6 * prog;
        for (let m = 0; m <= mEnd; m += 0.05) (m === 0 ? g.moveTo(X(m), Y(trk(m))) : g.lineTo(X(m), Y(trk(m))));
        g.stroke();
        g.restore();
        if (state === 'goal') arrow(g, X(0.05) - 22, Y(0.0), X(0.05) - 2, Y(0), th.accent, 1.6, 1, 6);
        if (state === 'goal') txt(g, L('muon'), X(0.05), Y(0.45), { color: th.accent, alpha: 1 });
        // other particles stopping in the absorber
        if (lv.trick > 0.02) {
          const others: [string, number, number, boolean][] = [
            ['e', 0.35, 1.8, false],
            ['γ', -0.35, 1.8, true],
            [L('hadron'), 0.14, 3.4, false],
          ];
          others.forEach(([nm, ph, rs, dash]) => {
            const q = clk.p(0.2, 1.0);
            const x1 = rs * q;
            g.save();
            g.strokeStyle = th.accent2;
            g.globalAlpha = 0.95 * lv.trick;
            g.lineWidth = 1.3;
            g.setLineDash(dash ? [4, 3] : []);
            g.beginPath();
            g.moveTo(X(0), Y(0));
            g.lineTo(X(x1), Y(ph * x1));
            g.stroke();
            g.restore();
            if (q > 0.98) {
              const ex = X(rs);
              const ey = Y(ph * rs);
              line(g, ex - 4, ey - 4, ex + 4, ey + 4, th.accent2, 1.5, lv.trick);
              line(g, ex - 4, ey + 4, ex + 4, ey - 4, th.accent2, 1.5, lv.trick);
              txt(g, nm, ex + 8, ey + (ph < 0 ? 12 : -10), { color: th.accent2, alpha: lv.trick });
            }
          });
          // hits of the muon in the stations
          STATIONS.forEach((m) => dot(g, X(m), Y(trk(m)), 3, th.accent, lv.trick * clk.p(1.0, 0.5)));
          txt(g, L('only'), X(10.8), Y(-hh) + (cmp ? 62 : 50), { color: th.accent, align: 'right', alpha: lv.trick });
          txt(g, L('stopped'), X(0), Y(-hh) + (narrow ? 44 : 50), { color: th.accent2, alpha: 0.9 * lv.trick });
        }
        g.restore();
      }

      // ---- mode B: sagitta view (x 4.5 to 10.5 m, y' in mm relative to the chord inner-outer) ----
      if (modeB > 0.02) {
        g.save();
        g.globalAlpha = modeB;
        const x0 = 4.4;
        const x1 = 10.6;
        const XB = (m: number) => sx + ((m - x0) / (x1 - x0)) * sw;
        const ymm = Math.max(36, SAG * 1.5);
        const kyB = stripH / 2 / ymm; // px per mm
        const YB = (mm: number) => yc - mm * kyB;
        const yp = (m: number) => KAPPA * (m - 5) * (10 - m) * 1000; // mm above the chord
        STATIONS.forEach((m, i) => {
          rect(g, XB(m) - 0.12 * (sw / (x1 - x0)), sy, 0.24 * (sw / (x1 - x0)), stripH, th.accent2, 1.2, 0.8, 0.1);
          txt(g, L((cmp ? 'st' : 'station') + i), XB(m), sy + stripH + 14, { color: th.accent2, align: 'center', alpha: 0.85 });
        });
        line(g, XB(5), YB(0), XB(10), YB(0), th.fg, 1, 0.6, [4, 4]);
        txt(g, L('chord'), XB(6.2), YB(0) + 14, { color: th.fg, align: 'center', alpha: 0.7 });
        // track
        g.strokeStyle = th.accent;
        g.lineWidth = 1.5;
        g.beginPath();
        const grow = clk.p(0.1, 1.2);
        for (let m = 4.7; m <= 4.7 + 5.6 * grow; m += 0.04) (m <= 4.71 ? g.moveTo(XB(m), YB(yp(m))) : g.lineTo(XB(m), YB(yp(m))));
        g.stroke();
        // station segments: tangent lines (slope from the track), station points
        STATIONS.forEach((m) => {
          const sl = KAPPA * (15 - 2 * m) * 1000 * 0.001 * 1000 / 1000; // d y'/dx in mm per m
          const half = 0.3;
          line(g, XB(m - half), YB(yp(m) - (KAPPA * (15 - 2 * m) * 1000) * half), XB(m + half), YB(yp(m) + (KAPPA * (15 - 2 * m) * 1000) * half), th.fg, 2, 0.95);
          dot(g, XB(m), YB(yp(m)), 3.5, th.accent, 1);
          void sl;
        });
        // sagitta
        const xs = XB(7.5);
        arrow(g, xs + 16, YB(0), xs + 16, YB(SAG) + 2, th.accent2, 1.2, clk.p(1.2, 0.5), 6);
        arrow(g, xs + 16, YB(SAG), xs + 16, YB(0) - 2, th.accent2, 1.2, clk.p(1.2, 0.5), 6);
        txt(g, `s = ${f1(SAG, 0)} mm`, xs + 26, YB(SAG / 2), { mono: true, color: th.accent2, alpha: clk.p(1.2, 0.5) });
        // y ticks
        [0, 20].forEach((v) => {
          line(g, sx - 4, YB(v), sx, YB(v), th.fg, 1, 0.5);
          txt(g, `${v}`, sx - 8, YB(v), { mono: true, color: th.fg, align: 'right', alpha: 0.6 });
        });
        txt(g, 'mm', sx - 8, YB(34), { mono: true, color: th.fg, align: 'right', alpha: 0.6 });
        const exag = (kyB * 1000) / kx;
        txt(g, `${L('vscale')} ×${f0(exag)}`, sx + 34, sy + 12, { mono: true, color: th.fg, alpha: 0.6 });
        g.restore();
      }

      // ---- zoom row ----
      const zy = sy + stripH + (narrow ? 40 : 48);
      const zh = h - zy - 8;
      if (lv.zoom > 0.02 && zh > 60) {
        const a = lv.zoom;
        const colA = sbs ? { x: 14, y: zy, w: w * 0.5 - 24, h: zh } : { x: 14, y: zy, w: w - 28, h: zh * 0.58 };
        const colB = sbs ? { x: w * 0.5 + 8, y: zy, w: w * 0.5 - 20, h: zh } : { x: 14, y: zy + zh * 0.6, w: w - 28, h: zh * 0.4 };
        // zoom marker line from the strip to the panel
        txt(g, L((state === 'drift-tube' ? 'oneTube' : 'chamber') + (narrow ? 'S' : '')), colA.x, zy - 10, { color: th.fg, alpha: 0.7 * a });

        // tube close-up
        if (lv.tube > 0.02) {
          const kt = Math.min(colA.h - 20, colA.w) / (2 * R_TUBE + 4);
          const tcx = colA.x + colA.w / 2;
          const tcy = colA.y + colA.h / 2;
          const T = (x: number, y: number): [number, number] => [tcx + x * kt, tcy - y * kt];
          ring(g, tcx, tcy, R_TUBE * kt, th.fg, 1.4, 0.9 * lv.tube);
          dot(g, tcx, tcy, 2.5, th.accent2, lv.tube);
          txt(g, L('wire'), tcx + 8, tcy - 6, { color: th.accent2, alpha: lv.tube });
          if (!narrow) txt(g, L('gasTube'), tcx - R_TUBE * kt + 6, tcy - R_TUBE * kt + 14, { color: th.fg, alpha: 0.6 * lv.tube });
          // muon chord
          const [ux, uy] = clusters.u;
          const hlf = clusters.half;
          const nx = clusters.n[0];
          const ny = clusters.n[1];
          const [p0x, p0y] = T(B_IMP * nx - (hlf + 4) * ux, B_IMP * ny - (hlf + 4) * uy);
          const [p1x, p1y] = T(B_IMP * nx + (hlf + 4) * ux, B_IMP * ny + (hlf + 4) * uy);
          arrow(g, p0x, p0y, p1x, p1y, th.accent, 1.6, lv.tube, 7);
          txt(g, L('muon'), p0x - 4, p0y - 12, { color: th.accent, align: 'left', alpha: lv.tube });
          // drift time axis: display 100 ns per second
          const tn = state === 'drift-tube' ? Math.min(1.1 * (B_IMP / VD_MM_NS) , clk.t * 100 - 0) : 0;
          const tFirst = B_IMP / VD_MM_NS;
          const tNow = ctx.reducedMotion ? tFirst * 1.1 : Math.max(0, clk.t * 250 - 20);
          void tn;
          clusters.pts.forEach((cl, i) => {
            const first = Math.abs(cl.r - B_IMP) < 1e-6 || cl.r === Math.min(...clusters.pts.map((q) => q.r));
            // electron drifts radially toward the wire, speed VD
            const rNow = Math.max(0.5, cl.r - VD_MM_NS * tNow);
            const f = rNow / cl.r;
            const [ex, ey] = T(cl.x * f, cl.y * f);
            const [cx0, cy0] = T(cl.x, cl.y);
            if (rNow > 0.5) line(g, cx0, cy0, tcx, tcy, th.fg, 1, 0.12 * lv.tube);
            dot(g, cx0, cy0, 1.6, th.fg, 0.35 * lv.tube);
            const arrived = rNow <= 0.5;
            dot(g, ex, ey, first ? 3.2 : 2.2, first ? th.accent : th.fg, (arrived ? (first ? 1 : 0.15) : 0.95) * lv.tube);
            void i;
          });
          // distance of closest approach
          const [bx, by] = T(B_IMP * nx, B_IMP * ny);
          line(g, tcx, tcy, bx, by, th.accent, 1, 0.8 * lv.tube, [3, 3]);
          txt(g, narrow ? `r = ${f1(B_IMP, 1)} mm` : `r = v_d · t = ${f1(B_IMP, 1)} mm`, narrow ? tcx : (tcx + bx) / 2 + 12, narrow ? tcy + R_TUBE * kt * 0.55 : (tcy + by) / 2 + 8, { mono: true, color: th.accent, align: narrow ? 'center' : 'left', alpha: lv.tube });
          // stopwatch (colB)
          const tmax = 800; // ≥ R_TUBE / v_d (15 mm at 2 cm/µs = 750 ns)
          const bx0 = colB.x + 4;
          const bx1 = colB.x + colB.w - 8;
          const by0 = colB.y + colB.h * 0.4;
          const TX = (t: number) => bx0 + ((bx1 - bx0) * t) / tmax;
          line(g, bx0, by0, bx1, by0, th.fg, 1, 0.5 * lv.tube);
          for (let t = 0; t <= tmax; t += 200) {
            line(g, TX(t), by0, TX(t), by0 + 4, th.fg, 1, 0.5 * lv.tube);
            txt(g, String(t), TX(t), by0 + 16, { mono: true, color: th.fg, align: 'center', alpha: 0.6 * lv.tube });
          }
          txt(g, 'ns', bx1, by0 + 32, { mono: true, color: th.fg, align: 'right', alpha: 0.7 * lv.tube });
          line(g, TX(0), by0 - 22, TX(0), by0, th.fg, 1.5, lv.tube);
          txt(g, L(narrow ? 'crossS' : 'cross'), TX(0), by0 - 32, { color: th.fg, alpha: lv.tube });
          const arr = tNow >= tFirst;
          if (arr) {
            line(g, TX(tFirst), by0 - 22, TX(tFirst), by0, th.accent, 2, lv.tube);
            arrow(g, TX(0) + 2, by0 - 11, TX(tFirst) - 2, by0 - 11, th.accent, 1.2, lv.tube, 6);
            txt(g, L(narrow ? 'arriveS' : 'arrive'), TX(tFirst) + 4, by0 - 32, { color: th.accent, align: narrow ? 'left' : 'center', alpha: lv.tube });
            txt(g, `t = ${f0(tFirst)} ns`, TX(tFirst / 2), by0 - 46, { mono: true, color: th.accent, align: 'center', alpha: lv.tube });
          }
          txt(g, `v_d = ${f1(VD_MM_NS * 1000, 0)} μm/ns`, bx0, by0 + 58, { mono: true, color: th.fg, alpha: 0.85 * lv.tube });
          if (!narrow) txt(g, L('nearest'), bx0, by0 + 78, { color: th.fg, alpha: 0.8 * lv.tube });
        }

        // chamber with drift circles
        if (lv.cham > 0.02) {
          const wmm = NT * 2 * R_TUBE + R_TUBE;
          const hmm = NL * PITCH_Y + R_TUBE;
          const kc = Math.min((colA.w - 10) / wmm, (colA.h - 8) / hmm);
          const ox0 = colA.x + (colA.w - wmm * kc) / 2;
          const oyb = colA.y + (colA.h + hmm * kc) / 2; // bottom
          const C = (x: number, y: number): [number, number] => [ox0 + x * kc, oyb - y * kc];
          wires.forEach((wr) => {
            const hit = hits.find((q) => q.x === wr.x && q.y === wr.y);
            const [px, py] = C(wr.x, wr.y);
            ring(g, px, py, R_TUBE * kc, hit ? th.fg : th.fg, 1, (hit ? 0.55 : 0.2) * lv.cham);
            dot(g, px, py, 1.6, th.fg, 0.7 * lv.cham);
          });
          const grow = clk.p(0.2, 0.9);
          hits.forEach((q) => {
            const [px, py] = C(q.x, q.y);
            ring(g, px, py, q.d * kc * grow, th.accent, 1.4, lv.cham);
          });
          if (lv.line > 0.02) {
            const y0 = -4;
            const y1 = NL * PITCH_Y + R_TUBE;
            const [ax, ay] = C(X0 + Math.tan(ANG) * y0, y0);
            const [bx, by] = C(X0 + Math.tan(ANG) * y1, y1);
            line(g, ax, ay, bx, by, th.accent2, 1.5, lv.line * clk.p(0.3, 0.8));
            txt(g, L('tangent'), bx + 8, by + 4, { color: th.accent2, alpha: lv.line });
          }
          // readout table (colB)
          const tx = colB.x + 6;
          let ty = colB.y + 16;
          if (state === 'circles') {
            txt(g, L('tcols'), tx, ty, { color: th.fg, alpha: 0.65 });
            ty += 22;
            hits.slice(0, Math.min(hits.length, Math.max(3, Math.floor((colB.h - 40) / 20)))).forEach((q) => {
              txt(g, narrow ? `${q.layer + 1}:  ${f0(q.d / VD_MM_NS)} ns → ${f1(q.d, 1)} mm` : `${L('layer')} ${q.layer + 1}:  t = ${f0(q.d / VD_MM_NS)} ns   →   r = ${f1(q.d, 1)} mm`, tx, ty, { mono: true, color: th.fg, alpha: 0.9 });
              ty += 20;
            });
            if (!narrow) txt(g, L('ambig'), tx, ty + 8, { color: th.fg, alpha: 0.75 });
          } else {
            txt(g, 's = 0.3 B L² / (8 p)', tx, ty, { mono: true, color: th.fg, alpha: 0.9 });
            txt(g, narrow ? `s = ${f0(SAG)} mm  (${f1(B_T, 1)} T, ${f0(L_CH)} m, ${f0(P_GEV)} GeV/c)` : `B = ${f1(B_T, 1)} T,  L = ${f0(L_CH)} m,  p = ${f0(P_GEV)} GeV/c  →  s = ${f0(SAG)} mm`, tx, ty + 22, { mono: true, color: th.accent2, alpha: 0.95 });
            txt(g, narrow ? `σ ≈ ${f0(SIGMA_TUBE_UM)} μm ≈ ${f1(((SIGMA_TUBE_UM / 1000) / SAG) * 100, 1)} % ${L('ofs')}` : `${L('tube')} ≈ ${f0(SIGMA_TUBE_UM)} μm ≈ ${f1(((SIGMA_TUBE_UM / 1000) / SAG) * 100, 1)} % ${L('ofs')}`, tx, ty + 44, { mono: true, color: th.fg, alpha: 0.85 });
          }
        }
      }
    });
    c.animate = true;
    void ring;

    return {
      setState(st: string, o: SetStateOptions) {
        state = (STATES as readonly string[]).includes(st) ? (st as St) : 'goal';
        tgt = { ...TARGET[state] };
        clk.reset();
        if (o.immediate || ctx.reducedMotion) {
          Object.assign(lv, TARGET[state]);
          clk.finish();
        }
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

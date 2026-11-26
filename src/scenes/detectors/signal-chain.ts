/**
 * det.signal-chain — from a trace in matter to an electrical signal.
 *  charge: gas tube (a 3 cm tube, 100 pairs/cm; electrons drift at constant speed to the wire, avalanche gain 10⁴) and a 50 µm silicon wafer
 *    (80 pairs/µm, 3.6 eV per pair, electrons ≈ 3× faster than holes); collected charge on a log axis.
 *  scintillation: flash → light guide → PMT (10 dynodes × gain 4 = 4¹⁰ ≈ 10⁶) and a SiPM (cells that fire on one photon).
 *  cherenkov: same radiator/air-gap/sensor-plane geometry as det.matter-block, plus the ring fit and the way back to β.
 *  timing: time of flight π vs K at 2 GeV/c over 1 m (Δt = 92 ps) against a 30 ps resolution; light travels 3 mm in 10 ps.
 */
import type { SceneModule } from '../shared/types';
import { clamp, mulberry32, smooth } from '../shared/canvas2d';
import { betaOf } from '../../components/widgets/_physics';
import { DET } from '../../data/detectors';
import { arrow, createStage, dot, glow, hash01, line, makeLayer, para, rgba, txt, type Env, type G, type Rect } from './_d1-common';
import { makeB } from './_d1-matter-b';

const STATES = ['charge', 'scintillation', 'cherenkov', 'timing'] as const;
type P = Record<(typeof STATES)[number], number>;
const TARGETS = Object.fromEntries(STATES.map((s) => [s, Object.fromEntries(STATES.map((t) => [t, t === s ? 1 : 0]))])) as Record<string, P>;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const { accent, accent2, fg } = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const B = makeB(ctx);
    const layers = STATES.map(() => makeLayer());
    const prog = (e: Env, d: number) => (e.reduced ? 1 : clamp(e.ts / d));
    const sci = (v: number) => `${ctx.formatNumber(v / 10 ** Math.floor(Math.log10(v)), { maximumSignificantDigits: 2 })} × 10${'⁰¹²³⁴⁵⁶⁷⁸⁹'[Math.floor(Math.log10(v))] ?? ''}`;

    // ------------------------------------------------------------------ charge
    const PAIRS_CM = DET.PAIRS_PER_CM_GAS.value as number;
    const PAIRS_UM = DET.PAIRS_PER_UM_SILICON.value as number;
    const W_SI = DET.W_SILICON_EV.value as number;
    const TUBE_R_CM = 1.5;
    const OFF_CM = 0.7;
    const CHORD_CM = 2 * Math.sqrt(TUBE_R_CM ** 2 - OFF_CM ** 2);
    const N_GAS = Math.round((PAIRS_CM * CHORD_CM) / 10) * 10;
    const GAIN = 1e4;
    const SI_UM = 50;
    const TILT = 0.44;
    const N_SI = Math.round((PAIRS_UM * SI_UM) / Math.cos(TILT) / 100) * 100;
    const charge = (g: G, A: Rect, e: Env) => {
      const wide = A.w >= 560 && A.w > A.h * 1.1;
      const cell = (i: number): Rect => (wide ? { x: A.x + (A.w * [0, 0.34, 0.7][i]), y: A.y, w: A.w * [0.34, 0.36, 0.3][i], h: A.h } : { x: A.x, y: A.y + A.h * [0, 0.36, 0.7][i], w: A.w, h: A.h * [0.36, 0.34, 0.3][i] });
      const ph = e.reduced ? 0.55 : (e.t % 4) / 4;
      // ---- gas tube (end view)
      {
        const c = cell(0);
        const R = Math.max(30, Math.min(c.w * 0.4, (c.h - 70) * (wide ? 0.5 : 0.5)));
        const cx = c.x + c.w / 2;
        const cy = c.y + 34 + R + (wide ? 18 : 0);
        txt(g, L('gasTitle'), c.x + 12, c.y + 16, { bold: true, alpha: 0.95 });
        g.strokeStyle = rgba(fg, 0.55);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx, cy, R, 0, Math.PI * 2);
        g.stroke();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          line(g, cx + Math.cos(a) * R * 0.14, cy + Math.sin(a) * R * 0.14, cx + Math.cos(a) * R, cy + Math.sin(a) * R, fg, 0.1, 1);
        }
        dot(g, cx, cy, 2.6, fg, 0.95);
        txt(g, L('wire'), cx + 8, cy + 14, { alpha: 0.8 });
        // track chord and ionization clusters, 1 dot = 10 electrons
        const dOff = (OFF_CM / TUBE_R_CM) * R;
        const half = Math.sqrt(R * R - dOff * dOff);
        const yTr = cy - dOff;
        const k0 = clamp(ph / 0.08);
        line(g, cx - half - 10, yTr, cx - half - 10 + (2 * half + 20) * k0, yTr, accent, 0.7, 1.25);
        const nD = N_GAS / 10;
        const vDrift = 0.55; // R per second (constant drift speed)
        const arrived: number[] = [];
        let nArr = 0;
        for (let i = 0; i < nD; i++) {
          const x = -half + ((i + 0.5 + (hash01(i + 5) - 0.5) * 0.7) / nD) * 2 * half;
          const y = -dOff;
          const r0 = Math.hypot(x, y);
          const ang = Math.atan2(y, x);
          const tDrift = Math.max(0, ph * 4 - 0.35);
          const r = r0 - vDrift * R * tDrift;
          if (x + half > 2 * half * k0) continue;
          const px = cx + Math.cos(ang) * Math.max(r, 0);
          const py = cy + Math.sin(ang) * Math.max(r, 0);
          if (r > R * 0.1) {
            dot(g, px, py, 1.5, accent, 0.95);
            if (tDrift > 0) {
              g.strokeStyle = rgba(fg, 0.55);
              g.lineWidth = 1;
              g.beginPath();
              g.arc(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, 1.5, 0, Math.PI * 2);
              g.stroke();
            }
          } else {
            nArr++;
            arrived.push(i);
          }
        }
        // avalanche: each arriving electron multiplies in the strong field near the wire
        if (nArr > 0) {
          const nA = Math.min(160, nArr * 14);
          g.save();
          g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < nA; i++) {
            const a = hash01(i * 3 + 1) * Math.PI * 2;
            const rr = R * 0.12 * Math.sqrt(hash01(i * 3 + 2));
            dot(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.1, accent2, 0.75);
          }
          g.restore();
          txt(g, `${L('avalanche')} ×${sci(GAIN).replace(' × 10', '·10')}`, cx + R * 0.2, cy - R * 0.38, { alpha: 0.8, color: accent2 });
        }
        txt(g, `${L('trackNote')}  ·  1 ${L('dot')} = 10 e⁻`, c.x + 12, c.y + c.h - 8, { alpha: 0.7 });
        txt(g, `${L('drift')} ≈ ${ctx.formatNumber(DET.DRIFT_VELOCITY_GAS_CM_US.value as number)} cm/µs`, c.x + 12, cy + R + 16, { mono: true, alpha: 0.7 });
      }
      // ---- silicon wafer (side view)
      {
        const c = cell(1);
        txt(g, L('siTitle'), c.x + 12, c.y + 16, { bold: true, alpha: 0.95 });
        const wx = c.x + 24;
        const ww = c.w - 48;
        const wh = Math.min(c.h * 0.46, ww * 0.55);
        const wy = c.y + (c.h - wh) / 2 + 6;
        g.fillStyle = rgba(fg, 0.07);
        g.fillRect(wx, wy, ww, wh);
        g.strokeStyle = rgba(fg, 0.45);
        g.lineWidth = 1;
        g.strokeRect(wx, wy, ww, wh);
        line(g, wx, wy - 3, wx + ww, wy - 3, fg, 0.85, 2);
        line(g, wx, wy + wh + 3, wx + ww, wy + wh + 3, fg, 0.85, 2);
        txt(g, '+', wx + ww + 8, wy - 3, { mono: true, alpha: 0.85 });
        txt(g, '−', wx + ww + 8, wy + wh + 3, { mono: true, alpha: 0.85 });
        // 50 µm dimension
        line(g, wx - 12, wy, wx - 12, wy + wh, fg, 0.7, 1);
        txt(g, `${SI_UM} µm`, wx - 6, wy + wh + 18, { mono: true, align: 'right', alpha: 0.75 });
        const k0 = clamp(ph / 0.1);
        const x0 = wx + ww * 0.3;
        const dxT = Math.tan(TILT) * wh;
        line(g, x0 - 6 * Math.sin(TILT), wy - 6, x0 + dxT * k0, wy + wh * k0, accent, 0.7, 1.25);
        const nD = N_SI / 100;
        const tD = clamp((ph * 4 - 0.35) / 2.4);
        for (let i = 0; i < nD; i++) {
          const f = (i + 0.5) / nD;
          if (f > k0) continue;
          const px = x0 + dxT * f;
          const py = wy + wh * f;
          const pe = clamp(tD); // electrons: toward + (up)
          const ph2 = clamp(tD * 0.36); // holes ≈ 2.8× slower
          dot(g, px, py - pe * (py - wy), 1.5, accent, 0.95);
          g.strokeStyle = rgba(fg, 0.85);
          g.lineWidth = 1;
          g.beginPath();
          g.arc(px, py + ph2 * (wy + wh - py), 1.6, 0, Math.PI * 2);
          g.stroke();
        }
        arrow(g, wx + ww * 0.82, wy + wh * 0.75, wx + ww * 0.82, wy + wh * 0.2, { color: accent, alpha: 0.8, head: 6 });
        txt(g, 'e⁻', wx + ww * 0.82 + 8, wy + wh * 0.3, { alpha: 0.85, color: accent });
        arrow(g, wx + ww * 0.92, wy + wh * 0.25, wx + ww * 0.92, wy + wh * 0.8, { color: fg, alpha: 0.7, head: 6 });
        txt(g, 'h⁺', wx + ww * 0.92 + 8, wy + wh * 0.72, { alpha: 0.8 });
        para(g, `${PAIRS_UM} ${L('pairsPerUm')}, ${ctx.formatNumber(W_SI, { minimumFractionDigits: 1 })} eV ${L('perPair')}`, c.x + 12, c.y + c.h - 24, c.w - 20, { alpha: 0.7, lh: 14 });
        txt(g, `1 ${L('dot')} = 100 ${L('pairs')}`, c.x + 12, c.y + c.h - 8, { alpha: 0.7 });
      }
      // ---- collected charge on a log axis
      {
        const c = cell(2);
        txt(g, L('chargeTitle'), c.x + 12, c.y + 16, { bold: true, alpha: 0.95 });
        const bx = c.x + 14;
        const bw = c.w - 28;
        const lo = 1;
        const hi = 7;
        const X = (n: number) => bx + ((Math.log10(n) - lo) / (hi - lo)) * bw;
        const rows = [
          { n: N_GAS, key: 'barGasPrimary', col: rgba(fg, 0.6) },
          { n: N_SI, key: 'barSilicon', col: rgba(accent, 0.75) },
          { n: N_GAS * GAIN, key: 'barGasAmp', col: rgba(accent2, 0.75) },
        ];
        const y0 = c.y + 44;
        const rh = Math.min(52, (c.h - 86) / 3);
        const grow = smooth(0.0, 0.6, ph * 2);
        rows.forEach((r, i) => {
          const y = y0 + i * rh;
          txt(g, L(r.key), bx, y, { alpha: 0.85 });
          g.fillStyle = r.col;
          const wBar = (X(r.n) - bx) * (e.reduced ? 1 : Math.min(1, grow + 0.0));
          g.fillRect(bx, y + 8, wBar, 9);
          txt(g, '≈ ' + (r.n >= 1e5 ? sci(r.n) : ctx.formatNumber(r.n, { maximumSignificantDigits: 2 })), bx + bw, y, { mono: true, alpha: 0.9, align: 'right' });
        });
        const ya = y0 + 3 * rh - 6;
        line(g, bx, ya, bx + bw, ya, fg, 0.6, 1);
        for (let p = lo; p <= hi; p += 2) {
          line(g, X(10 ** p), ya, X(10 ** p), ya + 4, fg, 0.6, 1);
          txt(g, '10' + '⁰¹²³⁴⁵⁶⁷⁸⁹'[p], X(10 ** p), ya + 15, { mono: true, align: 'center', alpha: 0.75 });
        }
        txt(g, L('logAxis'), bx + bw, ya + 30, { align: 'right', alpha: 0.65 });
      }
    };

    // ------------------------------------------------------------------ scintillation chain
    const scint = (g: G, A: Rect, e: Env) => {
      const VW = 640;
      const VH = 270;
      const s = Math.min((A.w - 8) / VW, (A.h - 8) / VH);
      const ox = A.x + (A.w - VW * s) / 2;
      const oy = A.y + (A.h - VH * s) / 2;
      const P = (x: number, y: number): [number, number] => [ox + x * s, oy + y * s];
      const small = s < 0.8;
      const ph = e.reduced ? 0.6 : (e.t % 3.4) / 3.4;
      const line2 = (x0: number, y0: number, x1: number, y1: number, a: number, w = 1) => {
        const [a0, b0] = P(x0, y0);
        const [a1, b1] = P(x1, y1);
        line(g, a0, b0, a1, b1, fg, a, w);
      };
      const T = (str: string, x: number, y: number, o: Parameters<typeof txt>[4] = {}) => {
        const [px, py] = P(x, y);
        txt(g, str, px, py, o);
      };
      // crystal
      const [cx0, cy0] = P(22, 52);
      g.strokeStyle = rgba(fg, 0.6);
      g.lineWidth = 1;
      g.strokeRect(cx0, cy0, 92 * s, 88 * s);
      g.fillStyle = rgba(accent, 0.06);
      g.fillRect(cx0, cy0, 92 * s, 88 * s);
      T(L('crystal'), 22, 38, { alpha: 0.9, bold: true });
      // light guide
      g.strokeStyle = rgba(fg, 0.5);
      g.beginPath();
      const poly: [number, number][] = [[114, 52], [178, 82], [178, 110], [114, 140]];
      poly.forEach(([x, y], i) => {
        const [px, py] = P(x, y);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.closePath();
      g.stroke();
      T(L('lightGuide'), 146, 40, { align: 'center', alpha: 0.75 });
      // incoming particle and flash
      const [p0x, p0y] = P(0, 96);
      const [p1x, p1y] = P(22 + 92 * clamp(ph / 0.1), 96);
      line(g, p0x, p0y, p1x, p1y, accent, 0.95, 1.5);
      const flash = smooth(0.08, 0.14, ph) * (1 - smooth(0.2, 0.5, ph));
      const [fx, fy] = P(68, 96);
      glow(g, fx, fy, 46 * s, accent, 0.7 * flash);
      // photons in transit: along the guide to the PMT and down to the SiPM
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const t = clamp((ph - 0.12 - hash01(i) * 0.15) / 0.3);
        if (t <= 0 || t >= 1) continue;
        const [qx, qy] = P(68 + (192 - 68) * t, 96 + (hash01(i + 40) - 0.5) * 36 * (1 - t));
        dot(g, qx, qy, 1.5, accent2, 0.9);
      }
      for (let i = 0; i < 8; i++) {
        const t = clamp((ph - 0.12 - hash01(i + 90) * 0.12) / 0.2);
        if (t <= 0 || t >= 1) continue;
        const [qx, qy] = P(30 + hash01(i + 70) * 70, 140 + (170 - 140) * t);
        dot(g, qx, qy, 1.5, accent2, 0.9);
      }
      g.restore();
      // PMT: photocathode, 10 dynodes (gain 4 each), anode
      const [bx0, by0] = P(178, 64);
      g.strokeStyle = rgba(fg, 0.55);
      g.strokeRect(bx0, by0, 262 * s, 64 * s);
      line2(180, 66, 180, 126, 0.95, 3);
      g.save();
      g.strokeStyle = accent;
      g.lineWidth = 3;
      const [pc0x, pc0y] = P(180, 66);
      const [pc1x, pc1y] = P(180, 126);
      g.beginPath();
      g.moveTo(pc0x, pc0y);
      g.lineTo(pc1x, pc1y);
      g.stroke();
      g.restore();
      T(L('photocathode'), 180, 154, { align: 'left', alpha: 0.8 });
      const nDyn = 10;
      const dyn = (i: number): [number, number, number, number] => {
        const x = 204 + i * 21;
        const top = i % 2 === 0;
        return top ? [x - 6, 70, x + 6, 84] : [x - 6, 122, x + 6, 108];
      };
      for (let i = 0; i < nDyn; i++) {
        const [a0, b0, a1, b1] = dyn(i);
        line2(a0, b0, a1, b1, 0.85, 2);
      }
      const [anx, any] = P(424, 96);
      g.fillStyle = rgba(fg, 0.9);
      g.fillRect(anx - 2, any - 14 * s, 3, 28 * s);
      // electron multiplication: counts 4^i, drawn dots min(count, 7)
      const tE = clamp((ph - 0.3) / 0.45) * (nDyn + 1);
      for (let i = 0; i <= nDyn; i++) {
        if (tE < i) break;
        const cnt = 4 ** i;
        const nd = Math.min(7, cnt);
        const xm = i === 0 ? 184 : 204 + (i - 1) * 21 + 10;
        for (let j = 0; j < nd; j++) dot(g, ...P(xm + (hash01(i * 11 + j) - 0.5) * 6, 96 + (hash01(i * 17 + j) - 0.5) * 30), 1.4, accent, 0.9);
        if (i <= 3 || i === nDyn) {
          const lab = i === 0 ? '1' : i === nDyn ? '≈ 10⁶' : String(cnt);
          T(lab, i === nDyn ? 404 : xm, i % 2 === 0 ? 140 : 56, { mono: true, align: 'center', alpha: 0.9, color: accent });
        }
      }
      T('PMT', 310, 54, { align: 'center', alpha: 0.85, bold: true });
      T(`${L('dynodes')}: 4¹⁰ ≈ 10⁶`, 310, 154, { align: 'center', alpha: 0.75 });
      // SiPM: grid of cells, each fires on one photon
      const cell = 12;
      const gx = 22;
      const gy = 182;
      const nC = 6;
      T(L('sipm'), 22, 174, { alpha: 0.9, bold: true });
      for (let i = 0; i < nC; i++)
        for (let j = 0; j < nC; j++) {
          const [qx, qy] = P(gx + i * cell, gy + 8 + j * cell);
          const fired = ph > 0.3 && hash01(i * 9 + j + 5) < 0.28 * smooth(0.3, 0.45, ph);
          g.strokeStyle = rgba(fg, 0.4);
          g.lineWidth = 1;
          g.strokeRect(qx, qy, (cell - 2) * s, (cell - 2) * s);
          if (fired) {
            g.fillStyle = accent;
            g.fillRect(qx + 1, qy + 1, (cell - 4) * s, (cell - 4) * s);
          }
        }
      if (!small) para(g, L('sipmNote'), ...P(112, 200), 210 * s, { alpha: 0.75, lh: 15 });
      // flow caption
      para(g, L('flow'), ...P(340, 205), (VW - 340) * s, { alpha: 0.8, lh: 16 });
      void arrow;
    };

    // ------------------------------------------------------------------ timing
    const timing = (g: G, A: Rect, e: Env) => {
      const compact = A.h < 420;
      const p = 2.0; // GeV/c
      const D = 100; // cm
      const bPi = betaOf(p, 0.13957);
      const bK = betaOf(p, 0.49368);
      const tPi = D / (bPi * 30);
      const tK = D / (bK * 30);
      const dtPs = (tK - tPi) * 1000;
      const sigma = 30;
      const xa = A.x + 150;
      const xb = A.x + A.w - 70;
      const yTop = A.y + A.h * (compact ? 0.2 : 0.2);
      for (const [x, lab] of [[xa, 'A'], [xb, 'B']] as [number, string][]) {
        line(g, x, yTop - 40, x, yTop + 40, fg, 0.85, 3);
        txt(g, `${L('timingLayer')} ${lab}`, x, yTop - 54, { align: 'center', alpha: 0.85 });
      }
      // 1 m dimension
      const yd = yTop + 54;
      line(g, xa, yd, xb, yd, fg, 0.5, 1);
      txt(g, `${D / 100} m`, (xa + xb) / 2, yd + 12, { mono: true, align: 'center', alpha: 0.75 });
      const u = e.reduced ? 1 : clamp((e.t % 4.5) / 3.2);
      const xPi = xa + (xb - xa) * u;
      const xK = xa + (xb - xa) * u * (tPi / tK);
      line(g, xa, yTop - 9, xPi, yTop - 9, accent, 0.9, 1.25);
      dot(g, xPi, yTop - 9, 3, accent, 1);
      line(g, xa, yTop + 9, xK, yTop + 9, accent2, 0.9, 1.25);
      dot(g, xK, yTop + 9, 3, accent2, 1);
      txt(g, `π  p = ${ctx.formatNumber(p, { minimumFractionDigits: 1 })} GeV/c`, xa - 8, yTop - 9, { align: 'right', alpha: 0.9, color: accent, base: 'middle' });
      txt(g, 'K', xa - 8, yTop + 9, { align: 'right', alpha: 0.9, color: accent2 });
      // time axis: t − t(π), Gaussians of width σ at 0 and Δt
      const ya = A.y + A.h * (compact ? 0.78 : 0.8);
      const hh = A.h * (compact ? 0.26 : 0.3);
      const tx = (t: number) => (xa + xb) / 2 + ((t - dtPs / 2) / 340) * (xb - xa);
      line(g, xa, ya, xb, ya, fg, 0.6, 1);
      for (const t of [-100, 0, 100, 200]) {
        line(g, tx(t), ya, tx(t), ya + 4, fg, 0.6, 1);
        txt(g, ctx.formatNumber(t), tx(t), ya + 15, { mono: true, align: 'center', alpha: 0.75 });
      }
      txt(g, `t − t(π)  (ps)`, xb, ya + 31, { mono: true, align: 'right', alpha: 0.65 });
      const gauss = (t: number, c: number) => Math.exp(-((t - c) ** 2) / (2 * sigma * sigma));
      for (const [c, col] of [[0, accent], [dtPs, accent2]] as [number, string][]) {
        g.fillStyle = rgba(col, 0.2);
        g.strokeStyle = col;
        g.lineWidth = 1.5;
        g.beginPath();
        for (let t = -140; t <= 260; t += 4) {
          const x = tx(t);
          const y = ya - gauss(t, c) * hh;
          t === -140 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
        g.lineTo(tx(260), ya);
        g.lineTo(tx(-140), ya);
        g.closePath();
        g.fill();
      }
      const yb = ya - hh - 12;
      arrow(g, tx(0), yb, tx(dtPs), yb, { color: fg, alpha: 0.8, width: 1, head: 5 });
      arrow(g, tx(dtPs), yb, tx(0), yb, { color: fg, alpha: 0.8, width: 1, head: 5 });
      txt(g, `Δt = ${ctx.formatNumber(dtPs, { maximumFractionDigits: 0 })} ps = ${ctx.formatNumber(dtPs / sigma, { maximumFractionDigits: 1 })}σ`, tx(dtPs / 2), yb - 12, { mono: true, align: 'center', alpha: 0.95 });
      txt(g, `σ = ${sigma} ps`, tx(dtPs) + hh * 0.0 + 56, ya - hh * 0.6, { mono: true, alpha: 0.75, color: accent2 });
      // light ruler: 10 ps ↔ 3 mm
      const ry = yd + 40;
      const mm = Math.min(5, (xb - xa) / 160);
      line(g, xa, ry, xa + 9 * mm * 1, ry, fg, 0.9, 2);
      txt(g, `${L('lightRuler')}: ${sigma} ps = ${ctx.formatNumber((sigma * (DET.LIGHT_CM_PER_NS.value as number)) / 100)} cm = 9 mm of light travel (10 ps = 3 mm)`, xa + 9 * mm + 10, ry, { alpha: 0.8 });
      txt(g, L('timingNote'), xa, ry + 20, { alpha: 0.65 });
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      tau: 0.35,
      loop: ['charge', 'scintillation', 'cherenkov', 'timing'],
      draw(g, s, Pp, env) {
        const A: Rect = { x: 12, y: 10, w: s.w - 24, h: s.h - 20 };
        const fns = [charge, scint, (g2: G, A2: Rect, e2: Env) => B.cherenkov(g2, A2, e2, 'readout'), timing];
        fns.forEach((fn, i) => layers[i](g, s.w, s.h, Pp[STATES[i]], (g2) => fn(g2, A, env.state === STATES[i] ? env : { ...env, ts: 1e3 })));
      },
    });
  },
};
export default mod;

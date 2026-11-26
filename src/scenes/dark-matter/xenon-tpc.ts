/**
 * dm.xenon-tpc — P9 Detection Walkthrough: schematic cutaway (side view) of a dual-phase liquid-xenon TPC.
 * Liquid below, a thin gas layer on top (thickness exaggerated), PMT arrays top and bottom, field cage, cathode, gate, anode.
 * One event is followed: recoil -> S1 -> electron drift -> S2 -> position and the S2/S1 trick.
 * Numbers that tie the panels together (all schematic, order of magnitude):
 *   drift speed 1.5 mm/us (E ~ 200 V/cm), drift length 1.4 m (max 0.93 ms), the event sits 0.77 m below the liquid surface,
 *   so S2 follows S1 by dt = z / v_d = 0.51 ms. The waveform strip, the z bracket and the reconstruct label all use these.
 *   S1 detected photons: 20 (DM.S1_PHOTONS_DETECTED); the bottom array sees more (total reflection at the surface).
 * Simplifications: pulse widths in the strip are exaggerated (S1 ~ 10 ns, S2 ~ 1 us in reality); gas gap and PMT size are not to
 * scale; the S2 footprint is a Gaussian on the 19 top PMTs; the S2/S1 bands are sketched from a smooth log-linear shape, not data.
 *   exterior : cryostat from outside.           cutaway : the same cut open.         recoil : WIMP hits a nucleus (inset).
 *   s1       : flash, light on both arrays.     drift   : electrons rise in the field.   s2 : extraction + gas flash.
 *   reconstruct : (x, y) from the top-array footprint, z from the delay, fiducial volume.
 *   s2-s1-ratio : log(S2/S1) against S1, ER band above NR band.
 */
import { interpolateViridis } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32, gaussian, clamp, smooth } from '../shared/canvas2d';
import { plot, FONT_SANS } from '../shared/plot';
import { DM } from '../../data/dark-matter';
import { arrow, dot, line, ring, txt, rect } from '../common/_draw';
import { glow, loopPhase, PALE, gauss } from './_dm2-common';

const STATES = ['exterior', 'cutaway', 'recoil', 's1', 'drift', 's2', 'reconstruct', 's2-s1-ratio'] as const;
type St = (typeof STATES)[number];
const STAGE: Record<St, number> = { exterior: 0, cutaway: 0, recoil: 1, s1: 2, drift: 3, s2: 4, reconstruct: 5, 's2-s1-ratio': 6 };
const DUR: Partial<Record<St, number>> = { recoil: 3.2, s1: 2.4, drift: 4.2, s2: 2.8 };

// physics of the drawn event
const V_D = 1.5; // mm/us = m/ms
const L_DRIFT = 1.4; // m, gate to cathode
const FZ = 0.55; // event depth as a fraction of the drift length
const Z_EV = FZ * L_DRIFT; // m below the liquid surface
const DT_EV = Z_EV / V_D; // ms
const DT_MAX = L_DRIFT / V_D; // ms
const S1_N = DM.S1_PHOTONS_DETECTED.value as number;
const EV_X = -0.12; // event x as a fraction of the diameter, from the axis
const N_PMT = 7;
const N_E = 24;
const T_AX0 = -0.06;
const T_AX1 = 1.06;

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const f2 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const rnd = mulberry32(31);
    const eOff = Array.from({ length: N_E }, () => [gaussian(rnd), gaussian(rnd), rnd()]);
    // events for the ratio plot (S1 in photons; y = log10(S2/S1), shape only)
    const erShape = (s1: number) => 2.55 - 0.42 * Math.log10(s1 / 10);
    const nrShape = (s1: number) => erShape(s1) - 0.6;
    const erPts = Array.from({ length: 70 }, () => {
      const s1 = 3 * (60 / 3) ** rnd();
      return { s1, y: erShape(s1) + 0.1 * gaussian(rnd) };
    });
    const nrPts = Array.from({ length: 16 }, () => {
      const s1 = 3 * (40 / 3) ** rnd();
      return { s1, y: nrShape(s1) + 0.1 * gaussian(rnd) };
    });
    // 19 top PMTs on a hexagonal lattice (axial coordinates)
    const hex: { x: number; y: number }[] = [];
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) hex.push({ x: q + r / 2, y: (Math.sqrt(3) / 2) * r });
    const EV_MAP = { x: EV_X * 2 * 2.5, y: 0.3 * 2.5 }; // in lattice units (map radius 2.5)
    const SIG_MAP = 0.28 * 2.5;
    const s2w = hex.map((p) => gauss(Math.hypot(p.x - EV_MAP.x, p.y - EV_MAP.y), 0, SIG_MAP));
    const s2sum = s2w.reduce((a, b) => a + b, 0);
    const cen = {
      x: hex.reduce((a, p, i) => a + p.x * s2w[i], 0) / s2sum,
      y: hex.reduce((a, p, i) => a + p.y * s2w[i], 0) / s2sum,
    };

    let stage = 0;
    let state: St = 'exterior';
    let t0 = 0;
    let now = 0;
    const lv: Record<string, number> = { cut: 0, ex: 1, fid: 0, dim: 0, strip: 0, map: 0, ratio: 0, pS1: 0, pS2: 0, inset: 0, field: 0, zbr: 0 };
    const vis = [1, 0, 0, 0, 0, 0, 0]; // visibility of stage k
    const ph = [0, 0, 0, 0, 0, 0, 0]; // phase of stage k (held while hidden)

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      now = s.t;
      const cut = state !== 'exterior' ? 1 : 0;
      const tg: Record<string, number> = {
        cut,
        ex: 1 - cut,
        fid: stage >= 5 && stage < 6 ? 1 : 0,
        dim: stage === 6 ? 1 : 0,
        strip: stage >= 2 && stage <= 5 ? 1 : 0,
        map: stage === 4 || stage === 5 ? 1 : 0,
        ratio: stage === 6 ? 1 : 0,
        pS1: stage === 2 ? 1 : 0,
        pS2: stage === 4 || stage === 5 ? 1 : 0,
        inset: stage === 1 ? 1 : 0,
        field: stage >= 3 && stage <= 4 ? 1 : 0,
        zbr: stage === 5 ? 1 : 0,
      };
      for (const k of Object.keys(tg)) lv[k] = approach(lv[k], tg[k], s.dt, 0.4);
      for (let k = 1; k <= 6; k++) vis[k] = approach(vis[k], stage >= k ? 1 : 0, s.dt, 0.35);
      const dur = DUR[state] ?? 1;
      const p = DUR[state] ? loopPhase(now - t0, dur, 1.6, ctx.reducedMotion) : 1;
      for (let k = 1; k <= 4; k++) {
        if (stage > k) ph[k] = 1;
        else if (stage === k) ph[k] = p;
      }

      const portrait = w / h < 0.9;
      const dw = portrait ? w : w * 0.54;
      const dh = portrait ? h * 0.6 : h;
      const rc = portrait ? { x: 12, y: dh + 2, w: w - 24, h: h - dh - 10 } : { x: dw + 6, y: 22, w: w - dw - 22, h: h - 44 };

      // ---------- geometry of the detector ----------
      const compact = !portrait && w < 700;
      const labL = portrait ? 96 : compact ? 58 : 128;
      const labR = portrait ? 52 : compact ? 52 : 70;
      const Lc = (k: string) => (compact ? L(k + 'S') : L(k));
      const yTop = 24;
      const H = dh - yTop - 14;
      const W = Math.min(H * 0.74, dw - labL - labR - 6);
      const cx = labL + (dw - labL - labR) / 2;
      const x0 = cx - W / 2;
      const x1 = cx + W / 2;
      const pmtH = 11;
      const yAnode = yTop + pmtH + 6;
      const gasH = Math.max(18, H * 0.075);
      const ySurf = yAnode + gasH;
      const yGate = ySurf + 4;
      const yBot = yTop + H;
      const yCath = yBot - pmtH - 8;
      const Ld = yCath - yGate;
      const pxE = cx + EV_X * W;
      const pyE = yGate + FZ * Ld;
      const pmtW = W / N_PMT - 3;
      const pmtX = (i: number) => x0 + (W / N_PMT) * (i + 0.5);
      const mPerPx = L_DRIFT / Ld;

      // light shares on the PMTs (expected counts, schematic geometry)
      const botW = Array.from({ length: N_PMT }, (_, i) => {
        const dx = pmtX(i) - pxE;
        const dy = yBot - pmtH / 2 - pyE;
        return dy / Math.pow(dx * dx + dy * dy, 1.5);
      });
      const topW = Array.from({ length: N_PMT }, (_, i) => {
        const dx = pmtX(i) - pxE;
        const dy = pyE - (yTop + pmtH / 2);
        return (0.38 * dy) / Math.pow(dx * dx + dy * dy, 1.5);
      });
      const sumW = botW.reduce((a, b) => a + b, 0) + topW.reduce((a, b) => a + b, 0);
      const botN = botW.map((v) => (v / sumW) * S1_N);
      const topN = topW.map((v) => (v / sumW) * S1_N);
      const nTop = topN.reduce((a, b) => a + b, 0);
      const nBot = botN.reduce((a, b) => a + b, 0);
      const maxN = Math.max(...botN, ...topN);
      const s2Row = Array.from({ length: N_PMT }, (_, i) => gauss(pmtX(i), pxE, SIG_MAP * (W / 2 / 2.5)));

      const dimA = 1 - 0.7 * lv.dim;

      // ---------- vessel ----------
      const vx0 = x0 - 7;
      const vw = W + 14;
      g.save();
      g.strokeStyle = th.fg;
      g.globalAlpha = (0.35 + 0.3 * lv.ex) * dimA;
      g.lineWidth = 1.2;
      g.beginPath();
      g.roundRect(vx0, yTop - 5, vw, H + 10, 8);
      g.stroke();
      if (lv.ex > 0.01) {
        g.globalAlpha = 0.1 * lv.ex;
        g.fillStyle = th.fg;
        g.fill();
        g.globalAlpha = 0.25 * lv.ex;
        g.lineWidth = 1;
        for (let k = 1; k < 6; k++) {
          const yy = yTop - 5 + ((H + 10) * k) / 6;
          g.beginPath();
          g.moveTo(vx0, yy);
          g.lineTo(vx0 + vw, yy);
          g.stroke();
        }
      }
      g.restore();
      if (lv.ex > 0.02) {
        txt(g, L('cryostat'), x1 + 14, yTop + H * 0.3, { color: th.fg, alpha: 0.8 * lv.ex });
        txt(g, L('tonnes'), x1 + 14, yTop + H * 0.3 + 16, { color: th.fg, alpha: 0.8 * lv.ex });
        txt(g, L('underground'), x1 + 14, yTop + H * 0.3 + 32, { color: th.fg, alpha: 0.7 * lv.ex });
      }

      // ---------- interior ----------
      const ci = lv.cut * dimA;
      if (ci > 0.01) {
        // liquid and gas
        g.save();
        g.globalAlpha = 0.32 * ci;
        g.fillStyle = th.accent2;
        g.fillRect(x0, ySurf, W, yBot - pmtH - 4 - ySurf);
        g.globalAlpha = 0.05 * ci;
        g.fillStyle = th.fg;
        g.fillRect(x0, yAnode, W, ySurf - yAnode);
        g.restore();
        line(g, x0, ySurf, x1, ySurf, th.fg, 1, 0.55 * ci);
        // field cage rings
        const nr = 12;
        for (let k = 0; k <= nr; k++) {
          const yy = yGate + (Ld * k) / nr;
          line(g, x0 - 2, yy, x0 + 4, yy, th.fg, 1, 0.35 * ci);
          line(g, x1 - 4, yy, x1 + 2, yy, th.fg, 1, 0.35 * ci);
        }
        // electrodes
        line(g, x0, yAnode, x1, yAnode, th.fg, 1.6, 0.8 * ci);
        line(g, x0, yGate, x1, yGate, th.fg, 1.2, 0.7 * ci, [3, 2]);
        line(g, x0, yCath, x1, yCath, th.fg, 1.6, 0.8 * ci);
        // PMT arrays (shaded by detected S1 / S2 light)
        for (let i = 0; i < N_PMT; i++) {
          for (const top of [true, false]) {
            const y = top ? yTop : yBot - pmtH;
            const s1sh = lv.pS1 * ((top ? topN[i] : botN[i]) / maxN) * smooth(0.12, 0.45, ph[2]);
            const s2sh = top ? lv.pS2 * s2Row[i] * smooth(0.25, 0.6, ph[4]) : 0;
            const sh = Math.max(s1sh, s2sh);
            rect(g, pmtX(i) - pmtW / 2, y, pmtW, pmtH, th.fg, 1, 0.65 * ci);
            if (sh > 0.01) {
              g.save();
              g.globalCompositeOperation = 'lighter';
              g.fillStyle = `rgba(${PALE},${0.85 * sh * ci})`;
              g.fillRect(pmtX(i) - pmtW / 2 + 1, y + 1, pmtW - 2, pmtH - 2);
              g.restore();
            }
          }
        }
        // labels (left: media, right: electrodes)
        const lx = vx0 - 8;
        txt(g, Lc('pmtTop'), lx, yTop + pmtH / 2, { color: th.fg, align: 'right', alpha: 0.8 * ci });
        txt(g, Lc('gas'), lx, (yAnode + ySurf) / 2, { color: th.fg, align: 'right', alpha: 0.8 * ci });
        txt(g, Lc('liquid'), lx, yGate + Ld * 0.3, { color: th.fg, align: 'right', alpha: 0.8 * ci });
        txt(g, Lc('pmtBottom'), lx, yBot - pmtH / 2, { color: th.fg, align: 'right', alpha: 0.8 * ci });
        const rx = vx0 + vw + 8;
        txt(g, L('anode'), rx, yAnode, { color: th.fg, alpha: 0.75 * ci });
        txt(g, L('gate'), rx, yGate + 6, { color: th.fg, alpha: 0.75 * ci });
        txt(g, L('cathode'), rx, yCath, { color: th.fg, alpha: 0.75 * ci });
        // scale bar: 1 m
        const sb = 1 / mPerPx;
        line(g, rx + 56, yCath, rx + 56, yCath - sb, th.fg, 1, 0.6 * ci);
        line(g, rx + 52, yCath, rx + 60, yCath, th.fg, 1, 0.6 * ci);
        line(g, rx + 52, yCath - sb, rx + 60, yCath - sb, th.fg, 1, 0.6 * ci);
        txt(g, L('oneMeter'), rx + 48, yCath - sb / 2, { color: th.fg, align: 'right', mono: true, alpha: 0.6 * ci });

        // field arrows (drift field, pointing down: electrons feel the opposite force)
        if (lv.field > 0.02) {
          for (let k = 0; k < 3; k++) {
            const yy = yGate + Ld * (0.22 + 0.28 * k);
            arrow(g, x1 - 14, yy - 10, x1 - 14, yy + 10, th.fg, 1, 0.45 * lv.field * ci, 5);
          }
          txt(g, L('driftField'), x1 - 22, yGate + Ld * 0.22 - 14, { color: th.fg, align: 'right', alpha: 0.7 * lv.field * ci, mono: true });
        }

        // fiducial volume
        if (lv.fid > 0.02) {
          const fx0 = cx - W * 0.36;
          const fx1 = cx + W * 0.36;
          const fy0 = yGate + Ld * 0.06;
          const fy1 = yCath - Ld * 0.08;
          g.save();
          g.globalAlpha = 0.7 * lv.fid;
          g.strokeStyle = th.fg;
          g.setLineDash([4, 3]);
          g.lineWidth = 1;
          g.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
          g.restore();
          txt(g, L('fiducial'), fx1 - 4, fy1 - 10, { color: th.fg, align: 'right', alpha: 0.85 * lv.fid });
          // edge events (rejected)
          const edge = [
            [cx - W * 0.46, yGate + Ld * 0.35],
            [cx + W * 0.45, yGate + Ld * 0.72],
          ];
          for (const [ex, ey] of edge) dot(g, ex, ey, 2.4, th.fg, 0.4 * lv.fid);
          txt(g, L('edge'), cx + W * 0.45 - 6, yGate + Ld * 0.72 + 12, { color: th.fg, align: 'right', alpha: 0.6 * lv.fid });
        }

        // ---------- stage 1: the recoil ----------
        const v1 = vis[1] * ci;
        if (v1 > 0.01) {
          const p1 = ph[1];
          const sx = x0 - 6;
          const sy = pyE - Ld * 0.3;
          const u = clamp(p1 / 0.55);
          const wx = sx + (pxE - sx) * u;
          const wy = sy + (pyE - sy) * u;
          line(g, sx, sy, wx, wy, th.accent, 1.2, 0.55 * v1);
          if (u < 1) dot(g, wx, wy, 3.2, th.accent, 0.95 * v1);
          const after = smooth(0.55, 1, p1);
          // outgoing particle (slightly deflected)
          if (after > 0) {
            const ox = pxE + 36 * after;
            const oy = pyE + 28 * after;
            line(g, pxE, pyE, ox, oy, th.accent, 1.2, 0.45 * v1);
            dot(g, ox, oy, 3.2, th.accent, 0.95 * v1);
            ring(g, pxE, pyE, 5 + 4 * after, th.fg, 1, 0.6 * v1 * (1 - after * 0.5));
          }
          dot(g, pxE, pyE, 2.4, th.fg, 0.8 * v1);
          // inset: the recoiling nucleus, greatly enlarged
          const iv = lv.inset * ci;
          if (iv > 0.02) {
            const ir = portrait || compact ? 26 : 34;
            const ix = x1 - ir - 6;
            const iy = pyE - Ld * 0.22;
            line(g, pxE + 4, pyE - 2, ix - ir * 0.7, iy + ir * 0.7, th.fg, 1, 0.35 * iv, [2, 3]);
            g.save();
            g.globalAlpha = iv;
            g.fillStyle = 'rgba(8,8,24,0.65)';
            g.beginPath();
            g.arc(ix, iy, ir, 0, Math.PI * 2);
            g.fill();
            g.restore();
            ring(g, ix, iy, ir, th.fg, 1, 0.6 * iv);
            const tl = ir * 1.0 * after;
            const nx = ix - ir * 0.45;
            const ny = iy - ir * 0.15;
            line(g, nx, ny, nx + tl * 0.9, ny + tl * 0.4, `rgba(${PALE},1)`, 2, 0.9 * iv);
            dot(g, nx + tl * 0.9, ny + tl * 0.4, 3.4, th.accent, iv * after);
            dot(g, nx, ny, 2.6, th.fg, 0.8 * iv * (1 - after));
            txt(g, L('zoom'), ix, iy + ir + 10, { color: th.fg, align: 'center', alpha: 0.75 * iv });
            txt(g, L('trackLen'), ix, iy - ir - 9, { color: th.fg, align: 'center', alpha: 0.75 * iv });
            txt(g, L('er'), ix, iy + ir + 25, { color: th.accent, align: 'center', alpha: 0.95 * iv * after });
          }
        }

        // ---------- stage 2: S1 ----------
        const v2 = vis[2] * ci;
        if (v2 > 0.01 && lv.pS1 > 0.01) {
          const p2 = ph[2];
          const rr = smooth(0, 0.7, p2) * H * 0.55;
          glow(g, pxE, pyE, 6 + rr * 0.5, (0.9 - 0.7 * smooth(0.3, 1, p2)) * lv.pS1);
          g.save();
          g.strokeStyle = `rgba(${PALE},1)`;
          g.lineWidth = 1;
          g.globalAlpha = 0.5 * (1 - smooth(0.2, 0.8, p2)) * lv.pS1;
          g.beginPath();
          g.arc(pxE, pyE, rr, 0, Math.PI * 2);
          g.stroke();
          g.restore();
          // rays to the PMTs: the front reaches the arrays at p2 ~ 0.6
          const reach = smooth(0.05, 0.6, p2);
          g.save();
          g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < N_PMT; i++) {
            for (const top of [true, false]) {
              const n = top ? topN[i] : botN[i];
              const ty = top ? yTop + pmtH : yBot - pmtH;
              const tx = pmtX(i);
              g.strokeStyle = `rgba(${PALE},${0.5 * (n / maxN) * lv.pS1})`;
              g.lineWidth = 1;
              g.beginPath();
              g.moveTo(pxE, pyE);
              g.lineTo(pxE + (tx - pxE) * reach, pyE + (ty - pyE) * reach);
              g.stroke();
            }
          }
          g.restore();
          const tf = smooth(0.5, 0.9, p2) * lv.pS1;
          txt(g, `S1 ≈ ${ctx.formatNumber(S1_N)} ${L('photons')}`, x1 + 10, yTop + H * 0.55, { color: th.fg, alpha: 0.9 * tf });
          txt(g, `${L('top')} ${ctx.formatNumber(Math.round(nTop))}`, x1 + 10, yTop + H * 0.55 + 16, { color: th.fg, mono: true, alpha: 0.7 * tf });
          txt(g, `${L('bottom')} ${ctx.formatNumber(Math.round(nBot))}`, x1 + 10, yTop + H * 0.55 + 31, { color: th.fg, mono: true, alpha: 0.7 * tf });
        }

        // ---------- stage 3: drift ----------
        if (stage === 3 || (vis[3] > 0.02 && stage < 3)) {
          const v3 = vis[3] * ci;
          const p3 = ph[3];
          const cy = pyE + (yGate - pyE) * p3;
          const sp = 2 + 5 * Math.sqrt(p3) * (pyE - cy > 0 ? 1 : 1);
          line(g, pxE, pyE - 6, pxE, cy, th.accent, 1, 0.3 * v3, [2, 3]);
          for (const [a, b, r] of eOff) {
            const ex = pxE + a * sp * 0.6;
            const ey = cy + b * sp * 0.6 + (r - 0.5) * 6 * (1 - p3);
            dot(g, ex, Math.max(yGate + 2, ey), 1.7, th.accent, 0.95 * v3);
          }
          txt(g, `${ctx.formatNumber(N_E)} ${L('electrons')}`, pxE + 14, cy + 4, { color: th.accent, alpha: 0.95 * v3 });
        }

        // ---------- stage 4: S2 ----------
        const v4 = vis[4] * ci;
        if (v4 > 0.01) {
          const p4 = ph[4];
          const burst = smooth(0, 0.3, p4);
          const fl = smooth(0.25, 0.5, p4) * (1 - 0.35 * smooth(0.75, 1, p4));
          // electrons crossing the surface, then in the gas
          if (p4 < 0.35 && stage === 4) {
            for (const [a, b] of eOff) dot(g, pxE + a * 2.5, ySurf + 6 - burst * 14 + b * 1.5, 1.6, th.accent, 0.95 * v4 * (1 - smooth(0.2, 0.35, p4)));
          }
          if (fl > 0.02) {
            // proportional scintillation in the gas gap: a flare along the track of the electrons
            for (let k = 0; k < 5; k++) glow(g, pxE + (k - 2) * 3, ySurf - gasH * (0.15 + 0.15 * k), 14 + 10 * fl, 0.6 * fl * v4);
            // light reaches the top array: footprint rays
            g.save();
            g.globalCompositeOperation = 'lighter';
            for (let i = 0; i < N_PMT; i++) {
              g.strokeStyle = `rgba(${PALE},${0.7 * s2Row[i] * fl * v4})`;
              g.lineWidth = 1;
              g.beginPath();
              g.moveTo(pxE, yAnode - 2);
              g.lineTo(pmtX(i), yTop + pmtH);
              g.stroke();
            }
            g.restore();
          }
          if (stage === 4) {
            txt(g, L('extract'), x1 + 10, ySurf + 22, { color: th.fg, alpha: 0.75 * v4 * smooth(0, 0.3, p4), mono: false });
            txt(g, `S2: ${L('s2note')}`, x1 + 10, ySurf + 38, { color: th.fg, alpha: 0.9 * v4 * fl });
          }
        }

        // ---------- stage 5: reconstruct ----------
        const v5 = vis[5] * ci * (stage === 6 ? 0 : 1);
        if (v5 > 0.01) {
          // x, y from the top array; z from the delay
          line(g, pxE, yTop + pmtH + 2, pxE, pyE - 5, th.accent, 1, 0.7 * lv.zbr, [3, 3]);
          line(g, pxE, pyE + 2, pxE, yGate, th.accent, 1, 0.0);
          // z bracket: from the gate to the event
          const bx = pxE + 12;
          line(g, bx, yGate, bx, pyE, th.accent, 1, 0.9 * lv.zbr);
          line(g, bx - 3, yGate, bx + 3, yGate, th.accent, 1, 0.9 * lv.zbr);
          line(g, bx - 3, pyE, bx + 3, pyE, th.accent, 1, 0.9 * lv.zbr);
          txt(g, `z = ${f2(Z_EV)} m`, bx + 6, (yGate + pyE) / 2 - 7, { color: th.accent, mono: true, alpha: lv.zbr });
          txt(g, `= v_d Δt`, bx + 6, (yGate + pyE) / 2 + 8, { color: th.accent, mono: true, alpha: 0.85 * lv.zbr });
          ring(g, pxE, pyE, 7, th.accent, 1.4, lv.zbr);
          dot(g, pxE, pyE, 2.6, th.accent, lv.zbr);
          txt(g, '(x, y)', pxE, yTop - 12, { color: th.accent, align: 'center', mono: true, alpha: 0.95 * lv.zbr });
        }
        if (lv.dim < 0.5 && stage < 5 && stage >= 1 && vis[1] > 0.02) {
          // the event point stays marked after the recoil
        }
      }

      // ---------- waveform strip ----------
      if (lv.strip > 0.02) {
        const sr = portrait ? { x: rc.x, y: rc.y, w: rc.w, h: rc.h * 0.5 } : { x: rc.x, y: rc.y, w: rc.w, h: rc.h * 0.44 };
        const base = sr.y + sr.h - 26;
        const amp = sr.h - 50;
        const tX = (t: number) => sr.x + 8 + ((t - T_AX0) / (T_AX1 - T_AX0)) * (sr.w - 16);
        const A = lv.strip;
        line(g, sr.x + 8, base, sr.x + sr.w - 8, base, th.fg, 1, 0.55 * A);
        for (const tk of [0, 0.5, 1]) {
          line(g, tX(tk), base, tX(tk), base + 4, th.fg, 1, 0.55 * A);
          txt(g, ctx.formatNumber(tk), tX(tk), base + 13, { color: th.fg, align: 'center', mono: true, alpha: 0.65 * A });
        }
        txt(g, Lc('timeAxis'), sr.x + sr.w - 8, base + 26, { color: th.fg, align: 'right', alpha: 0.75 * A });
        txt(g, L('light'), sr.x + 8, sr.y + 16, { color: th.fg, alpha: 0.75 * A });
        const tNow = stage === 3 ? ph[3] * DT_EV : stage > 3 ? DT_EV : 0;
        const s1A = 0.18 * smooth(0.2, 0.55, ph[2]) * vis[2];
        const s2A = 1.0 * smooth(0.3, 0.8, ph[4]) * vis[4];
        // waveform
        g.save();
        g.strokeStyle = th.accent;
        g.lineWidth = 1.5;
        g.globalAlpha = A;
        g.beginPath();
        const n = 260;
        for (let i = 0; i <= n; i++) {
          const t = T_AX0 + ((T_AX1 - T_AX0) * i) / n;
          const v = s1A * gauss(t, 0, 0.006) + s2A * gauss(t, DT_EV, 0.016);
          const x = tX(t);
          const y = base - v * amp;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.restore();
        // time cursor while drifting
        if (stage === 3) line(g, tX(tNow), base, tX(tNow), base - amp * 0.5, th.fg, 1, 0.55 * A, [2, 3]);
        if (stage === 3) txt(g, `t = ${f2(tNow)} ms`, tX(tNow) + 5, base - amp * 0.5, { color: th.fg, mono: true, alpha: 0.8 * A });
        // pulse labels
        txt(g, 'S1', tX(0) + 10, base - amp * 0.2 - 4, { color: th.fg, alpha: 0.9 * A * smooth(0.3, 0.6, ph[2]) * vis[2] });
        txt(g, 'S2', tX(DT_EV) + 18, base - amp * 0.85, { color: th.fg, alpha: 0.9 * A * smooth(0.5, 0.8, ph[4]) * vis[4] });
        // max drift tick
        txt(g, L('maxDrift'), tX(DT_MAX), base - 8, { color: th.fg, align: 'right', mono: true, alpha: 0.5 * A * vis[3] });
        line(g, tX(DT_MAX), base, tX(DT_MAX), base - 5, th.fg, 1, 0.5 * A * vis[3]);
        // delay bracket
        if (lv.zbr > 0.02) {
          const by = base - amp * 0.4;
          arrow(g, tX(0) + 2, by, tX(DT_EV) - 2, by, th.accent, 1, 0.9 * lv.zbr, 5);
          arrow(g, tX(DT_EV) - 2, by, tX(0) + 2, by, th.accent, 1, 0.9 * lv.zbr, 5);
          txt(g, `Δt = ${f2(DT_EV)} ms`, (tX(0) + tX(DT_EV)) / 2, by - 10, { color: th.accent, align: 'center', mono: true, alpha: lv.zbr });
        }

        // ----- top-array hit map -----
        if (lv.map > 0.02) {
          const mr = portrait ? { x: rc.x + rc.w * 0.3, y: sr.y + sr.h + 4, w: rc.w * 0.7, h: rc.h - sr.h - 6 } : { x: rc.x, y: sr.y + sr.h + 12, w: rc.w, h: rc.h - sr.h - 12 };
          const Rm = Math.max(30, Math.min(mr.w * 0.5 - 70, (mr.h - 24) / 2));
          const u = Rm / 2.5;
          const mx = mr.x + mr.w * 0.5;
          const my = mr.y + mr.h * 0.5 + 6;
          const a = lv.map * smooth(0.2, 0.6, ph[4]);
          ring(g, mx, my, Rm + 3, th.fg, 1, 0.4 * lv.map);
          hex.forEach((q, i) => {
            const val = s2w[i];
            const col = interpolateViridis(0.1 + 0.85 * val);
            g.save();
            g.globalAlpha = (0.15 + 0.8 * val) * a + 0.1 * lv.map * (1 - a);
            g.fillStyle = col;
            g.beginPath();
            g.arc(mx + q.x * u, my + q.y * u, u * 0.44, 0, Math.PI * 2);
            g.fill();
            g.restore();
            ring(g, mx + q.x * u, my + q.y * u, u * 0.44, th.fg, 1, 0.3 * lv.map);
          });
          if (lv.zbr > 0.02) {
            const cxm = mx + cen.x * u;
            const cym = my + cen.y * u;
            line(g, cxm - 6, cym, cxm + 6, cym, th.accent, 1.4, lv.zbr);
            line(g, cxm, cym - 6, cxm, cym + 6, th.accent, 1.4, lv.zbr);
            txt(g, Lc('centroid'), mx, my + Rm + 14, { color: th.accent, align: 'center', alpha: lv.zbr });
          }
          txt(g, `${Lc('topView')} ${Lc('topView2')}`, mx, my - Rm - 12, { color: th.fg, align: 'center', alpha: 0.8 * lv.map });
        }
      }

      // ---------- the S2/S1 trick ----------
      if (lv.ratio > 0.02) {
        const R = lv.ratio;
        const pr = portrait ? { x: 54, y: dh + 16, w: w - 54 - 24, h: h - dh - 56 } : { x: rc.x + 40, y: rc.y + 30, w: rc.w - 54, h: rc.h - 100 };
        g.save();
        g.globalAlpha = R;
        const pl = plot(
          g,
          ctx,
          pr,
          { min: 2, max: 100, log: true, label: L('xS1'), ticks: [3, 10, 30, 100].map((v) => ({ v, label: String(v) })) },
          { min: 0.9, max: 3.4, label: L('yRatio'), ticks: [] },
        );
        pl.axes();
        const bandC = (fn: (s: number) => number, col: string, al: number) => {
          g.save();
          g.globalAlpha = al * R;
          g.fillStyle = col;
          g.beginPath();
          const m = 60;
          for (let i = 0; i <= m; i++) {
            const sv = 2 * 50 ** (i / m);
            const x = pl.X(sv);
            const y = pl.Y(fn(sv) + 0.2);
            i ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          for (let i = m; i >= 0; i--) {
            const sv = 2 * 50 ** (i / m);
            g.lineTo(pl.X(sv), pl.Y(fn(sv) - 0.2));
          }
          g.closePath();
          g.fill();
          g.restore();
        };
        bandC(erShape, th.fg, 0.14);
        bandC(nrShape, th.accent, 0.2);
        pl.curve(erShape, { color: th.fg, width: 1, alpha: 0.6 });
        pl.curve(nrShape, { color: th.accent, width: 1, alpha: 0.9 });
        for (const q of erPts) dot(g, pl.X(q.s1), pl.Y(q.y), 1.6, th.fg, 0.55);
        for (const q of nrPts) dot(g, pl.X(q.s1), pl.Y(q.y), 1.9, th.accent, 0.95);
        // the walkthrough event
        const evS1 = S1_N;
        const evY = nrShape(evS1) + 0.04;
        ring(g, pl.X(evS1), pl.Y(evY), 7, th.accent, 1.4, 1);
        g.restore();
        txt(g, Lc('erBand'), pl.X(2.4), pl.Y(erShape(3) + 0.42), { color: th.fg, alpha: 0.9 * R });
        txt(g, Lc('nrBand'), pl.X(2.4), pl.Y(nrShape(3) - 0.38), { color: th.accent, alpha: R });
        if (!compact) txt(g, L('erWhy'), pl.X(2.4), pl.Y(erShape(3) + 0.42) + 15, { color: th.fg, alpha: 0.6 * R });
        if (!compact) txt(g, L('nrWhy'), pl.X(2.4), pl.Y(nrShape(3) - 0.38) + 15, { color: th.accent, alpha: 0.75 * R });
        txt(g, Lc('thisEvent'), pl.X(evS1) + 12, pl.Y(evY) + 14, { color: th.accent, alpha: R });
      }

      // title for the stage
      g.save();
      g.font = FONT_SANS;
      g.restore();
    });
    c.animate = true;

    return {
      setState(st: string, o: SetStateOptions) {
        if (!(STATES as readonly string[]).includes(st)) return;
        state = st as St;
        stage = STAGE[state];
        t0 = now;
        if (o.immediate || ctx.reducedMotion) {
          const done: Record<string, number> = { cut: state === 'exterior' ? 0 : 1, ex: state === 'exterior' ? 1 : 0, fid: stage === 5 ? 1 : 0, dim: stage === 6 ? 1 : 0, strip: stage >= 2 && stage <= 5 ? 1 : 0, map: stage === 4 || stage === 5 ? 1 : 0, ratio: stage === 6 ? 1 : 0, pS1: stage === 2 ? 1 : 0, pS2: stage === 4 || stage === 5 ? 1 : 0, inset: stage === 1 ? 1 : 0, field: stage >= 3 && stage <= 4 ? 1 : 0, zbr: stage === 5 ? 1 : 0 };
          Object.assign(lv, done);
          for (let k = 1; k <= 6; k++) vis[k] = stage >= k ? 1 : 0;
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

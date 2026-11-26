/**
 * det.walkthrough-calorimeter — P9 Detection Walkthrough: one lead-tungstate crystal of a CMS-like ECAL (PbWO4, X0 = 0.89 cm, 25 X0 ~ 22 cm,
 * front face 2.2 x 2.2 cm, Moliere radius 2.0 cm = DET.MOLIERE_RADIUS_PBWO4_CM). Side view (depth horizontal) of the central crystal and its two
 * neighbours, front view of a 3 x 3 array. The shower is a seeded toy Monte Carlo (_d2-shower.ts): the profile, the lateral spread and the
 * nine tower energies are computed from the simulated deposits, not typed in.
 * Simplifications: toy cascade (uniform energy sharing), light and pulse shapes schematic (decay 10 ns), centroid by linear weights.
 * Resolution in the last step: sigma/E = a / sqrt(E) with a = 3 % (DET.ECAL_STOCHASTIC), constant term ignored.
 */
import { interpolateViridis } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, mulberry32, clamp } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { DET } from '../../data/detectors';
import { arrow, dot, line, rect, ring, txt } from '../common/_draw';
import { L_CRYSTAL, X0, nineTowers, simulate, type Seg, type Shower } from './_d2-shower';
import { makeClock, stepLevels, type Lv } from './_d2-common';

const STATES = ['goal', 'shower', 'light', 'photosensor', 'sum', 'containment'] as const;
type St = (typeof STATES)[number];
const PITCH = 2.2; // cm
const RM = DET.MOLIERE_RADIUS_PBWO4_CM.value as number;
const A_STOCH = 0.03;
const E0 = 20; // GeV, the shower shown in detail
const ENTRY: [number, number] = [0.35, -0.25]; // cm, entry point of the electron

const TARGET: Record<St, Lv> = {
  goal: { tree: 0, light: 0, sens: 0, fv: 0.35, sum: 0, cont: 0, prof: 0, pulse: 0 },
  shower: { tree: 1, light: 0, sens: 0, fv: 0.35, sum: 0, cont: 0, prof: 1, pulse: 0 },
  light: { tree: 0.35, light: 1, sens: 0, fv: 0.35, sum: 0, cont: 0, prof: 1, pulse: 0 },
  photosensor: { tree: 0, light: 0.6, sens: 1, fv: 1, sum: 0, cont: 0, prof: 0, pulse: 1 },
  sum: { tree: 0, light: 0, sens: 1, fv: 1, sum: 1, cont: 0, prof: 0, pulse: 0 },
  containment: { tree: 0, light: 0, sens: 0, fv: 0, sum: 0, cont: 1, prof: 0, pulse: 0 },
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number, d = 1) => ctx.formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d });
    const clk = makeClock(ctx);
    const sh = simulate(E0, mulberry32(11), ENTRY[0], ENTRY[1]);
    const sh10 = simulate(10, mulberry32(21), 0, 0);
    const sh100 = simulate(100, mulberry32(31), 0, 0);
    const towers = nineTowers(sh, PITCH);
    const sumE = towers.reduce((a, b) => a + b, 0);
    let cxc = 0;
    let cyc = 0;
    towers.forEach((e, k) => {
      cxc += ((k % 3) - 1) * PITCH * e;
      cyc += (Math.floor(k / 3) - 1) * PITCH * e;
    });
    cxc /= sumE;
    cyc /= sumE;
    // longitudinal profile in 25 bins of one X0
    const prof = new Array<number>(25).fill(0);
    let inside = 0;
    let total = 0;
    sh.deps.forEach((d) => {
      total += d.e;
      if (d.z >= 0 && d.z < L_CRYSTAL) {
        prof[Math.min(24, Math.floor(d.z / X0))] += d.e;
        inside += d.e;
      }
    });
    const profMax = Math.max(...prof);
    const tMax = prof.indexOf(profMax) + 0.5;
    // lateral radius containing 90 % of the energy, from the deposits
    const rr = sh.deps.map((d) => [Math.hypot(d.x - ENTRY[0], d.y - ENTRY[1]), d.e]).sort((a, b) => a[0] - b[0]);
    let acc = 0;
    let r90 = 0;
    for (const [r, e] of rr) {
      acc += e;
      if (acc >= 0.9 * total) {
        r90 = r;
        break;
      }
    }
    void r90;

    const lv: Lv = { ...TARGET.goal };
    let tgt: Lv = { ...TARGET.goal };
    let state: St = 'goal';
    const logE = (e: number, e0: number) => clamp(Math.log10(e / 0.03) / Math.log10(e0 / 0.03));

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      stepLevels(lv, tgt, s.dt, 0.4);
      const wide = w >= 640 && w > h * 1.15;
      const narrow = w < 560;

      // ---- geometry ----
      const sx = narrow ? 14 : 24;
      const stripW = wide ? w * 0.6 : w - sx - 14;
      const kz = stripW / (L_CRYSTAL + 1.2); // px per cm
      const sh0 = (narrow ? 3.3 : 3 * PITCH) * kz; // strip height (three crystals; 3.3 cm on small stages)
      const sy = narrow ? 30 : 40;
      const yc = sy + sh0 / 2;
      const Z = (z: number) => sx + z * kz;
      const Y = (x: number) => yc - x * kz;
      const ryy = sy + sh0 + 10; // ruler baseline
      // front view
      const F = wide ? Math.min(w - (sx + stripW) - 60, 3 * PITCH * kz * 1.25, h * 0.5) : Math.min(w * 0.4, h - (ryy + 50) - 46, 200);
      const fvx = wide ? sx + stripW + 50 : sx + 24;
      const fvy = wide ? sy + 8 : ryy + (narrow ? 56 : 70);
      const kf = F / (3 * PITCH);
      const FX = (x: number) => fvx + F / 2 + x * kf;
      const FY = (y: number) => fvy + F / 2 - y * kf;
      // plot area
      const P = wide
        ? { x: sx, y: ryy + 62, w: stripW, h: Math.max(60, h - (ryy + 62) - 30) }
        : { x: fvx + F + 50, y: fvy + 8, w: Math.max(60, w - (fvx + F + 50) - 16), h: Math.max(60, F - 10) };

      const showStrip = 1 - lv.cont;

      // ---- crystal side view ----
      if (showStrip > 0.02) {
        g.save();
        g.globalAlpha = showStrip;
        rect(g, Z(0), Y(PITCH / 2), L_CRYSTAL * kz, PITCH * kz, th.fg, 1.3, 0.9);
        g.save();
        g.beginPath();
        g.rect(Z(0) - 1, sy, L_CRYSTAL * kz + 2, sh0);
        g.clip();
        rect(g, Z(0), Y(PITCH * 1.5), L_CRYSTAL * kz, PITCH * kz, th.fg, 1, 0.25, 0);
        rect(g, Z(0), Y(-PITCH / 2), L_CRYSTAL * kz, PITCH * kz, th.fg, 1, 0.25, 0);
        g.restore();
        if (narrow) {
          line(g, Z(0), sy, Z(L_CRYSTAL), sy, th.fg, 1, 0.3);
          line(g, Z(0), sy + sh0, Z(L_CRYSTAL), sy + sh0, th.fg, 1, 0.3);
        }
        txt(g, L(narrow ? 'crystalShort' : 'crystal'), narrow ? Z(0) : Z(L_CRYSTAL / 2), sy - 12, { color: th.fg, align: narrow ? 'left' : 'center', alpha: 0.85 });
        // ruler in radiation lengths
        line(g, Z(0), ryy, Z(L_CRYSTAL), ryy, th.fg, 1, 0.5);
        for (let t = 0; t <= 25; t += 5) {
          line(g, Z(t * X0), ryy, Z(t * X0), ryy + 4, th.fg, 1, 0.5);
          txt(g, String(t), Z(t * X0), ryy + 15, { mono: true, color: th.fg, align: 'center', alpha: 0.65 });
        }
        txt(g, `${L('depth')} X₀ (${f1(X0, 2)} cm)`, Z(L_CRYSTAL), ryy + 30, { color: th.fg, align: 'right', alpha: 0.75 });
        txt(g, `25 X₀ ≈ ${f1(L_CRYSTAL, 0)} cm`, Z(0), ryy + 30, { mono: true, color: th.fg, alpha: 0.75 });

        // incoming electron
        const pin = state === 'goal' ? 1 : 1;
        arrow(g, Z(-1.2), Y(ENTRY[0]), Z(0), Y(ENTRY[0]), th.accent, 1.6, pin, 7);
        txt(g, L('electron'), Z(0) + 4, Y(ENTRY[0]) - 18 - (narrow ? 0 : 0), { color: th.accent, alpha: state === 'goal' ? 1 : 0 });
        if (state === 'goal') {
          txt(g, L('stop'), Z(L_CRYSTAL / 2), Y(0) + 2, { color: th.fg, align: 'center', alpha: 0.95 });
        }

        // shower tree, revealed with depth
        if (lv.tree > 0.02 || lv.light > 0.02) {
          const reveal = state === 'goal' ? 0 : clk.p(0.05, 1.4) * (L_CRYSTAL + 2) * 1.0;
          g.save();
          g.beginPath();
          g.rect(Z(-1.2), sy - 2, (L_CRYSTAL + 1.2) * kz + 2, sh0 + 4);
          g.clip();
          const segAlpha = 0.85 * lv.tree + 0.18 * lv.light;
          sh.segs.forEach((sg: Seg) => {
            if (sg.a[0] > reveal) return;
            const b2 = Math.min(sg.b[0], reveal);
            g.globalAlpha = segAlpha;
            g.strokeStyle = interpolateViridis(0.15 + 0.85 * logE(sg.E, E0));
            g.lineWidth = sg.gamma ? 0.8 : 1.1;
            g.setLineDash(sg.gamma ? [3, 3] : []);
            g.beginPath();
            g.moveTo(Z(sg.a[0]), Y(sg.a[1]));
            const f = sg.b[0] === sg.a[0] ? 1 : (b2 - sg.a[0]) / (sg.b[0] - sg.a[0]);
            g.lineTo(Z(sg.a[0] + (sg.b[0] - sg.a[0]) * f), Y(sg.a[1] + (sg.b[1] - sg.a[1]) * f));
            g.stroke();
          });
          g.restore();
          // scintillation light (additive): emission density follows the local energy deposit
          if (lv.light > 0.02) {
            g.save();
            g.globalCompositeOperation = 'lighter';
            g.beginPath();
            g.rect(Z(-1.2), sy - 2, (L_CRYSTAL + 1.2) * kz + 2, sh0 + 4);
            g.clip();
            const drift = state === 'light' || state === 'photosensor' ? Math.min(1, clk.t * 0.35) * L_CRYSTAL * 0.35 : 0;
            sh.deps.forEach((d, i) => {
              if (i % 2) return;
              const z = Math.min(L_CRYSTAL - 0.3, d.z + drift * (0.4 + (i % 7) / 7));
              g.globalAlpha = clamp(0.25 + 8 * d.e) * lv.light;
              g.fillStyle = th.accent;
              g.fillRect(Z(z) - 1.1, Y(d.x) - 1.1, 2.2, 2.2);
            });
            g.restore();
          }
          if (state === 'shower' || state === 'light') {
            const ex = Z(tMax * X0);
            line(g, ex, sy, ex, sy + sh0, th.fg, 1, 0.45 * lv.prof, [2, 3]);
          }
        }
        // photosensor at the rear
        if (lv.sens > 0.02) {
          rect(g, Z(L_CRYSTAL) + 2, Y(PITCH / 2), 7, PITCH * kz, th.accent2, 1.2, lv.sens, 0.3 * lv.sens);
          txt(g, L('sensor'), Z(L_CRYSTAL) + 2, sy - 12, { color: th.accent2, align: 'right', alpha: lv.sens });
        }
        g.restore();
      }

      // ---- longitudinal profile ----
      if (lv.prof > 0.02 && P.h > 40) {
        g.save();
        g.globalAlpha = lv.prof;
        const pl = plot(g, ctx, { x: P.x, y: P.y, w: P.w, h: P.h - 14 }, { min: 0, max: L_CRYSTAL / X0 * 1, label: '', ticks: [] }, { min: 0, max: (profMax / E0) * 1.15, label: L('profile'), ticks: [] });
        pl.axes();
        const reveal = clk.p(0.05, 1.4) * 25;
        const pts: [number, number][] = [];
        for (let i = 0; i < 25; i++) if (i + 0.5 <= reveal) pts.push([i + 0.5, prof[i] / E0]);
        if (pts.length > 1) pl.path(pts, { color: th.accent, width: 1.5 });
        if (reveal > tMax) pl.text(tMax + 0.8, (profMax / E0) * 1.02, `${L('max')} ${f1(tMax, 0)} X₀`, { mono: true, color: th.fg });
        g.restore();
        // coverage text
        txt(g, `${f1((100 * inside) / total, 1)} % ${L('inCrystal')}`, P.x + P.w, P.y + 8, { mono: true, color: th.fg, align: 'right', alpha: 0.85 * lv.prof });
      }

      // ---- pulse ----
      if (lv.pulse > 0.02 && P.h > 40) {
        g.save();
        g.globalAlpha = lv.pulse;
        const pl = plot(g, ctx, { x: P.x + (wide ? 40 : 30), y: P.y, w: P.w - (wide ? 60 : 44), h: P.h - 14 }, { min: 0, max: 80, label: L('ns') }, { min: 0, max: 1.15, label: L('charge'), ticks: [] });
        pl.axes();
        const pulse = (A: number) => (t: number) => (A * (Math.exp(-t / 10) - Math.exp(-t / 2))) / 0.7;
        const pr = clk.p(0.1, 0.9);
        pl.curve(pulse(1), { color: th.accent, width: 1.6, progress: pr });
        pl.curve(pulse(0.5), { color: th.fg, width: 1.2, progress: pr, alpha: 0.8 });
        pl.text(14, 1.0, `${E0} GeV`, { mono: true, color: th.accent });
        pl.text(14, 0.5, `${E0 / 2} GeV`, { mono: true, color: th.fg });
        g.restore();
        if (!narrow) txt(g, L('pulseNote'), P.x + P.w, P.y + 8, { color: th.fg, align: 'right', alpha: 0.75 * lv.pulse });
      }

      // ---- front view of 3 x 3 crystals ----
      if (lv.fv > 0.02) {
        const a = lv.fv;
        for (let i = -1; i <= 1; i++)
          for (let j = -1; j <= 1; j++) {
            const e = towers[(j + 1) * 3 + (i + 1)];
            const x0 = FX((i - 0.5) * PITCH);
            const y0 = FY((j + 0.5) * PITCH);
            if (lv.sum > 0.02) {
              g.save();
              g.globalAlpha = lv.sum * 0.9;
              g.fillStyle = interpolateViridis(0.1 + 0.9 * clamp(e / (E0 * 0.8)));
              g.fillRect(x0, y0, PITCH * kf, PITCH * kf);
              g.restore();
              txt(g, f1(e, 1), x0 + 5, y0 + 11, { mono: true, color: e > E0 * 0.35 ? '#111' : th.fg, alpha: lv.sum });
            }
            rect(g, x0, y0, PITCH * kf, PITCH * kf, th.fg, i === 0 && j === 0 ? 1.4 : 1, (i === 0 && j === 0 ? 0.85 : 0.4) * a);
          }
        txt(g, L('front'), fvx, fvy - 10, { color: th.fg, alpha: 0.75 * a });
        // deposit positions in the transverse plane (colour = energy of the deposit)
        if (state === 'photosensor') {
          g.save();
          g.globalCompositeOperation = 'lighter';
          sh.deps.forEach((d, i) => {
            if (i % 2) return;
            g.globalAlpha = 0.5 * lv.fv;
            g.fillStyle = th.accent;
            g.fillRect(FX(d.x) - 0.7, FY(d.y) - 0.7, 1.4, 1.4);
          });
          g.restore();
          ring(g, FX(ENTRY[0]), FY(ENTRY[1]), RM * kf, th.accent2, 1.2, lv.fv, [4, 3]);
          txt(g, `R_M = ${f1(RM, 1)} cm: 90 % ${L('inside')}`, fvx, fvy + F + 14, { mono: true, color: th.accent2, alpha: lv.fv });
        }
        if (state === 'sum' || state === 'photosensor' || state === 'goal' || state === 'shower' || state === 'light') {
          dot(g, FX(ENTRY[0]), FY(ENTRY[1]), 2.5, th.accent, a);
        }
        if (lv.sum > 0.02) {
          const kx = FX(cxc);
          const ky = FY(cyc);
          line(g, kx - 6, ky, kx + 6, ky, th.accent2, 1.5, lv.sum);
          line(g, kx, ky - 6, kx, ky + 6, th.accent2, 1.5, lv.sum);
          const nar = Math.max(0, 1);
          void nar;
          txt(g, `${L('centroid')} (${f1(cxc, 2)}, ${f1(cyc, 2)}) cm`, fvx, fvy + F + 14, { mono: true, color: th.accent2, alpha: lv.sum });
          txt(g, `${L('entry')} (${f1(ENTRY[0], 2)}, ${f1(ENTRY[1], 2)}) cm`, fvx, fvy + F + 30, { mono: true, color: th.accent, alpha: lv.sum });
          txt(g, `Σ E = ${f1(sumE, 1)} GeV  (${L('of')} ${E0})`, P.x + (wide ? 0 : 0), P.y + 10, { mono: true, color: th.fg, alpha: lv.sum });
          if (!narrow) {
            txt(g, 'x_c = Σ x_i E_i / Σ E_i', P.x, P.y + 52, { mono: true, color: th.accent2, alpha: 0.9 * lv.sum });
            txt(g, L('sumNote'), P.x, P.y + 30, { color: th.fg, alpha: 0.75 * lv.sum });
          }
        }
      }

      // ---- containment: two showers and the width of the energy measurement ----
      if (lv.cont > 0.02) {
        const a = lv.cont;
        const gw = wide ? w * 0.6 : w - sx - 14;
        const kc = gw / (L_CRYSTAL + 1.2);
        const hh = Math.min(3.3 * kc, (h - 80) / 2.6);
        const draw = (shw: Shower, E: number, y0: number, label: string, col: string) => {
          g.save();
          g.beginPath();
          g.rect(sx, y0 - hh, gw, 2 * hh);
          g.clip();
          shw.segs.forEach((sg) => {
            g.globalAlpha = 0.5 * a;
            g.strokeStyle = interpolateViridis(0.15 + 0.85 * logE(sg.E, E));
            g.lineWidth = 0.8;
            g.beginPath();
            g.moveTo(sx + sg.a[0] * kc, y0 - sg.a[1] * kc);
            g.lineTo(sx + sg.b[0] * kc, y0 - sg.b[1] * kc);
            g.stroke();
          });
          g.restore();
          rect(g, sx, y0 - (PITCH / 2) * kc, L_CRYSTAL * kc, PITCH * kc, th.fg, 1, 0.6 * a);
          txt(g, label, sx, y0 - hh - 10, { mono: true, color: col, alpha: a });
          txt(g, `${shw.segs.length} ${L('tracks')}`, sx + gw, y0 - hh - 10, { mono: true, color: th.fg, align: 'right', alpha: 0.6 * a });
        };
        const yA = 34 + hh + 10;
        const yB = yA + 2 * hh + 34;
        draw(sh10, 10, yA, '10 GeV', th.fg);
        draw(sh100, 100, yB, '100 GeV', th.accent);
        txt(g, L('clipped'), sx + gw, yB + hh + 14, { color: th.fg, align: 'right', alpha: 0.55 * a });
        // distributions of the measured energy
        const R = wide
          ? { x: sx + gw + 70, y: 56, w: w - (sx + gw + 70) - 24, h: Math.min(260, h - 150) }
          : { x: 52, y: yB + hh + 50, w: w - 80, h: Math.max(60, h - (yB + hh + 50) - 64) };
        if (R.w > 60 && R.h > 50) {
          g.save();
          g.globalAlpha = a;
          const pl = plot(g, ctx, R, { min: 0.97, max: 1.03, label: L('measured'), ticks: [0.97, 1, 1.03].map((v) => ({ v, label: f1(v, 2) })) }, { min: 0, max: 1.15, label: L('freq'), ticks: [] });
          pl.axes();
          const sig = (E: number) => A_STOCH / Math.sqrt(E);
          const pdf = (E: number) => (x: number) => Math.exp(-0.5 * ((x - 1) / sig(E)) ** 2) * (sig(100) / sig(E));
          const grow = clk.p(0.15, 1);
          pl.curve((x) => pdf(10)(x) * grow, { color: th.fg, width: 1.4 });
          pl.curve((x) => pdf(100)(x) * grow, { color: th.accent, width: 1.6 });
          pl.text(1 + sig(10) * 1.3, 0.3, `10 GeV: ${f1(sig(10) * 100, 2)} %`, { mono: true, color: th.fg });
          pl.text(1 + sig(100) * 1.5, 0.95, `100 GeV: ${f1(sig(100) * 100, 2)} %`, { mono: true, color: th.accent });
          g.restore();
          txt(g, 'σ/E = a / √E,  a = 3 %', R.x + R.w, R.y + R.h + 38, { mono: true, color: th.fg, align: 'right', alpha: 0.8 * a });
        }
      }
    });
    c.animate = true;

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

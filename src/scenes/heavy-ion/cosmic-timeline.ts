/**
 * hi.cosmic-timeline — Canvas2D, steps.
 * Bottom: log–log plot of the temperature of the universe against time after the Big Bang,
 *   T ≈ 10¹⁰ K · (t / 1 s)^(-1/2) (radiation era; textbook scaling, order of magnitude), steepening to t^(-2/3) after
 *   matter–radiation equality (~5×10⁴ yr). A cursor marks the epoch of the current state; T_c ≈ 2×10¹² K is a dotted line.
 * Top: what the universe is made of at that epoch (schematic, thermal jiggle; speeds fall with T):
 *   qgp: free quarks + gluon lines · hadrons: protons and neutrons · nuclei: ~25 % of the mass bound in ⁴He (rest H) ·
 *   atoms: electrons bound, photons stream free (the CMB).
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, mulberry32 } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS, plot } from '../shared/plot';
import { QCOL, sup } from './_s1-common';

const STATES = ['qgp', 'hadrons', 'nuclei', 'atoms'] as const;
const CURSOR_T = [1e-5, 4e-5, 180, 1.25e13]; // seconds
const BANDS: { a: number; b: number; key: string }[] = [
  { a: 1e-6, b: 3.1e-5, key: 'epochQgp' },
  { a: 3.1e-5, b: 1e2, key: 'epochHadrons' },
  { a: 1e2, b: 1.2e3, key: 'epochNuclei' },
  { a: 1.2e3, b: 1.2e13, key: 'epochIonised' },
  { a: 1.2e13, b: 1e14, key: 'epochAtoms' },
];
const T_EQ = 1.6e12; // s, matter–radiation equality
const Tof = (t: number) => (t < T_EQ ? 1e10 / Math.sqrt(t) : (1e10 / Math.sqrt(T_EQ)) * Math.pow(t / T_EQ, -2 / 3));
const TC_K = 1.8e12;

interface Unit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  he: boolean;
  ph: number[]; // random phases
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const rnd = mulberry32(13);
    const units: Unit[] = [];
    for (let i = 0; i < 33; i++) {
      const a = rnd() * Math.PI * 2;
      units.push({ x: rnd(), y: rnd(), vx: Math.cos(a), vy: Math.sin(a), he: i < 3, ph: Array.from({ length: 24 }, () => rnd() * 6.283) });
    }
    const photons = Array.from({ length: 14 }, () => {
      const a = rnd() * Math.PI * 2;
      return { x: rnd(), y: rnd(), dx: Math.cos(a), dy: Math.sin(a) };
    });
    let idx = 0;
    let logT = Math.log10(CURSOR_T[0]);
    let bindQ = 0;
    let bindN = 0;
    let bindA = 0;
    let speed = 1;
    let clock = 0;
    const L = (k: string) => ctx.label(k);

    const c = createCanvas2D(ctx, (g, s) => {
      clock += s.dt;
      const tgtLog = Math.log10(CURSOR_T[idx]);
      logT = approach(logT, tgtLog, s.dt, 0.45);
      bindQ = approach(bindQ, idx >= 1 ? 1 : 0, s.dt, 0.5);
      bindN = approach(bindN, idx >= 2 ? 1 : 0, s.dt, 0.5);
      bindA = approach(bindA, idx >= 3 ? 1 : 0, s.dt, 0.5);
      speed = approach(speed, [1, 0.8, 0.5, 0.3][idx], s.dt, 0.5);
      const moving = Math.abs(logT - tgtLog) > 0.003 || Math.abs(bindQ - (idx >= 1 ? 1 : 0)) > 0.003 || Math.abs(bindN - (idx >= 2 ? 1 : 0)) > 0.003 || Math.abs(bindA - (idx >= 3 ? 1 : 0)) > 0.003;
      c.animate = true; // thermal motion in the contents panel
      void moving;
      draw(g, s.w, s.h, s.dt);
    });

    const txt = (g: CanvasRenderingContext2D, str: string, x: number, y: number, o: { a?: number; align?: CanvasTextAlign; mono?: boolean; base?: CanvasTextBaseline } = {}) => {
      g.save();
      g.font = o.mono ? FONT_MONO : FONT_SANS;
      g.fillStyle = ctx.theme.fg;
      g.globalAlpha = o.a ?? 0.85;
      g.textAlign = o.align ?? 'left';
      g.textBaseline = o.base ?? 'middle';
      g.fillText(str, x, y);
      g.restore();
    };

    function drawContents(g: CanvasRenderingContext2D, x0: number, y0: number, W: number, H: number, dt: number) {
      const pad = 22;
      // advance centres
      for (const u of units) {
        u.x += ((u.vx * 14 * speed * dt) / W) * 1;
        u.y += ((u.vy * 14 * speed * dt) / H) * 1;
        if (u.x < 0.04 || u.x > 0.96) u.vx *= -1;
        if (u.y < 0.12 || u.y > 0.92) u.vy *= -1;
        u.x = clamp(u.x, 0.03, 0.97);
        u.y = clamp(u.y, 0.1, 0.94);
      }
      const t = clock * (0.35 + 0.65 * speed);
      const roam = (u: Unit, k: number, amp: number): [number, number] => [amp * Math.sin(t * (1.1 + 0.25 * (k % 5)) + u.ph[k % 24]), amp * Math.sin(t * (0.9 + 0.2 * (k % 7)) + u.ph[(k + 7) % 24] + 1.3)];
      const tri = (j: number, r: number): [number, number] => [r * Math.cos((j * 2 * Math.PI) / 3 + 0.5), r * Math.sin((j * 2 * Math.PI) / 3 + 0.5)];
      const quarks: { x: number; y: number }[] = [];
      const dotQ = (x: number, y: number, col: number, r: number, a = 1) => {
        g.globalAlpha = a;
        g.fillStyle = [QCOL.r, QCOL.g, QCOL.b][col];
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      };
      const nucleonBlob = (x: number, y: number, a: number) => {
        g.save();
        g.globalAlpha = a * 0.55;
        g.strokeStyle = ctx.theme.fg;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y, 9, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      };
      const labelAnchors: Record<string, { x: number; y: number }> = {};
      units.forEach((u, ui) => {
        const cx = x0 + pad + u.x * (W - 2 * pad);
        const cy = y0 + u.y * H;
        const nNuc = u.he ? 4 : 1;
        for (let n = 0; n < nNuc; n++) {
          // nucleon position inside unit: free (roam) → bound (tight)
          const roamN = roam(u, 30 + n, 26);
          const tightN: [number, number] = u.he ? [(n % 2 ? 1 : -1) * 5, (n < 2 ? -1 : 1) * 5] : [0, 0];
          const bN = u.he ? bindN : 1;
          const nx = cx + (u.he ? roamN[0] * (1 - bN) + tightN[0] * bN : 0);
          const ny = cy + (u.he ? roamN[1] * (1 - bN) + tightN[1] * bN : 0);
          for (let j = 0; j < 3; j++) {
            const free = roam(u, n * 3 + j, 24);
            const bound = tri(j, 4);
            const q = bindQ;
            const qx = nx + free[0] * (1 - q) + bound[0] * q;
            const qy = ny + free[1] * (1 - q) + bound[1] * q;
            quarks.push({ x: qx, y: qy });
            dotQ(qx, qy, j, 2.6 + 0.6 * (1 - q));
          }
          if (bindQ > 0.05) nucleonBlob(nx, ny, bindQ);
        }
        if (ui === 0) labelAnchors.h = { x: cx, y: cy };
        if (ui === 1) labelAnchors.he = { x: cx, y: cy };
        // electrons: appear once nucleons exist; bind into orbit at the atoms epoch
        if (idx >= 1) {
          const ne = u.he ? 2 : 1;
          for (let e = 0; e < ne; e++) {
            const free = roam(u, 18 + e, 34);
            const ang = t * 3.2 + e * Math.PI + u.ph[3];
            const orb: [number, number] = [14 * Math.cos(ang), 14 * Math.sin(ang)];
            const ex = cx + free[0] * (1 - bindA) + orb[0] * bindA;
            const ey = cy + free[1] * (1 - bindA) + orb[1] * bindA;
            g.fillStyle = ctx.theme.fg;
            g.globalAlpha = 0.8;
            g.beginPath();
            g.arc(ex, ey, 1.7, 0, Math.PI * 2);
            g.fill();
            g.globalAlpha = 1;
          }
        }
      });
      // gluon field lines: only while quarks are free
      if (bindQ < 0.9) {
        g.save();
        g.strokeStyle = ctx.theme.fg;
        g.lineWidth = 0.8;
        for (let i = 0; i < quarks.length; i++) {
          for (let j = i + 1; j < quarks.length; j++) {
            const d = Math.hypot(quarks[i].x - quarks[j].x, quarks[i].y - quarks[j].y);
            if (d < 30) {
              g.globalAlpha = 0.35 * (1 - d / 30) * (1 - bindQ);
              g.beginPath();
              g.moveTo(quarks[i].x, quarks[i].y);
              g.lineTo(quarks[j].x, quarks[j].y);
              g.stroke();
            }
          }
        }
        g.restore();
      }
      // photons: free streaming after recombination (emission → additive)
      if (bindA > 0.02) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(255,243,220,0.55)';
        g.lineWidth = 1;
        for (const p of photons) {
          p.x = (p.x + (p.dx * 110 * dt) / W + 1) % 1;
          p.y = (p.y + (p.dy * 110 * dt) / H + 1) % 1;
          const px = x0 + p.x * W;
          const py = y0 + p.y * H;
          g.globalAlpha = bindA;
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px - p.dx * 16, py - p.dy * 16);
          g.stroke();
        }
        g.restore();
      }
      // labels
      const lab = ['contentsQgp', 'contentsHadrons', 'contentsNuclei', 'contentsAtoms'];
      txt(g, L(lab[idx]), x0 + 4, y0 - 4, { a: 0.9, base: 'bottom' });
      if (idx >= 2 && labelAnchors.he) txt(g, L('he'), labelAnchors.he.x + 18, labelAnchors.he.y - 16, { a: 0.85 * bindN, mono: true });
      if (idx >= 2 && labelAnchors.h) txt(g, L('h'), labelAnchors.h.x + 16, labelAnchors.h.y - 14, { a: 0.85 * bindN, mono: true });
      if (idx >= 3) txt(g, L('light'), x0 + W - 4, y0 - 2, { a: 0.85 * bindA, align: 'right', base: 'bottom' });
    }

    function draw(g: CanvasRenderingContext2D, W: number, H: number, dt: number) {
      const panelH = Math.max(60, H * 0.36);
      g.save();
      g.beginPath();
      g.rect(8, 6, W - 16, panelH + 6);
      g.clip();
      drawContents(g, 16, 32, W - 32, panelH - 20, dt);
      g.restore();
      // hairline under panel
      g.save();
      g.strokeStyle = ctx.theme.fg;
      g.globalAlpha = 0.15;
      g.beginPath();
      g.moveTo(16, panelH + 22);
      g.lineTo(W - 16, panelH + 22);
      g.stroke();
      g.restore();

      const top = panelH + 52;
      const r = { x: 58, y: top, w: Math.max(40, W - 58 - 22), h: Math.max(40, H - top - 44) };
      const tick = (e: number) => ({ v: 10 ** e, label: `10${sup(String(e))}` });
      const p = plot(g, ctx, r, { min: 1e-6, max: 1e14, log: true, label: L('xaxis'), ticks: [-6, -3, 0, 3, 6, 9, 12].map(tick) }, { min: 1e2, max: 1e14, log: true, label: L('yaxis'), ticks: [3, 6, 9, 12].map(tick) });
      const tcur = 10 ** logT;
      // epoch bands
      const active = BANDS.findIndex((b) => tcur >= b.a && tcur < b.b);
      BANDS.forEach((b, i) => {
        const x1 = p.X(b.a);
        const x2 = p.X(b.b);
        g.save();
        g.fillStyle = i === active ? ctx.theme.accent : ctx.theme.fg;
        g.globalAlpha = i === active ? 0.15 : i % 2 ? 0.035 : 0.07;
        g.fillRect(x1, r.y, x2 - x1, r.h);
        g.restore();
        const label = L(b.key);
        g.save();
        g.font = FONT_SANS;
        const wide = x2 - x1 > g.measureText(label).width + 12;
        g.restore();
        if (wide) txt(g, label, (x1 + x2) / 2, r.y + 12, { align: 'center', a: i === active ? 0.95 : 0.55 });
        else if (i === active || W > 520) {
          g.save();
          g.translate((x1 + x2) / 2 + 1, r.y + 8);
          g.rotate(Math.PI / 2);
          g.font = FONT_SANS;
          g.fillStyle = ctx.theme.fg;
          g.globalAlpha = i === active ? 0.95 : 0.55;
          g.textAlign = 'left';
          g.textBaseline = 'middle';
          g.fillText(label, 0, 0);
          g.restore();
        }
      });
      p.axes();
      // T_c
      p.hline(TC_K, { dash: [2, 4], alpha: 0.6 });
      p.text(1e8, TC_K * 2.8, L('tc'), { align: 'center', alpha: 0.75 });
      // curve: future dim, past bright
      p.curve(Tof, { color: ctx.theme.fg, alpha: 0.3, width: 1.5 }, 300);
      const frac = (logT - -6) / 20;
      p.curve(Tof, { color: ctx.theme.accent, width: 2, progress: clamp(frac) }, 300);
      // cursor
      const cxp = p.X(tcur);
      g.save();
      g.strokeStyle = ctx.theme.fg;
      g.globalAlpha = 0.5;
      g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(cxp, r.y + 26);
      g.lineTo(cxp, r.y + r.h);
      g.stroke();
      g.restore();
      p.dot(tcur, Tof(tcur), 4, ctx.theme.accent);
      const keysT = ['tQgp', 'tHadrons', 'tNuclei', 'tAtoms'];
      const keysTemp = ['kQgp', 'kHadrons', 'kNuclei', 'kAtoms'];
      txt(g, L(keysT[idx]), r.x + 12, r.y + r.h - 34, { mono: true, a: 0.9 });
      txt(g, L(keysTemp[idx]), r.x + 12, r.y + r.h - 16, { mono: true, a: 0.9 });
    }

    return {
      setState(state: string, opts: SetStateOptions) {
        idx = Math.max(0, STATES.indexOf(state as (typeof STATES)[number]));
        if (opts.immediate || ctx.reducedMotion) {
          logT = Math.log10(CURSOR_T[idx]);
          bindQ = idx >= 1 ? 1 : 0;
          bindN = idx >= 2 ? 1 : 0;
          bindA = idx >= 3 ? 1 : 0;
          speed = [1, 0.8, 0.5, 0.3][idx];
        }
        c.invalidate();
      },
      resize(w, h) {
        c.resize(w, h);
      },
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

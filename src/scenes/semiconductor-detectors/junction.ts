/**
 * sc.junction — abrupt p⁺n junction of a 300 µm detector (x in µm from the metallurgical junction; n bulk on the right).
 *   contact:      carriers diffuse across the boundary and recombine; a charge-free layer starts to form.
 *   depletion:    equilibrium (V = 0): W = √(2ε V_bi/(q N_eff)) ≈ 28 µm, fixed ions, E(x) triangle, a pair is separated.
 *   reverse-bias: V = 20 V (n side positive): W = √(2ε(V_bi+V)/(q N_eff)) ≈ 165 µm.
 *   full-depletion: V = 100 V > V_fd ≈ 68 V: W = d, E(x) trapezoid.
 * Model = the BiasDepletion widget model: N_eff = 10¹² cm⁻³, ε = 11.9 ε₀, V_bi = 0.6 V. The p⁺ side is drawn with
 * N_A = 20 N_D (its depleted width is W/20; the ρ bar is cut at the panel edge, the label says so).
 */
import type { SceneModule } from '../shared/types';
import { clamp, mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { PH, createStage, dimLine, electronDot, holeRing, junctionModel, line, makeLayer, txt, vDrift, type G } from './_sc1-common';

const STATES = ['contact', 'depletion', 'reverse-bias', 'full-depletion'] as const;
type P = { V: number; eq: number; plots: number; batt: number; pair: number };
const TARGETS: Record<string, P> = {
  contact: { V: 0, eq: 0.5, plots: 0, batt: 0, pair: 0 },
  depletion: { V: 0, eq: 1, plots: 1, batt: 0, pair: 1 },
  'reverse-bias': { V: 20, eq: 1, plots: 1, batt: 1, pair: 1 },
  'full-depletion': { V: 100, eq: 1, plots: 1, batt: 1, pair: 1 },
};

const RATIO = 20; // N_A / N_D
const XP_UM = 40; // drawn thickness of the p⁺ layer
const XN_UM = 8; // drawn thickness of the n⁺ backplane layer

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const rnd = mulberry32(404);
    const nCar = Array.from({ length: 130 }, () => ({ x: rnd(), y: rnd(), ph: rnd() * 6.28, f: 0.5 + rnd() }));
    const pCar = Array.from({ length: 26 }, () => ({ x: rnd(), y: rnd(), ph: rnd() * 6.28, f: 0.5 + rnd() }));
    const diffN = Array.from({ length: 9 }, () => ({ x: rnd(), y: rnd(), ph: rnd() }));
    const diffP = Array.from({ length: 9 }, () => ({ x: rnd(), y: rnd(), ph: rnd() }));
    const layer = makeLayer();
    const D = PH.D_UM;
    const W0 = junctionModel(0).W;

    const draw = (g: G, s: { w: number; h: number; t: number }, p: P, env: { ts: number; reduced: boolean }) => {
      const { w, h } = s;
      const t = env.reduced ? 0 : s.t;
      const jm = junctionModel(p.V);
      const W = p.eq < 0.999 ? W0 * p.eq : jm.W;
      const xp = W / RATIO;
      // layout
      const lx = 58;
      const rx = w - 22;
      const xMin = -XP_UM;
      const xMax = D + XN_UM + 4;
      const S = (rx - lx) / (xMax - xMin);
      const X = (x: number) => lx + (x - xMin) * S;
      const tiny = h < 260;
      const top = tiny ? 8 : 14;
      const battH = tiny ? 30 : 38;
      const bottomPad = 50;
      const H = h - top - battH - bottomPad;
      const compact = h < 440;
      const gh = tiny ? 46 : compact ? Math.max(64, H * (0.6 - 0.2 * p.plots)) : Math.max(76, H * (0.78 - 0.5 * p.plots));
      const gy0 = top + battH;
      const gap = 54;
      const ph = Math.max(40, H - gh - gap - 10);
      const rhoR = { x: lx, y: gy0 + gh + gap + 14, w: rx - lx, h: ph * 0.38 };
      const eR = compact ? { x: lx, y: gy0 + gh + (tiny ? 44 : 66), w: rx - lx, h: Math.max(30, h - (gy0 + gh + (tiny ? 44 : 66)) - (tiny ? 38 : 36)) } : { x: lx, y: rhoR.y + rhoR.h + 30, w: rx - lx, h: ph * 0.62 - 44 };

      // ---- geometry: regions
      g.fillStyle = accent2;
      g.globalAlpha = 0.14;
      g.fillRect(X(-XP_UM), gy0, XP_UM * S, gh);
      g.fillStyle = accent;
      g.globalAlpha = 0.06;
      g.fillRect(X(0), gy0, D * S, gh);
      g.globalAlpha = 0.28;
      g.fillRect(X(D), gy0, XN_UM * S, gh);
      g.globalAlpha = 1;
      // depleted layer: clear band with dashed edges
      g.fillStyle = fg;
      g.globalAlpha = 0.07;
      g.fillRect(X(-xp), gy0, (W + xp) * S, gh);
      g.globalAlpha = 1;
      line(g, X(-xp), gy0, X(-xp), gy0 + gh, fg, 0.55, 1, [3, 3]);
      line(g, X(W), gy0, X(W), gy0 + gh, fg, 0.55, 1, [3, 3]);
      g.strokeStyle = fg;
      g.globalAlpha = 0.35;
      g.lineWidth = 1;
      g.strokeRect(X(xMin), gy0, (D + XN_UM - xMin) * S, gh);
      g.globalAlpha = 1;
      // contacts (metal)
      line(g, X(xMin), gy0 - 1, X(xMin), gy0 + gh + 1, accent2, 0.95, 3);
      line(g, X(D + XN_UM), gy0 - 1, X(D + XN_UM), gy0 + gh + 1, accent2, 0.95, 3);
      txt(g, 'p⁺', X(-XP_UM / 2), gy0 + gh + 14, { align: 'center', mono: true, color: accent2, alpha: 0.9 });
      txt(g, 'n', X(Math.max(W, 0) + (D - W) / 2 + (W > D - 60 ? -60 : 0)), gy0 + gh + 14, { align: 'center', mono: true, color: accent, alpha: W > D - 40 ? 0 : 0.9 });
      txt(g, 'n⁺', X(D + XN_UM / 2) - 2, gy0 + gh + 14, { align: 'center', mono: true, color: accent, alpha: 0.9 });

      // free carriers outside the depleted layer (they wander a little)
      const rowY = (f: number) => gy0 + 8 + f * (gh - 16);
      for (const c of nCar) {
        const x = c.x * D + Math.sin(t * c.f + c.ph) * 4;
        if (x < W + 2 || x > D - 2) continue;
        electronDot(g, X(x), rowY(c.y), accent, 1.9, 0.85);
      }
      for (const c of pCar) {
        const x = -XP_UM + 2 + c.x * (XP_UM - xp - 4) + Math.sin(t * c.f + c.ph) * 2;
        holeRing(g, X(Math.min(x, -xp - 1)), rowY(c.y), accent2, 2.2, 0.85, 1);
      }
      // n⁺ backplane electrons (dense)
      for (let k = 0; k < 14; k++) electronDot(g, X(D + 1 + (k % 2) * 4), rowY((k + 0.5) / 14), accent, 1.7, 0.7);

      // fixed ions in the depleted layer (positive donors on the n side, negative acceptors on the p⁺ side)
      const rows = Math.max(3, Math.floor(gh / 17));
      const nCol = Math.max(1, Math.round(W / 9));
      for (let c = 0; c < nCol; c++) {
        const x = ((c + 0.5) * W) / nCol;
        for (let r = 0; r < rows; r++) {
          const yy = gy0 + (gh * (r + 0.5)) / rows;
          const X0 = X(x);
          g.strokeStyle = accent;
          g.globalAlpha = 0.9;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(X0 - 2.5, yy);
          g.lineTo(X0 + 2.5, yy);
          g.moveTo(X0, yy - 2.5);
          g.lineTo(X0, yy + 2.5);
          g.stroke();
          g.globalAlpha = 1;
        }
      }
      if (xp > 0.2) {
        g.fillStyle = accent2;
        g.globalAlpha = 0.5;
        g.fillRect(X(-xp), gy0 + 1, Math.max(1, xp * S), gh - 2);
        g.globalAlpha = 1;
      }

      // contact: diffusion across the boundary and recombination
      const cA = (1 - p.plots) * (1 - smooth(0.9, 1, p.eq) * 0);
      if (cA > 0.02) {
        const L0 = 60;
        for (const c of diffN) {
          const u = env.reduced ? c.ph : (t * 0.35 + c.ph) % 1;
          const x = Math.max(0, W + 1) + (1 - u) * L0 * 0.9 - u * (W + 22);
          const a = u < 0.8 ? 1 : (1 - u) / 0.2;
          electronDot(g, X(x), rowY(c.y), accent, 2.2, a * cA);
        }
        for (const c of diffP) {
          const u = env.reduced ? c.ph : (t * 0.35 + c.ph) % 1;
          const x = -xp - 28 * (1 - u) + u * (W + 22);
          const a = u < 0.8 ? 1 : (1 - u) / 0.2;
          holeRing(g, X(Math.min(x, W + 20)), rowY(c.y), accent2, 2.4, a * cA, 1.1);
        }
        // arrows (electron flow to the left, hole flow to the right)
        const ay = gy0 + gh + 30;
        const ax = X(0);
        arrowPair(g, ax, ay, accent, accent2, cA);
        txt(g, L('diffuse'), ax, ay + 18, { align: 'center', alpha: 0.8 * cA });
        txt(g, L('recombine'), ax, gy0 - 8, { align: 'center', alpha: 0.8 * cA });
      }

      // depletion region label (bracket under the sensor)
      const labA = clamp(p.eq - 0.2) * 1;
      if (p.plots > 0.05 || p.eq > 0.8) {
        const by = gy0 + gh + (tiny ? 16 : 26);
        dimLine(g, X(-xp), by, X(W), by, fg, 0.7 * p.plots);
        const wTxt = `W = ${ctx.formatNumber(Math.round(W))} µm`;
        const mid = X((W - xp) / 2);
        if (compact) {
          txt(g, `${L('depletion')}, ${wTxt}`, W > 120 ? mid : X(W) + 8, by + 13, { align: W > 120 ? 'center' : 'left', alpha: 0.9 * p.plots * labA });
        } else {
        txt(g, L('depletion'), W > 120 ? mid : X(W) + 8, by + 13, { align: W > 120 ? 'center' : 'left', alpha: 0.9 * p.plots * labA, color: fg });
        txt(g, wTxt, W > 120 ? mid : X(W) + 8, by + 28, { align: W > 120 ? 'center' : 'left', mono: true, alpha: 0.95 * p.plots * labA, color: fg });
        }
      }

      // battery (n side positive = reverse bias)
      if (p.batt > 0.02) {
        const a = p.batt;
        const by = gy0 - 18;
        const xl = X(xMin);
        const xr = X(D + XN_UM);
        const xm = (xl + xr) / 2;
        line(g, xl, gy0, xl, by, fg, 0.7 * a);
        line(g, xr, gy0, xr, by, fg, 0.7 * a);
        line(g, xl, by, xm - 6, by, fg, 0.7 * a);
        line(g, xm + 6, by, xr, by, fg, 0.7 * a);
        line(g, xm - 6, by - 6, xm - 6, by + 6, fg, a, 2); // short plate: −
        line(g, xm + 6, by - 12, xm + 6, by + 12, fg, a, 2); // long plate: +
        txt(g, '−', xm - 16, by - 12, { align: 'center', mono: true, alpha: a });
        txt(g, '+', xm + 16, by - 12, { align: 'center', mono: true, alpha: a });
        txt(g, `V = ${ctx.formatNumber(Math.round(p.V))} V`, xm + 30, by, { mono: true, alpha: a, color: fg });
      }

      // pair created in the depleted layer, separated by the field (drift model, 1 ns ≈ 0.35 s)
      if (p.pair > 0.02 && p.eq > 0.99) {
        const T = 6; // loop length, s
        const tn = env.reduced ? 6 / 0.35 : ((s.t % T) / 0.35) * 1;
        const x0 = Math.max(4, W * 0.5);
        const dtn = 0.05;
        let xe = x0;
        let xh = x0;
        const nStep = Math.min(2000, Math.round(tn / dtn));
        for (let k = 0; k < nStep; k++) {
          xe = Math.min(W, xe + vDrift(PH.MU_E, jm.E(xe)) * dtn);
          xh = Math.max(-xp, xh - vDrift(PH.MU_H, jm.E(Math.max(0, xh))) * dtn);
        }
        const yy = gy0 + gh * 0.5;
        electronDot(g, X(xe), yy, accent, 3.6, p.pair);
        holeRing(g, X(xh), yy, accent2, 4, p.pair, 1.6);
        txt(g, 'e⁻', X(xe), yy - 12, { align: 'center', mono: true, color: accent, alpha: p.pair });
        txt(g, 'h⁺', X(xh), yy - 12, { align: 'center', mono: true, color: accent2, alpha: p.pair });
      }

      // ---- plots: ρ(x) and E(x)
      layer(g, w, h, p.plots, (g2) => {
        const xa = { min: xMin, max: xMax };
        if (!compact) {
        const rho = plot(g2, ctx, rhoR, { ...xa, ticks: [] }, { min: -1.5, max: 1.7, label: L('rho'), ticks: [{ v: 0, label: '0' }, { v: 1, label: '+' }, { v: -1, label: '−' }] });
        rho.axes();
        rho.hline(0, { color: fg, alpha: 0.4 });
        g2.save();
        g2.globalAlpha = 0.75;
        g2.fillStyle = accent;
        g2.fillRect(rho.X(0), rho.Y(1), Math.max(0, W) * S, rho.Y(0) - rho.Y(1));
        g2.fillStyle = accent2;
        g2.fillRect(rho.X(-xp), rho.Y(0), Math.max(1.5, xp * S), rho.Y(-1.5) - rho.Y(0));
        g2.restore();
        rho.text(Math.max(W / 2, 14), 1.28, '+qN_D', { mono: true, color: accent, alpha: 0.95, align: 'center' });
        rho.text(-xp - 6, -1.0, L('pplus'), { color: accent2, alpha: 0.95, align: 'right' });
        }

        const kv = 1e-3;
        const ePk = 7.4;
        const ep = plot(g2, ctx, eR, { ...xa, label: L('xAxis'), ticks: [0, 100, 200, 300].map((v) => ({ v, label: String(v) })) }, { min: 0, max: ePk, label: compact ? undefined : L('eField'), ticks: [0, 2, 4, 6].map((v) => ({ v, label: String(v) })) });
        ep.axes();
        // E(x): p⁺ ramp, n-side triangle (or trapezoid when fully depleted), drop in the n⁺ backplane
        const pts: [number, number][] = [];
        const Emax = jm.E(0) * kv;
        pts.push([-xp, 0], [0, Emax]);
        const Wn = Math.max(W, 0.001);
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const x = (Wn * i) / steps;
          pts.push([x, jm.E(Math.min(x, jm.W)) * kv]);
        }
        const last = pts[pts.length - 1];
        pts.push([last[0], 0]);
        g2.save();
        g2.globalAlpha = 0.16;
        g2.fillStyle = accent;
        g2.beginPath();
        pts.forEach(([x, y], i) => (i ? g2.lineTo(ep.X(x), ep.Y(y)) : g2.moveTo(ep.X(x), ep.Y(y))));
        g2.closePath();
        g2.fill();
        g2.restore();
        ep.path(pts, { color: accent, width: 1.75 });
        if (compact) {
        } else if (jm.full) ep.text(D * 0.5, Math.max(jm.E(D) * kv, 0) + 0.7, L('trapezoid'), { align: 'center', alpha: 0.85 });
        else ep.text(Math.max(W, 60) + 12, 1.3, L('triangle'), { alpha: 0.85 });
        ep.text(6, Emax + 0.45, `${ctx.formatNumber(Math.round(Emax * 10) / 10)} kV/cm`, { mono: true, color: accent, alpha: 0.95, align: 'left' });
      });
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, loop: ['contact', 'depletion', 'reverse-bias', 'full-depletion'], tau: 0.6, draw });
  },
};

function arrowPair(g: G, x: number, y: number, ce: string, ch: string, a: number) {
  g.save();
  g.globalAlpha = a;
  for (const [dir, col] of [
    [-1, ce],
    [1, ch],
  ] as [number, string][]) {
    g.strokeStyle = col;
    g.fillStyle = col;
    g.lineWidth = 1.25;
    const x0 = x - dir * 4;
    const x1 = x + dir * 40;
    const yy = y + (dir > 0 ? 5 : -5);
    g.beginPath();
    g.moveTo(x0, yy);
    g.lineTo(x1, yy);
    g.stroke();
    g.beginPath();
    g.moveTo(x1 + dir * 4, yy);
    g.lineTo(x1 - dir * 3, yy - 3.5);
    g.lineTo(x1 - dir * 3, yy + 3.5);
    g.fill();
  }
  g.restore();
}

export default mod;

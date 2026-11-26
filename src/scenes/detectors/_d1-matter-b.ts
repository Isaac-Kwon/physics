/**
 * det.matter-block drawings, part B: showers, neutral particles, Cherenkov light, scintillation.
 */
import type { SceneContext } from '../shared/types';
import { clamp, mulberry32, smooth } from '../shared/canvas2d';
import { DET } from '../../data/detectors';
import { arrow, dot, glow, hash01, infernoLit, line, para, rgba, txt, wavy, type Env, type G, type Rect } from './_d1-common';

const prog = (e: Env, dur: number) => (e.reduced ? 1 : clamp(e.ts / dur));

/** Gamma-distribution longitudinal profile bins of an EM shower (b = 0.5, t_max = ln(E/E_c) − 0.5): fractions per 0.5 X0 bin. */
export function emProfile(E: number, Ec: number, nBins: number, dt = 0.5) {
  const y = Math.max(2, E / Ec);
  const tmax = Math.max(0.5, Math.log(y) - 0.5);
  const b = 0.5;
  const a = 1 + b * tmax;
  const w = Array.from({ length: nBins }, (_, i) => {
    const t = (i + 0.5) * dt;
    return Math.pow(t, a - 1) * Math.exp(-b * t);
  });
  const s = w.reduce((p, c) => p + c, 0);
  return w.map((v) => v / s);
}

// ---------------------------------------------------------------------------------------------------- hadronic cascade (fixed seed)
const NB = 60; // bins of 0.1 λ over 6 λ
const XMAX = 6;
interface Cascade {
  segs: { x0: number; y0: number; x1: number; y1: number }[];
  neutrons: { x0: number; y0: number; x1: number; y1: number }[];
  ems: { x: number; y: number; E: number; ang: number }[];
  hadDep: number[];
  emDep: number[];
}
const X0_FE = DET.X0_IRON_CM.value as number;
const LAM_FE = DET.LAMBDA_I_IRON_CM.value as number;
function cascade(): Cascade {
  const rnd = mulberry32(5150);
  const c: Cascade = { segs: [], neutrons: [], ems: [], hadDep: new Array(NB).fill(0), emDep: new Array(NB).fill(0) };
  const bin = (x: number) => Math.floor(x / (XMAX / NB));
  const addH = (x: number, E: number) => {
    const b = bin(x);
    if (b >= 0 && b < NB) c.hadDep[b] += E;
  };
  const addEM = (x: number, ang: number, E: number) => {
    const prof = emProfile(E, 0.0217, 60, 0.5);
    prof.forEach((f, i) => {
      const dx = (((i + 0.5) * 0.5 * X0_FE) / LAM_FE) * Math.max(0.3, Math.cos(ang));
      const b = bin(x + dx);
      if (b >= 0 && b < NB) c.emDep[b] += E * f;
    });
  };
  const had = (E: number, x: number, y: number, ang: number, gen: number, d0?: number) => {
    const d = d0 ?? -Math.log(1 - 0.999 * rnd());
    const x2 = x + Math.cos(ang) * d;
    const y2 = y + Math.sin(ang) * d;
    const inside = x2 < XMAX - 0.05;
    const dl = inside ? d : Math.max(0.05, (XMAX - 0.05 - x) / Math.max(0.2, Math.cos(ang)));
    const xe = x + Math.cos(ang) * dl;
    const ye = y + Math.sin(ang) * dl;
    c.segs.push({ x0: x, y0: y, x1: xe, y1: ye });
    for (let s = 0; s < dl; s += 0.05) addH(x + Math.cos(ang) * s, 0.19 * 0.05); // MIP-like ionization, 0.19 GeV per λ
    if (!inside) return;
    addH(x2, 0.2 * E); // binding energy, nuclear breakup: deposited locally
    const avail = 0.8 * E;
    const n = gen < 2 ? 3 : 2;
    const w = Array.from({ length: n }, () => 0.35 + rnd());
    const ws = w.reduce((p, q) => p + q, 0);
    w.forEach((wi, i) => {
      const Ei = (avail * wi) / ws;
      const a = ang + (i - (n - 1) / 2) * 0.55 + (rnd() - 0.5) * 0.5;
      const u = rnd();
      if (u < 0.3) {
        c.ems.push({ x: x2, y: y2, E: Ei, ang: a });
        addEM(x2, a, Ei);
      } else if (u < 0.4) {
        c.neutrons.push({ x0: x2, y0: y2, x1: x2 + Math.cos(a) * 1.6, y1: y2 + Math.sin(a) * 1.6 });
      } else if (Ei > 0.7 && gen < 4) had(Ei, x2, y2, a, gen + 1);
      else {
        const l = 0.12 + 0.1 * rnd();
        c.segs.push({ x0: x2, y0: y2, x1: x2 + Math.cos(a) * l, y1: y2 + Math.sin(a) * l });
        addH(x2 + Math.cos(a) * l, Ei);
      }
    });
  };
  had(10, 0, 0, 0, 0, 0.55);
  return c;
}

export function makeB(ctx: SceneContext) {
  const { accent, accent2, fg } = ctx.theme;
  const L = (k: string) => ctx.label(k);
  const f1 = (v: number, d = 2) => ctx.formatNumber(v, { maximumFractionDigits: d, minimumFractionDigits: d });
  const casc = cascade();

  // ------------------------------------------------------------------ electromagnetic shower: Heitler tree + longitudinal profile
  const EC = DET.E_CRIT_LEAD_MEV.value as number;
  const NG = 5;
  const E0 = EC * 2 ** NG;
  const X0 = DET.X0_LEAD_CM.value as number;
  const em = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 3.4);
    const compact = A.h < 440;
    const x0 = A.x + 34;
    const x1 = A.x + A.w - 20;
    const tMax = 8;
    const u = (x1 - x0) / tMax;
    const X = (t: number) => x0 + t * u;
    const top = A.y + (compact ? 46 : 54);
    const treeH = A.h * (compact ? 0.38 : 0.42);
    const base = A.y + A.h - (compact ? 40 : 46);
    const barMax = A.h * (compact ? 0.15 : 0.18);
    const Y = (g2: number, i: number) => top + ((i + 0.5) / 2 ** g2) * treeH;
    const col = (g2: number) => (g2 * Math.LN2);
    txt(g, `N = 2ᵏ,  E = E₀ / 2ᵏ`, A.x + 16, A.y + 14, { mono: true, alpha: 0.85 });
    // node types: 0 electron/positron, 1 photon
    let types: number[] = [0];
    // incoming electron
    line(g, x0 - 22, Y(0, 0), X(0), Y(0, 0), infernoLit(1), 0.95 * smooth(0, 0.08, k), 1.4);
    for (let gi = 0; gi < NG; gi++) {
      const a = smooth(gi / 6 + 0.04, (gi + 1) / 6 + 0.04, k);
      const next: number[] = [];
      types.forEach((ty, i) => {
        const kids = ty === 0 ? [0, 1] : [0, 0];
        kids.forEach((kt, j) => {
          next.push(kt);
          const col2 = infernoLit((NG - (gi + 1)) / NG);
          g.save();
          g.globalAlpha = 0.95 * a;
          g.strokeStyle = col2;
          g.lineWidth = kt === 0 ? 1.4 : 1;
          g.setLineDash(kt === 0 ? [] : [3, 3]);
          g.beginPath();
          g.moveTo(X(col(gi)), Y(gi, i));
          g.lineTo(X(col(gi + 1)), Y(gi + 1, 2 * i + j));
          g.stroke();
          g.restore();
          if (gi + 1 === NG) dot(g, X(col(gi + 1)), Y(gi + 1, 2 * i + j), 1.6, col2, a);
        });
      });
      types = next;
    }
    // generation counts
    for (let gi = 0; gi <= NG; gi++) txt(g, String(2 ** gi), X(col(gi)), top - 14, { mono: true, align: 'center', alpha: 0.75 * smooth(gi / 6, gi / 6 + 0.1, k) });
    // end of the Heitler tree
    const xt = X(NG * Math.LN2);
    line(g, xt, top - 4, xt, base, fg, 0.35, 1, [3, 4]);
    // info block in the empty area right of the tree
    const bx = xt + 12;
    const bw = x1 - bx;
    if (bw > 90) {
      const wide = bw > 190;
      let yy = top + 4;
      yy = para(g, `${L('emLead')}: X₀ = ${ctx.formatNumber(X0, { maximumFractionDigits: 2 })} cm, E_c = ${ctx.formatNumber(EC)} MeV`, bx, yy + 6, bw, { alpha: 0.85, lh: 15 });
      yy = para(g, `E₀ = 2⁵ E_c = ${ctx.formatNumber(E0, { maximumFractionDigits: 0 })} MeV`, bx, yy + 4, bw, { alpha: 0.85, lh: 15 });
      if (wide) yy = para(g, L('emSplit') + ` X₀ ln 2 = ${ctx.formatNumber(X0 * Math.LN2, { maximumFractionDigits: 2 })} cm`, bx, yy + 4, bw, { alpha: 0.75, lh: 15 });
      yy = para(g, L('emStop'), bx, yy + 4, bw, { alpha: 0.75, lh: 15 });
      // colour legend
      const ly = Math.min(yy + 12, top + treeH - 6);
      const lw = Math.min(110, bw - 8);
      for (let i = 0; i < lw; i++) {
        g.fillStyle = infernoLit(i / lw);
        g.fillRect(bx + i, ly, 1.5, 6);
      }
      txt(g, 'E_c', bx, ly + 16, { mono: true, alpha: 0.75 });
      txt(g, 'E₀', bx + lw, ly + 16, { mono: true, align: 'right', alpha: 0.75 });
    }
    // longitudinal profile (schematic gamma distribution), bins of 0.5 X0
    const prof = emProfile(E0, EC, 16, 0.5);
    const pmax = Math.max(...prof);
    const ap = smooth(0.35, 0.95, k);
    prof.forEach((f, i) => {
      const hh = (f / pmax) * barMax * ap;
      g.fillStyle = rgba(accent, 0.35);
      g.fillRect(X(i * 0.5) + 1, base - hh, 0.5 * u - 2, hh);
      g.strokeStyle = rgba(accent, 0.9);
      g.lineWidth = 1;
      g.strokeRect(X(i * 0.5) + 1, base - hh, 0.5 * u - 2, hh);
    });
    line(g, x0, base, x1, base, fg, 0.6, 1);
    for (let t = 0; t <= tMax; t += 2) {
      line(g, X(t), base, X(t), base + 4, fg, 0.6, 1);
      txt(g, String(t), X(t), base + 14, { mono: true, align: 'center', alpha: 0.75 });
    }
    txt(g, '/X₀', x1, base + 14, { mono: true, align: 'right', alpha: 0.6 });
    txt(g, L('emProfile'), x0, base - barMax - 8, { alpha: 0.75 });
  };

  // ------------------------------------------------------------------ hadronic shower
  const had = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 3.4);
    const compact = A.h < 440;
    const x0 = A.x + 30;
    const x1 = A.x + A.w - 24;
    const topY0 = A.y + 62;
    const topY1 = A.y + A.h * (compact ? 0.64 : 0.66);
    const u = Math.min((x1 - x0) / XMAX, (topY1 - topY0) / 3.2);
    const cy = (topY0 + topY1) / 2;
    const X = (x: number) => x0 + x * u;
    const Y = (y: number) => cy + y * u;
    const base = A.y + A.h - (compact ? 38 : 44);
    const barMax = A.h * (compact ? 0.14 : 0.17);
    // slab outline
    g.strokeStyle = rgba(fg, 0.3);
    g.lineWidth = 1;
    g.strokeRect(x0, topY0 - 4, XMAX * u, topY1 - topY0 + 8);
    // legend
    line(g, A.x + 16, A.y + 16, A.x + 40, A.y + 16, accent, 0.95, 1.5);
    txt(g, L('hadCharged'), A.x + 48, A.y + 16, { alpha: 0.85 });
    for (let i = 0; i < 4; i++) line(g, A.x + 16, A.y + 34 + (i - 1.5) * 2.2, A.x + 40, A.y + 34 + (i - 1.5) * 4.4, fg, 0.7, 1);
    txt(g, L('hadEm'), A.x + 48, A.y + 34, { alpha: 0.85 });
    line(g, A.x + 16, A.y + 52, A.x + 40, A.y + 52, fg, 0.6, 1, [3, 3]);
    txt(g, L('hadNeutron'), A.x + 48, A.y + 52, { alpha: 0.85 });
    const reveal = (xl: number) => smooth(xl - 0.5, xl + 0.1, k * (XMAX + 0.6));
    for (const s of casc.segs) {
      const a = reveal(s.x0);
      if (a < 0.01) continue;
      line(g, X(s.x0), Y(s.y0), X(s.x0 + (s.x1 - s.x0) * a), Y(s.y0 + (s.y1 - s.y0) * a), accent, 0.95, 1.4);
    }
    for (const s of casc.neutrons) {
      const a = reveal(s.x0);
      if (a < 0.01) continue;
      line(g, X(s.x0), Y(s.y0), X(s.x0 + (s.x1 - s.x0) * a), Y(s.y0 + (s.y1 - s.y0) * a), fg, 0.6, 1, [3, 3]);
    }
    for (const s of casc.ems) {
      const a = reveal(s.x);
      if (a < 0.01) continue;
      const tmax = Math.max(1, Math.log(s.E / 0.0217) - 0.5);
      const len = ((tmax * 2 + 2) * X0_FE) / LAM_FE;
      for (let j = 0; j < 9; j++) {
        const aj = s.ang + (hash01(j * 7 + Math.round(s.E * 1000)) - 0.5) * 0.5;
        const lj = len * (0.45 + 0.55 * hash01(j * 13 + Math.round(s.E * 977))) * a;
        line(g, X(s.x), Y(s.y), X(s.x + Math.cos(aj) * lj), Y(s.y + Math.sin(aj) * lj), fg, 0.55, 1);
      }
    }
    // nuclear interaction points
    const prim = casc.segs[0];
    dot(g, X(prim.x1), Y(prim.y1), 2.6, accent, 0.95 * reveal(prim.x1));
    // profile: stacked bars (hadronic ionization + local deposits in accent; EM from π⁰ in white)
    const tot = casc.hadDep.map((v, i) => v + casc.emDep[i]);
    const pmax = Math.max(...tot);
    const bw = (XMAX * u) / NB;
    for (let i = 0; i < NB; i++) {
      const a = smooth(0.3, 0.9, k * 1.2 - (i / NB) * 0.4);
      const hh = (casc.hadDep[i] / pmax) * barMax * a;
      const he = (casc.emDep[i] / pmax) * barMax * a;
      g.fillStyle = rgba(accent, 0.55);
      g.fillRect(X(0) + i * bw + 0.5, base - hh, bw - 1, hh);
      g.fillStyle = rgba(fg, 0.55);
      g.fillRect(X(0) + i * bw + 0.5, base - hh - he, bw - 1, he);
    }
    line(g, x0, base, x0 + XMAX * u, base, fg, 0.6, 1);
    for (let t = 0; t <= XMAX; t++) {
      line(g, X(t), base, X(t), base + 4, fg, 0.6, 1);
      txt(g, String(t), X(t), base + 14, { mono: true, align: 'center', alpha: 0.75 });
    }
    txt(g, '/λ_I', X(XMAX) + 4, base + 14, { mono: true, alpha: 0.6 });
    txt(g, L('hadProfile'), x0, base - barMax - 8, { alpha: 0.75 });
    txt(g, `${L('hadNote')}: λ_I = ${ctx.formatNumber(LAM_FE)} cm ≈ ${ctx.formatNumber(Math.round(LAM_FE / X0_FE))} X₀`, x1, A.y + A.h - 6, { align: 'right', alpha: 0.7 });
  };

  // ------------------------------------------------------------------ neutral particles
  const neutral = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 2.4);
    const x0 = A.x + 40;
    const x1 = A.x + A.w - 24;
    const lamPx = (x1 - x0) / 2.2; // slab length 2.2 λ_I
    const lanes = [A.y + A.h * 0.27, A.y + A.h * 0.7];
    const half = Math.min(44, A.h * 0.12);
    for (const y of lanes) {
      g.strokeStyle = rgba(fg, 0.3);
      g.lineWidth = 1;
      g.strokeRect(x0, y - half, x1 - x0, 2 * half);
    }
    // neutron: invisible until it hits a nucleus at 0.8 λ_I
    const yN = lanes[0];
    const xc = x0 + 0.8 * lamPx;
    const hN = Math.min(1, k / 0.45);
    line(g, x0, yN, x0 + (xc - x0) * hN, yN, fg, 0.65, 1.2, [4, 4]);
    txt(g, L('neutronName'), x0, yN - half - 12, { alpha: 0.9, bold: true });
    if (k > 0.45) {
      const t2 = smooth(0.45, 0.95, k);
      dot(g, xc, yN, 3.4, fg, 0.9);
      const frag: [number, number, string?][] = [[-0.9, 0.5], [-0.35, 0.8], [0.3, 0.65], [0.85, 0.45]];
      frag.forEach(([a, l], i) => {
        const len = l * 70 * t2;
        const col = i === 1 ? accent2 : accent;
        line(g, xc, yN, xc + Math.cos(a) * len, yN + Math.sin(a) * len, col, 0.95, 1.4);
        const n = Math.floor(len / 6);
        for (let s = 1; s <= n; s++) dot(g, xc + Math.cos(a) * s * 6, yN + Math.sin(a) * s * 6 + 2, 0.9, fg, 0.6);
      });
      if (t2 > 0.9) txt(g, L('neutronFrag'), xc + 70, yN + 20, { alpha: 0.85 });
      if (t2 > 0.9) txt(g, L('neutronHit'), x1, yN - half - 12, { align: 'right', alpha: 0.8 });
    }
    // ruler in λ_I (iron)
    const yR = yN + half + 14;
    line(g, x0, yR, x0 + 2 * lamPx, yR, fg, 0.7, 1);
    for (let i = 0; i <= 2; i++) {
      line(g, x0 + i * lamPx, yR - 3, x0 + i * lamPx, yR + 3, fg, 0.7, 1);
      txt(g, i === 0 ? '0' : `${i} λ_I`, x0 + i * lamPx, yR + 13, { mono: true, align: 'center', alpha: 0.75 });
    }
    txt(g, `λ_I = ${ctx.formatNumber(LAM_FE)} cm (${L('iron')})`, x1, yR + 28, { mono: true, align: 'right', alpha: 0.6 });
    // neutrino: crosses everything
    const yV = lanes[1];
    line(g, x0, yV, x0 + (x1 - x0) * k, yV, fg, 0.6, 1.2, [4, 4]);
    txt(g, L('neutrinoName'), x0, yV - half - 12, { alpha: 0.9, bold: true });
    txt(g, L('neutrinoNote'), x0, yV + half + 14, { alpha: 0.75 });
    para(g, L('neutrinoProb'), x0, yV + half + 32, x1 - x0, { alpha: 0.75, lh: 14 });
  };

  // ------------------------------------------------------------------ Cherenkov light (water radiator, air gap, photon-sensor plane)
  const N_W = DET.WATER_INDEX.value as number;
  const BETA = 0.999;
  const BETA_SLOW = 0.6;
  const TH = Math.acos(1 / (N_W * BETA));
  const TH_OUT = Math.asin(Math.min(1, N_W * Math.sin(TH)));
  const ELL = 5; // cm of radiator
  const GAP = 1.5; // cm of air between radiator and sensor plane
  const R_MIN = GAP * Math.tan(TH_OUT);
  const R_MAX = R_MIN + ELL * Math.tan(TH);
  /** mode 'matter': wavefront circles and the slow particle; mode 'readout': ring fit, R and the chain β ← θ_c ← R. */
  const cherenkov = (g: G, A: Rect, e: Env, mode: 'matter' | 'readout' = 'matter') => {
    const k = prog(e, 3);
    const compact = A.h < 440;
    const sc = Math.max(8, Math.min((A.w - 40 - 28) / (ELL + GAP + 2 * R_MAX + 0.5), (A.h - (mode === 'matter' ? 96 : 84)) / (2 * R_MAX)));
    const cy = A.y + (compact ? A.h * 0.47 : A.h * 0.46);
    const xr0 = A.x + 20 + (A.w - 40 - 28 - (ELL + GAP + 2 * R_MAX) * sc) / 2;
    const xr1 = xr0 + ELL * sc;
    const xp = xr1 + GAP * sc;
    const xc = xp + 28 + R_MAX * sc;
    const add = (fn: () => void) => {
      g.save();
      g.globalCompositeOperation = 'lighter';
      fn();
      g.restore();
    };
    // radiator slab
    g.fillStyle = rgba(accent, 0.06);
    g.fillRect(xr0, cy - R_MAX * sc * 0.55, ELL * sc, 2 * R_MAX * sc * 0.55);
    g.strokeStyle = rgba(fg, 0.4);
    g.lineWidth = 1;
    g.strokeRect(xr0, cy - R_MAX * sc * 0.55, ELL * sc, 2 * R_MAX * sc * 0.55);
    line(g, xp, cy - R_MAX * sc - 14, xp, cy + R_MAX * sc + 14, fg, 0.7, 1.5);
    txt(g, `${L('radiator')}, n = ${ctx.formatNumber(N_W)}`, xr0, cy - R_MAX * sc * 0.55 - 12, { alpha: 0.85 });
    txt(g, L('sensorPlane'), xp, cy + R_MAX * sc + 28, { align: 'center', alpha: 0.85 });
    // the fast particle
    const head = xr0 + (xr1 + 40 - xr0) * k;
    const xH = Math.min(head, xr1);
    line(g, xr0 - 16, cy, Math.min(head, xp), cy, accent, 0.95, 1.5);
    dot(g, Math.min(head, xp), cy, 2.8, accent, 1);
    txt(g, `β = ${ctx.formatNumber(BETA, { minimumFractionDigits: 3 })}`, xr0 - 16, cy + 16, { mono: true, alpha: 0.85, color: accent });
    // wavefront circles from emission points, envelope = cone
    const emis = Array.from({ length: 6 }, (_, i) => xr0 + (0.06 + i * 0.17) * ELL * sc);
    g.save();
    g.beginPath();
    g.rect(xr0, cy - R_MAX * sc * 0.55, ELL * sc, 2 * R_MAX * sc * 0.55);
    g.clip();
    if (mode === 'matter') {
      add(() => {
        for (const xe of emis) {
          if (xe > xH) continue;
          const r = (xH - xe) / (N_W * BETA);
          g.strokeStyle = rgba(accent, 0.5);
          g.lineWidth = 1;
          g.beginPath();
          g.arc(xe, cy, r, 0, Math.PI * 2);
          g.stroke();
          dot(g, xe, cy, 1.4, accent2, 0.8);
        }
        const dMax = (xH - emis[0]) * Math.cos(TH);
        for (const sg of [-1, 1]) {
          g.strokeStyle = rgba(accent2, 0.85);
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(xH, cy);
          g.lineTo(xH - Math.cos(TH) * dMax, cy + sg * Math.sin(TH) * dMax);
          g.stroke();
        }
      });
    }
    g.restore();
    // photon rays: water at θ_c, refract at the back face to θ_out (Snell), land on the plane
    add(() => {
      emis.forEach((xe, i) => {
        if (xe > xH) return;
        const a = smooth(0.15 + i * 0.05, 0.6 + i * 0.05, k);
        for (const sg of [-1, 1]) {
          const ys = cy + sg * (xr1 - xe) * Math.tan(TH);
          const yp = ys + sg * GAP * sc * Math.tan(TH_OUT);
          g.strokeStyle = rgba(accent, 0.55 * a);
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(xe, cy);
          g.lineTo(xr1, ys);
          g.lineTo(xr1 + (xp - xr1) * a, ys + (yp - ys) * a);
          g.stroke();
          if (a > 0.97) {
            g.fillStyle = rgba(accent2, 0.9);
            g.beginPath();
            g.arc(xp, yp, 2.2, 0, Math.PI * 2);
            g.fill();
          }
        }
      });
    });
    // face-on view of the sensor plane: ring from emission anywhere in the radiator
    const fa = smooth(0.55, 0.95, k);
    g.save();
    g.globalAlpha = fa;
    g.strokeStyle = rgba(fg, 0.3);
    g.lineWidth = 1;
    g.beginPath();
    g.arc(xc, cy, R_MAX * sc + 12, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    add(() => {
      const nd = 46;
      for (let i = 0; i < nd; i++) {
        const xe = hash01(i + 1) * ELL;
        const phi = hash01(i + 301) * Math.PI * 2;
        const R = (R_MIN + (ELL - xe) * Math.tan(TH)) * sc;
        dot(g, xc + R * Math.cos(phi), cy + R * Math.sin(phi), 1.6, accent, 0.9 * fa);
      }
      // the same six emission points as in the side view, at azimuth ±90°
      emis.forEach((xe) => {
        const R = (R_MIN + (xr1 - xe) / sc * Math.tan(TH)) * sc;
        for (const sg of [-1, 1]) dot(g, xc, cy + sg * R, 2.2, accent2, 0.95 * fa);
      });
    });
    dot(g, xc, cy, 1.8, fg, 0.7 * fa);
    txt(g, L('faceOn'), xc, cy + R_MAX * sc + 44, { align: 'center', alpha: 0.85 * fa });
    // slow particle (matter mode): below threshold, no light
    if (mode === 'matter') {
      const ys = A.y + A.h - 26;
      line(g, xr0 - 16, ys, xp, ys, fg, 0.4, 1.2);
      dot(g, xp - 4, ys, 2.4, fg, 0.5);
      txt(g, `β = ${f1(BETA_SLOW, 1)} < 1/n = ${f1(1 / N_W)}: ${L('noLight')}`, xr0 - 16, ys - 12, { alpha: 0.7 });
    }
    // readouts
    const lines = [`cos θ_c = 1 / (nβ) = ${f1(Math.cos(TH))}`, `θ_c = ${f1((TH * 180) / Math.PI, 1)}°`];
    if (mode === 'matter') {
      txt(g, lines[0], A.x + 16, A.y + 18, { mono: true, alpha: 0.9 });
      txt(g, lines[1] + `  (β = 1: ${f1((Math.acos(1 / N_W) * 180) / Math.PI, 1)}°)`, A.x + 16, A.y + 36, { mono: true, alpha: 0.9 });
    } else {
      // ring radius R (mean) and the way back to β
      const Rm = ((R_MIN + R_MAX) / 2) * sc;
      g.save();
      g.globalAlpha = fa * 0.9;
      g.strokeStyle = fg;
      g.setLineDash([3, 4]);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(xc, cy, Rm, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      arrow(g, xc, cy, xc + Rm * Math.cos(-0.7), cy + Rm * Math.sin(-0.7), { color: accent2, alpha: fa, width: 1.25, head: 6 });
      txt(g, 'R', xc + Rm * 0.55 * Math.cos(-0.7) + 8, cy + Rm * 0.55 * Math.sin(-0.7) - 6, { mono: true, alpha: fa, color: accent2 });
      txt(g, `${L('ringChain')}`, A.x + 16, A.y + 18, { alpha: 0.9 });
      txt(g, `R = ${f1(R_MIN + (R_MAX - R_MIN) / 2, 1)} cm  →  θ_c = ${f1((TH * 180) / Math.PI, 1)}°  →  β = ${ctx.formatNumber(BETA, { minimumFractionDigits: 3 })}`, A.x + 16, A.y + 36, { mono: true, alpha: 0.9 });
    }
  };

  // ------------------------------------------------------------------ scintillation: flash in a block, photons to a photomultiplier, pulse
  const SC_N = 200; // drawn photons = emitted / 100
  const scint = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 2.6);
    const compact = A.h < 440;
    const wide = A.w > 520;
    const blk: Rect = wide
      ? { x: A.x + A.w * 0.06, y: A.y + A.h * 0.26, w: A.w * 0.34, h: A.h * 0.36 }
      : { x: A.x + A.w * 0.08, y: A.y + A.h * 0.2, w: A.w * 0.5, h: A.h * 0.3 };
    const yTrk = blk.y + blk.h * 0.5;
    g.strokeStyle = rgba(fg, 0.5);
    g.lineWidth = 1;
    g.strokeRect(blk.x, blk.y, blk.w, blk.h);
    txt(g, L('scintBlock'), blk.x, blk.y - 12, { alpha: 0.85 });
    // photomultiplier window on the right face
    const win = { x: blk.x + blk.w + 8, y: blk.y + blk.h * 0.15, w: 16, h: blk.h * 0.7 };
    g.strokeStyle = rgba(fg, 0.7);
    g.strokeRect(win.x, win.y, win.w, win.h);
    g.fillStyle = rgba(accent, 0.25);
    g.fillRect(win.x, win.y, 4, win.h);
    txt(g, L('pmt'), win.x + win.w / 2, win.y - 12, { align: 'center', alpha: 0.85 });
    // particle crosses the block
    const xHead = blk.x - 24 + (blk.w + 24) * clamp(k / 0.3);
    line(g, blk.x - 24, yTrk, xHead, yTrk, accent, 0.95, 1.5);
    dot(g, xHead, yTrk, 2.8, accent, 1);
    txt(g, L('scintParticle'), blk.x - 20, yTrk - 12, { alpha: 0.8, color: accent });
    // photons: SC_N dots; emission points along the track, isotropic in the plane; those leaving through the window are collected
    let nCol = 0;
    const a = clamp((k - 0.15) / 0.8);
    const lines: { x: number; y: number; x2: number; y2: number; col: boolean }[] = [];
    for (let i = 0; i < SC_N; i++) {
      const xe = blk.x + hash01(i * 3 + 1) * blk.w;
      const th = hash01(i * 3 + 2) * Math.PI * 2;
      const dx = Math.cos(th);
      const dy = Math.sin(th);
      // ray to the block boundary
      let tHit = Infinity;
      let side = '';
      const tr = dx > 0 ? (blk.x + blk.w - xe) / dx : dx < 0 ? (blk.x - xe) / dx : Infinity;
      if (tr < tHit) {
        tHit = tr;
        side = dx > 0 ? 'r' : 'l';
      }
      const tv = dy > 0 ? (blk.y + blk.h - yTrk) / dy : dy < 0 ? (blk.y - yTrk) / dy : Infinity;
      if (tv < tHit) {
        tHit = tv;
        side = 'v';
      }
      const x2 = xe + dx * tHit;
      const y2 = yTrk + dy * tHit;
      const col = side === 'r' && y2 >= win.y && y2 <= win.y + win.h;
      if (col) nCol++;
      lines.push({ x: xe, y: yTrk, x2, y2, col });
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    lines.forEach((l, i) => {
      const t = clamp(a * 1.6 - (i / SC_N) * 0.6);
      if (t <= 0) return;
      g.strokeStyle = rgba(accent, (l.col ? 0.5 : 0.1) * Math.min(1, t * 2));
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(l.x, l.y);
      g.lineTo(l.x + (l.x2 - l.x) * t, l.y + (l.y2 - l.y) * t);
      g.stroke();
      g.fillStyle = rgba(accent2, 0.85 * Math.min(1, t * 3));
      g.beginPath();
      g.arc(l.x + (l.x2 - l.x) * t, l.y + (l.y2 - l.y) * t, 1.2, 0, Math.PI * 2);
      g.fill();
    });
    g.restore();
    glow(g, blk.x + blk.w * 0.5, yTrk, 40, accent, 0.5 * smooth(0.25, 0.4, k) * (1 - smooth(0.6, 1, k)));
    // pulse: height ∝ number collected, τ_decay ≈ 2.4 ns (fast plastic), rise 0.5 ns
    const pr: Rect = wide ? { x: A.x + A.w * 0.58, y: A.y + A.h * 0.22, w: A.w * 0.36, h: A.h * 0.36 } : { x: A.x + 52, y: A.y + A.h * 0.12 + blk.h + 40, w: A.w - 52 - 24, h: A.h * 0.16 };
    const f = (t: number) => (Math.exp(-t / 2.4) - Math.exp(-t / 0.5)) / 0.62;
    g.save();
    g.strokeStyle = rgba(fg, 0.5);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pr.x, pr.y);
    g.lineTo(pr.x, pr.y + pr.h);
    g.lineTo(pr.x + pr.w, pr.y + pr.h);
    g.stroke();
    g.restore();
    g.strokeStyle = accent;
    g.lineWidth = 1.5;
    g.beginPath();
    const hP = pr.h * 0.92 * clamp(nCol / 40);
    const pp = smooth(0.4, 0.95, k);
    for (let i = 0; i <= 120 * pp; i++) {
      const t = (i / 120) * 14;
      const x = pr.x + (t / 14) * pr.w;
      const y = pr.y + pr.h - f(t) * hP;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    txt(g, L('pulse'), pr.x + 6, pr.y - 8, { alpha: 0.85 });
    txt(g, 't (ns)', pr.x + pr.w, pr.y + pr.h + 14, { mono: true, align: 'right', alpha: 0.7 });
    txt(g, '0', pr.x, pr.y + pr.h + 14, { mono: true, align: 'center', alpha: 0.7 });
    // numbers
    const dep = 2; // MeV
    const yy = Math.max(blk.y + blk.h + 30, A.y + A.h * (wide ? 0.72 : 0.62));
    const ph = (DET.SCINT_PHOTONS_PER_MEV.value as readonly number[])[0] * dep;
    txt(g, `${L('scintDeposit')} ${dep} MeV  →  ${ctx.formatNumber(ph / 1e4)} × 10⁴ ${L('photons')} (10⁴/MeV)`, A.x + 16, yy, { mono: true, alpha: 0.9 });
    txt(g, `${L('scintDrawn')}: ${SC_N} ${L('dots')} (×1/100)`, A.x + 16, yy + 18, { alpha: 0.75 });
    txt(g, `${L('scintReach')} ${nCol} / ${SC_N}`, A.x + 16, yy + 36, { mono: true, alpha: 0.75 });
    void compact;
  };

  return { em, had, neutral, cherenkov, scint };
}

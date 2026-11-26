/**
 * sc.radiation-damage — bulk damage in silicon by non-ionizing energy loss (NIEL).
 *  defects:  2D lattice schematic; a neutron displaces an atom → vacancy (open ring) + interstitial (filled dot); the defect count
 *            and the Φ_eq counter grow together (Φ_eq = 1/12 × 10¹⁵ cm⁻² per pair shown, so 12 pairs = 10¹⁵ n_eq/cm²; schematic scale).
 *  leakage:  mid-gap level lets electrons reach the conduction band in two steps; ΔI = α Φ_eq V_act with α = 4×10⁻¹⁷ A/cm
 *            (SC.ALPHA_LEAKAGE_A_CM), V_act = 1 cm² × 300 µm. I–V curves for Φ = 0, 10¹³, 10¹⁴, 10¹⁵ (V_fd not shifted here).
 *  doping:   N_eff(Φ) = N₀ e^(−cΦ) − g Φ (donor removal + acceptor creation; c, g order-of-magnitude, schematic), V_fd ∝ |N_eff|
 *            with 70 V per 10¹² cm⁻³ for 300 µm (SC.VFD_REF_V).
 *  trapping: 1/τ_eff = β Φ_eq, β = 5×10⁻¹⁶ cm²/ns (SC.BETA_TRAPPING_CM2_NS); electrons at 100 µm/ns (SC.V_SAT_CM_S) across 300 µm
 *            (3 ns); mean collected fraction over a uniform track = (τ/t)(1 − e^(−t/τ)).
 *  anneal:   schematic α(t)/α_∞ and V_fd(t) at 20 °C; cooling slows both (Arrhenius, E = 1.1 eV → ≈150× slower at −10 °C).
 */
import type { SceneModule } from '../shared/types';
import { mulberry32 } from '../shared/canvas2d';
import { plot, type Rect } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { arrow, clamp, dim, dot, fadeStage, hatch, ln, poly, rect, ring, sci, seg, slab, sup, txt, ease, type Fr, type G, wideOf } from './_sc3-common';

const STATES = ['defects', 'leakage', 'doping', 'trapping', 'anneal'] as const;
const ALPHA = SC.ALPHA_LEAKAGE_A_CM.value as number;
const BETA = SC.BETA_TRAPPING_CM2_NS.value as number;
const VFD_REF = SC.VFD_REF_V.value as number;
const D_UM = SC.SENSOR_THICKNESS_UM.value as number;
const V_DRIFT = ((SC.V_SAT_CM_S.value as number) * 1e4) / 1e9; // µm/ns (1e7 cm/s = 100 µm/ns)
const T_C = D_UM / V_DRIFT; // ns to cross the full thickness (3 ns)
const N0 = 1.0; // 10^12 cm^-3
const C_REM = 6e-14; // cm² donor removal (order of magnitude)
const G_C = 0.015; // cm^-1 acceptor creation (order of magnitude), in units of 10^12 cm^-3 per 10^12 cm^-2 → 0.015
const neff = (phi: number) => N0 * Math.exp(-C_REM * phi) - G_C * (phi / 1e12);
const PAIR_PHI = 1e15 / 12;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg, grid } = ctx.theme;
    const rnd = mulberry32(88);
    const fmt1 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 1, minimumFractionDigits: 1 });

    // ---------------------------------------------------------------- defects
    const COLS = 15;
    const ROWS = 9;
    const hitC = 5;
    const hitR = 4;
    // later damage events (lattice sites that get a vacancy + interstitial), in order of appearance
    const sites: { c: number; r: number; dx: number; dy: number }[] = [{ c: hitC, r: hitR, dx: 1.6, dy: -0.9 }];
    while (sites.length < 12) {
      const c = 1 + Math.floor(rnd() * (COLS - 2));
      const r = 1 + Math.floor(rnd() * (ROWS - 2));
      if (sites.some((s) => Math.abs(s.c - c) < 2 && Math.abs(s.r - r) < 2)) continue;
      const a = rnd() * Math.PI * 2;
      sites.push({ c, r, dx: Math.cos(a) * 1.1, dy: Math.sin(a) * 1.1 });
    }
    const drawDefects = (g: G, f: Fr) => {
      const narrow = !wideOf(f);
      const sp = Math.min((f.w - 60) / (COLS + 1), (f.h - 120) / (ROWS + 1), 46);
      const ox = f.w / 2 - ((COLS - 1) * sp) / 2;
      const oy = f.h / 2 - ((ROWS - 1) * sp) / 2 + 8;
      const X = (c: number) => ox + c * sp;
      const Y = (r: number) => oy + r * sp;
      // timeline: neutron arrives at t = 1.4 s; the further events follow at 0.45 s intervals
      const tHit = 1.4;
      const nShown = f.ts > 1e2 ? 12 : Math.min(12, Math.max(0, Math.floor((f.ts - tHit) / 0.45) + 1));
      // bonds + atoms
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (c < COLS - 1) ln(g, X(c), Y(r), X(c + 1), Y(r), { alpha: 0.12 });
          if (r < ROWS - 1) ln(g, X(c), Y(r), X(c), Y(r + 1), { alpha: 0.12 });
        }
      }
      const gone = new Set(sites.slice(0, nShown).map((s) => `${s.c},${s.r}`));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (gone.has(`${c},${r}`)) continue;
          dot(g, X(c), Y(r), Math.max(2.5, sp * 0.1), fg, 0.5);
        }
      }
      sites.slice(0, nShown).forEach((s, i) => {
        const k = i === 0 && f.ts < 1e2 ? ease(clamp((f.ts - tHit) / 0.5)) : 1;
        ring(g, X(s.c), Y(s.r), Math.max(3.5, sp * 0.13), fg, 0.9, 1.25);
        dot(g, X(s.c + s.dx * k) + 0, Y(s.r + s.dy * k), Math.max(3, sp * 0.12), accent2, 1);
      });
      // neutron
      if (f.ts < 1e2 && f.ts < tHit + 0.1) {
        const u = clamp(f.ts / tHit);
        const nx = X(-1.5) + (X(hitC) - X(-1.5)) * u;
        ln(g, X(-1.5), Y(hitR), nx, Y(hitR), { color: accent, alpha: 0.7, width: 1.25 });
        dot(g, nx, Y(hitR), 3.5, accent, 1);
      } else if (f.ts > 1e2 || f.ts >= tHit + 0.1) {
        ln(g, X(-1.5), Y(hitR), X(hitC), Y(hitR), { color: accent, alpha: 0.25, width: 1 });
      }
      txt(g, L('neutron'), X(-1.5), Y(hitR) - 14, { color: accent, alpha: 0.95 });
      // counter
      const nPairs = nShown;
      const phi = nPairs * PAIR_PHI;
      txt(g, `Φ_eq = ${phi > 0 ? sci(phi) : '0'} n_eq/cm²`, 16, 22, { mono: true, color: accent, alpha: 1 });
      txt(g, `${ctx.formatNumber(nPairs)} ${L('pairs')}`, 16, 42, { mono: true, alpha: 0.8 });
      // legend
      const ly = f.h - 22;
      ring(g, 18, ly, 4, fg, 0.9);
      txt(g, L('vacancy'), 28, ly, { alpha: 0.85 });
      dot(g, 28 + (narrow ? 62 : 70), ly, 3.5, accent2);
      txt(g, L('interstitial'), 28 + (narrow ? 72 : 80), ly, { alpha: 0.85 });
      if (!narrow) txt(g, L('latticeNote'), f.w - 16, ly, { align: 'right', alpha: 0.55 });
    };

    // ---------------------------------------------------------------- leakage
    const IV = (phi: number) => (V: number) => {
      const plateau = 2e-8 + ALPHA * phi * (D_UM * 1e-4); // A per cm² of sensor
      return plateau * Math.sqrt(Math.min(V, VFD_REF) / VFD_REF);
    };
    const drawLeakage = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const bd: Rect = wide ? { x: 24, y: 56, w: f.w * 0.36, h: f.h - 100 } : { x: 24, y: 40, w: f.w - 48, h: f.h * 0.34 };
      const pr: Rect = wide ? { x: f.w * 0.36 + 100, y: 56, w: f.w * 0.64 - 100 - 115, h: f.h - 56 - 64 } : { x: 56, y: f.h * 0.34 + 104, w: f.w - 56 - 80, h: f.h * 0.66 - 104 - 46 };
      // band diagram
      const eg = bd.h * 0.62;
      const yc = bd.y + bd.h * 0.12;
      const yv = yc + eg;
      const yi = yc + eg / 2;
      const bw = bd.w;
      rect(g, bd.x, yc - 26, bw, 26, { fill: accent, fillAlpha: 0.16 });
      hatch(g, bd.x, yc - 26, bw, 26, accent, 6, 0.25);
      rect(g, bd.x, yv, bw, 26, { fill: accent, fillAlpha: 0.16 });
      hatch(g, bd.x, yv, bw, 26, accent, 6, 0.25);
      ln(g, bd.x, yc, bd.x + bw, yc, { color: accent, alpha: 0.85, width: 1.5 });
      ln(g, bd.x, yv, bd.x + bw, yv, { color: accent, alpha: 0.85, width: 1.5 });
      ln(g, bd.x + bw * 0.4, yi, bd.x + bw * 0.6, yi, { color: accent2, alpha: 0.95, width: 1.75, dash: [5, 3] });
      txt(g, L('cb'), bd.x + 6, yc - 40, { alpha: 0.85 });
      txt(g, L('vb'), bd.x + 6, yv + 40, { alpha: 0.85 });
      txt(g, L('defectLevel'), bd.x + bw * 0.4 - 8, yi, { color: accent2, alpha: 0.95, align: 'right' });
      dim(g, bd.x + bw - 14, yc, bd.x + bw - 14, yv, '', { alpha: 0.6 });
      txt(g, 'E_g = 1.12 eV', bd.x + bw - 22, (yc + yv) / 2, { align: 'right', mono: true, alpha: 0.75 });
      // thermal generation loop: VB → level → CB, then drift to the electrode
      const u = f.reduced || f.ts > 1e2 ? 0.75 : (f.t % 3.2) / 3.2;
      const xa = bd.x + bw * 0.3;
      const xb = bd.x + bw * 0.5;
      const xc = bd.x + bw * 0.68;
      let ex = xa;
      let ey = yv;
      if (u < 0.3) {
        const k = u / 0.3;
        ex = xa + (xb - xa) * k;
        ey = yv + (yi - yv) * k;
      } else if (u < 0.6) {
        const k = (u - 0.3) / 0.3;
        ex = xb + (xc - xb) * k;
        ey = yi + (yc - yi) * k;
      } else {
        ex = xc + (bd.x + bw - 40 - xc) * ((u - 0.6) / 0.4);
        ey = yc - 6;
      }
      ring(g, xa, yv + 6, 4, accent2, 0.95);
      dot(g, ex, ey, 3.5, accent);
      txt(g, 'e⁻', ex, ey - 12, { mono: true, color: accent, alpha: 0.9 });
      txt(g, 'h⁺', xa, yv + 22, { mono: true, color: accent2, align: 'center', alpha: 0.9 });
      txt(g, L('twoStep'), bd.x, bd.y + bd.h + (wide ? 14 : 10), { alpha: 0.7 });

      // I–V sketch
      const pl = plot(
        g,
        ctx,
        pr,
        { min: 0, max: 400, label: L('bias'), ticks: [{ v: 0, label: '0' }, { v: VFD_REF, label: 'V_fd' }, { v: 200, label: '200' }, { v: 400, label: '400' }] },
        {
          min: 1e-8,
          max: 1e-2,
          log: true,
          label: L('currentPerArea'),
          ticks: [{ v: 1e-8, label: '10 nA' }, { v: 1e-6, label: '1 µA' }, { v: 1e-4, label: '100 µA' }, { v: 1e-2, label: '10 mA' }],
        },
      );
      pl.vline(VFD_REF, { dash: [3, 4], color: fg, alpha: 0.35 });
      pl.axes();
      const phis = [0, 1e13, 1e14, 1e15];
      phis.forEach((phi, i) => {
        const prog = seg(f.ts, i * 0.35, i * 0.35 + 1.2);
        pl.curve(IV(phi), { color: i === 0 ? fg : accent, alpha: i === 0 ? 0.7 : 0.35 + 0.2 * i, width: 1.5, progress: prog }, 120);
        if (prog > 0.95) txt(g, phi === 0 ? 'Φ = 0' : `Φ = ${sci(phi, 0)}`, pl.X(396), pl.Y(IV(phi)(400)) - 10, { mono: true, alpha: 0.9, color: i === 0 ? fg : accent, align: 'right' });
      });
      txt(g, `ΔI = α Φ_eq V_act`, pr.x + 10, pr.y + 8, { mono: true, color: accent, alpha: 1 });
      txt(g, L('alphaNote'), pr.x + 10, pr.y + 26, { mono: true, alpha: 0.7 });
    };

    // ---------------------------------------------------------------- doping
    const drawDoping = (g: G, f: Fr) => {
      const pr: Rect = { x: 66, y: 40, w: f.w - 66 - (!wideOf(f) ? 30 : 160), h: f.h - 40 - 62 };
      const pl = plot(
        g,
        ctx,
        pr,
        { min: 1e12, max: 1e15, log: true, label: L('fluence') },
        { min: -16, max: 2, label: L('neffAxis'), ticks: [-15, -10, -5, 0].map((v) => ({ v, label: String(v) })) },
      );
      pl.hline(0, { color: fg, alpha: 0.5 });
      pl.axes();
      const prog = clamp(f.ts / 2.4);
      pl.curve(neff, { color: accent, width: 1.75, progress: prog }, 240);
      // inversion point
      let inv = 1e12;
      for (let phi = 1e12; phi < 1e15; phi *= 1.01) if (neff(phi) > 0) inv = phi;
      if (prog > 0.5) {
        pl.dot(inv, 0, 3.5, accent2);
        txt(g, L('inversion'), pl.X(inv) + 10, pl.Y(0) + 18, { color: accent2, alpha: 1 });
        txt(g, `Φ ≈ ${sci(inv, 0)}`, pl.X(inv) + 10, pl.Y(0) + 32, { mono: true, alpha: 0.75 });
      }
      pl.vline(SC.FLUENCE_ITS3_CM2.value as number, { dash: [3, 4], color: fg, alpha: 0.4 });
      txt(g, L('its3Mark'), pl.X(1e13) + 6, pr.y + 8, { alpha: 0.75 });
      txt(g, L('donorLike'), pr.x + 8, pl.Y(1.6) + 2, { alpha: 0.65 });
      txt(g, L('acceptorLike'), pr.x + 8, pl.Y(-1.2), { alpha: 0.65 });
      // curve labels
      txt(g, 'N_eff', pl.X(1e15) - 8, pl.Y(neff(1e15)) + 4, { mono: true, color: accent, alpha: 1, align: 'right' });
      if (wideOf(f)) {
        for (const n of [-5, -10, -15]) txt(g, `${ctx.formatNumber(-n * VFD_REF)} V`, pr.x + pr.w + 12, pl.Y(n), { mono: true, color: accent2, alpha: 0.95 });
        txt(g, L('vfdScale'), pr.x + pr.w + 12, pr.y + 8, { color: accent2, alpha: 0.95 });
      }
      txt(g, `V_fd ≈ ${VFD_REF} V × |N_eff| / 10${sup(12)} cm${sup(-3)}  (300 µm)`, pr.x, f.h - 12, { mono: true, alpha: 0.7 });
    };

    // ---------------------------------------------------------------- trapping
    const NE = 22;
    const el = Array.from({ length: NE }, (_, i) => ({ z: (i + 0.5 + (rnd() - 0.5) * 0.6) / NE, e: -Math.log(1 - rnd()), dx: (rnd() - 0.5) * 6 }));
    const drawTrapping = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const sl: Rect = wide ? { x: 130, y: 70, w: Math.min(220, f.w * 0.26), h: f.h - 160 } : { x: 100, y: 56, w: Math.min(120, f.w * 0.3), h: f.h - 230 };
      const PHI = 1e15 * ease(clamp(f.ts / 5));
      const rate = BETA * PHI; // ns⁻¹
      const tau = rate > 0 ? 1 / rate : Infinity;
      slab(g, sl.x, sl.y, sl.w, sl.h, accent, 0.1);
      rect(g, sl.x, sl.y - 6, sl.w, 6, { fill: accent2, fillAlpha: 0.5, stroke: accent2, alpha: 0.7 });
      rect(g, sl.x, sl.y + sl.h, sl.w, 6, { fill: accent2, fillAlpha: 0.5, stroke: accent2, alpha: 0.7 });
      txt(g, L('electrodeTop'), sl.x - 8, sl.y - 3, { align: 'right', alpha: 0.7 });
      txt(g, L('electrodeBottom'), sl.x - 8, sl.y + sl.h + 3, { align: 'right', alpha: 0.7 });
      dim(g, sl.x + sl.w + 14, sl.y, sl.x + sl.w + 14, sl.y + sl.h, '300 µm', { off: 38, alpha: 0.6 });
      const tNow = f.reduced || f.ts > 1e2 ? T_C * 0.75 : ((f.t % 4.4) / 4.4) * T_C * 1.15;
      const xm = sl.x + sl.w / 2;
      ln(g, xm, sl.y, xm, sl.y + sl.h, { color: fg, alpha: 0.3, width: 1 });
      el.forEach((e) => {
        const z0 = e.z; // fraction of the thickness from the top
        const reach = (1 - z0) * T_C; // ns to reach the bottom electrode
        const tTrap = e.e * tau;
        const trapped = tTrap < reach;
        const tt = Math.min(tNow, trapped ? tTrap : reach);
        const z = z0 + tt / T_C;
        const x = xm + e.dx;
        if (trapped && tNow >= tTrap) {
          ln(g, x - 3, sl.y + z * sl.h - 3, x + 3, sl.y + z * sl.h + 3, { color: fg, alpha: 0.85, width: 1.25 });
          ln(g, x - 3, sl.y + z * sl.h + 3, x + 3, sl.y + z * sl.h - 3, { color: fg, alpha: 0.85, width: 1.25 });
        } else dot(g, x, sl.y + z * sl.h, 2.6, accent, 1);
      });
      arrow(g, sl.x + sl.w - 14, sl.y + sl.h * 0.3, sl.x + sl.w - 14, sl.y + sl.h * 0.3 + 34, { color: accent, alpha: 0.6 });
      txt(g, L('drift'), sl.x + sl.w - 20, sl.y + sl.h * 0.3 + 17, { align: 'right', color: accent, alpha: 0.8 });
      // legend
      ln(g, sl.x, sl.y + sl.h + 30, sl.x + 7, sl.y + sl.h + 37, { color: fg, alpha: 0.85 });
      ln(g, sl.x, sl.y + sl.h + 37, sl.x + 7, sl.y + sl.h + 30, { color: fg, alpha: 0.85 });
      txt(g, L('trapped'), sl.x + 14, sl.y + sl.h + 34, { alpha: 0.8 });

      // bar: collected fraction
      const frac = rate > 0 ? (tau / T_C) * (1 - Math.exp(-T_C / tau)) : 1;
      const bx = wide ? sl.x + sl.w + 150 : sl.x + sl.w + 62;
      const bw = 26;
      const bh = sl.h;
      rect(g, bx, sl.y, bw, bh, { stroke: fg, alpha: 0.45 });
      rect(g, bx + 1, sl.y + bh * (1 - frac), bw - 1, bh * frac, { fill: accent, fillAlpha: 0.8 });
      txt(g, '100 %', bx + bw + 8, sl.y, { mono: true, alpha: 0.7 });
      txt(g, '0', bx + bw + 8, sl.y + bh, { mono: true, alpha: 0.7 });
      txt(g, `${ctx.formatNumber(frac * 100, { maximumFractionDigits: 0 })} %`, bx + bw + 8, sl.y + bh * (1 - frac), { mono: true, color: accent, alpha: 1 });
      txt(g, L('collected'), bx, sl.y - 18, { alpha: 0.85 });
      // numbers
      const tx = wide ? bx + 130 : 16;
      const ty = wide ? sl.y + 6 : f.h - 96;
      txt(g, `Φ_eq = ${PHI > 1 ? sci(PHI) : '0'} cm${sup(-2)}`, tx, ty, { mono: true, color: accent, alpha: 1 });
      txt(g, `τ_eff = 1/(βΦ_eq) = ${Number.isFinite(tau) ? fmt1(tau) : '∞'} ns`, tx, ty + 20, { mono: true, alpha: 0.85 });
      txt(g, `β = 5×10${sup(-16)} cm²/ns`, tx, ty + 40, { mono: true, alpha: 0.65 });
      txt(g, `t_drift = ${ctx.formatNumber(T_C)} ns  (300 µm)`, tx, ty + 60, { mono: true, alpha: 0.65 });
    };

    // ---------------------------------------------------------------- anneal
    const MIN = 10;
    const MAX = 1e6;
    const tTicks = [
      { v: 60, label: '1 h' },
      { v: 1440, label: '1 d' },
      { v: 43200, label: '1 mo' },
      { v: 525600, label: '1 y' },
    ];
    const COLD = 149; // exp(E/k (1/263 K − 1/293 K)), E = 1.11 eV
    const alphaT = (t: number) => 1 + 2 / (1 + (t / 3000) ** 0.6);
    const vfdT = (t: number) => 1 - 0.25 * (1 - Math.exp(-t / 3000)) + 0.9 * (1 - 1 / (1 + t / 7e5));
    const drawAnneal = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const rA: Rect = wide ? { x: 56, y: 44, w: f.w / 2 - 56 - 28, h: f.h - 44 - 66 } : { x: 56, y: 34, w: f.w - 56 - 24, h: f.h / 2 - 34 - 46 };
      const rB: Rect = wide ? { ...rA, x: f.w / 2 + 40 } : { ...rA, y: f.h / 2 + 22 };
      const prog = clamp(f.ts / 2.4);
      const xa = { min: MIN, max: MAX, log: true, ticks: wide ? tTicks : [tTicks[1], tTicks[2], tTicks[3]] };
      const a = plot(g, ctx, rA, { ...xa }, { min: 0.8, max: 3.2, label: 'α / α_∞', ticks: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }] });
      a.axes();
      a.hline(1, { dash: [3, 4], color: fg, alpha: 0.4 });
      a.curve(alphaT, { color: accent, width: 1.75, progress: prog }, 200);
      a.curve((t) => alphaT(t / COLD), { color: accent, width: 1.25, dash: [5, 4], alpha: 0.7, progress: prog }, 200);
      a.text(MIN * 1.3, 1.12, 'α_∞ ≈ 4×10⁻¹⁷ A/cm', { align: 'left', mono: true, alpha: 0.75 });
      a.text(12, 3.05, L('leakageDecay'), { color: accent, alpha: 1 });
      const b = plot(g, ctx, rB, { ...xa, label: L('timeAxis') }, { min: 0.6, max: 1.6, label: 'V_fd (a.u.)', ticks: [] });
      b.axes();
      b.hline(1, { dash: [3, 4], color: fg, alpha: 0.4 });
      b.curve(vfdT, { color: accent2, width: 1.75, progress: prog }, 200);
      b.curve((t) => vfdT(t / COLD), { color: accent2, width: 1.25, dash: [5, 4], alpha: 0.7, progress: prog }, 200);
      b.text(1500, 0.73, L('beneficial'), { color: accent2, align: 'left', alpha: 1 });
      b.text(MAX, 1.5, L('reverse'), { color: accent2, align: 'right', alpha: 1 });
      // legend for the cold curves
      const ly = wide ? f.h - 22 : f.h - 12;
      ln(g, 20, ly, 46, ly, { color: fg, alpha: 0.8, width: 1.75 });
      txt(g, L('room'), 54, ly, { alpha: 0.85 });
      ln(g, 150, ly, 176, ly, { color: fg, alpha: 0.8, width: 1.25, dash: [5, 4] });
      txt(g, L('cold'), 184, ly, { alpha: 0.85 });
      void grid;
      void poly;
    };

    return fadeStage(ctx, {
      states: STATES,
      draws: { defects: drawDefects, leakage: drawLeakage, doping: drawDoping, trapping: drawTrapping, anneal: drawAnneal },
      loop: ['leakage', 'trapping'],
      anim: 6,
    });
  },
};
export default mod;

/**
 * hi.phase-diagram — Canvas2D. The QCD phase diagram, T (MeV) against μ_B (MeV). Shapes are QUALITATIVE (schematic).
 * States are cumulative: each state adds a feature and keeps the earlier ones.
 *   axes · early-universe · crossover · nuclear-matter · liquid-gas · neutron-star · unknown-region · first-order ·
 *   critical-point · energy-scan (scrub: √s_NN 5020 → 3 GeV) · freezeout-curve (scrub) · experiments
 * Textbook ingredients:
 *   crossover  T_c(μ) = T_0 [1 − κ (μ/T_0)²], T_0 = 157 MeV, κ ≈ 0.015 (lattice curvature, small), drawn as a band, solid where
 *              lattice QCD is reliable (μ_B ≲ 400 MeV) and fading beyond
 *   freeze-out μ_B(√s) = 1.308 GeV / (1 + 0.273 √s_NN/GeV)  (Cleymans et al. parametrisation), T_ch(μ) falls like a constant
 *              minus μ² and μ⁴ terms, normalised to 156 MeV at μ_B = 0 (HI.T_CHEM_LHC_MEV) → flat then falling. Not data.
 *   first-order line, critical point, unexplored region: hypothetical, dashed and marked "?".
 * `axes` in the "why" layer (not inside section#phase-diagram) additionally shows a very faint sketch of the regions.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, smooth } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS, plot, plotRect } from '../shared/plot';
import { HI } from '../../data/heavy-ion';
import { arrowHead } from './_s1-common';

const STATES = ['axes', 'early-universe', 'crossover', 'nuclear-matter', 'liquid-gas', 'neutron-star', 'unknown-region', 'first-order', 'critical-point', 'energy-scan', 'freezeout-curve', 'experiments'] as const;
const IX = Object.fromEntries(STATES.map((s, i) => [s, i])) as Record<(typeof STATES)[number], number>;

const MU_MAX = 1200;
const T_MAX = 200;
const T0 = 157;
const tcOf = (mu: number) => T0 * (1 - 0.015 * (mu / T0) ** 2);
const CP = { mu: 550, T: tcOf(550) }; // critical point: "somewhere here"
const foLine = (mu: number) => (mu <= CP.mu ? tcOf(mu) : CP.T * (1 - Math.min(1, ((mu - CP.mu) / 510) ** 1.3)));
const muOf = (sqrtS: number) => 1308 / (1 + 0.273 * sqrtS);
const tChem = (mu: number) => {
  const m = mu / 1000;
  return HI.T_CHEM_LHC_MEV.value - 130.6 * m * m - 49.8 * m ** 4;
};
const S_LIST = [5020, 200, 62.4, 19.6, 7.7, 3];
const S_HI = 5020;
const S_LO = 3;
const fracOf = (s: number) => Math.log(S_HI / s) / Math.log(S_HI / S_LO);
const sOf = (f: number) => S_HI * Math.pow(S_LO / S_HI, f);
const foPoint = (f: number) => {
  const mu = muOf(sOf(f));
  return { mu, T: tChem(mu), s: sOf(f) };
};

interface Exp {
  key: string;
  lo: number; // √s range, GeV
  hi: number;
  collider: boolean;
  planned?: boolean;
}
const EXPS: Exp[] = [
  { key: 'expAlice', lo: 2760, hi: 5360, collider: true },
  { key: 'expStar', lo: 3, hi: 200, collider: true },
  { key: 'expSps', lo: 6.3, hi: 17.3, collider: false },
  { key: 'expNica', lo: 4, hi: 11, collider: true },
  { key: 'expCbm', lo: 2.7, hi: 4.9, collider: false },
  { key: 'expHades', lo: 2.3, hi: 2.5, collider: false },
  { key: 'expJparc', lo: 2, hi: 6.2, collider: false, planned: true },
];

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    let idx = 0;
    let prog = 0;
    const a = new Array(STATES.length).fill(0) as number[]; // reveal alpha per state index
    let progD = 0;
    let sketch = 0;
    let sketchOn: boolean | null = null;
    const L = (k: string) => ctx.label(k);
    const fmt = (v: number, d = 0) => ctx.formatNumber(v, { maximumFractionDigits: d });

    const c = createCanvas2D(ctx, (g, s) => {
      let moving = false;
      for (let i = 0; i < a.length; i++) {
        let tgt = idx >= i ? 1 : 0;
        if (i === IX['energy-scan']) tgt = idx >= i ? 1 : 0;
        a[i] = approach(a[i], tgt, s.dt, 0.3);
        if (Math.abs(a[i] - tgt) > 0.003) moving = true;
        else a[i] = tgt;
      }
      progD = approach(progD, prog, s.dt, 0.08);
      if (Math.abs(progD - prog) > 0.002) moving = true;
      else progD = prog;
      if (sketchOn === null) sketchOn = !ctx.container.closest('#phase-diagram');
      sketch = approach(sketch, idx === 0 && sketchOn ? 1 : 0, s.dt, 0.3);
      if (Math.abs(sketch - (idx === 0 && sketchOn ? 1 : 0)) > 0.003) moving = true;
      c.animate = moving;
      draw(g, s.w, s.h);
    });

    function draw(g: CanvasRenderingContext2D, W: number, H: number) {
      const narrow = W < 520;
      const r = plotRect(W, H, { l: narrow ? 46 : 62, r: narrow ? 26 : 28, t: 34, b: 52 });
      const p = plot(g, ctx, r, { min: 0, max: MU_MAX, label: L('xaxis'), ticks: [0, 300, 600, 900, 1200].map((v) => ({ v, label: fmt(v) })) }, { min: 0, max: T_MAX, label: L('yaxis'), ticks: [0, 50, 100, 150, 200].map((v) => ({ v, label: fmt(v) })) });
      p.axes();
      const X = p.X;
      const Y = p.Y;
      const fg = ctx.theme.fg;
      const acc = ctx.theme.accent;
      const txt = (str: string, mu: number, T: number, o: { a?: number; align?: CanvasTextAlign; mono?: boolean; color?: string; italic?: boolean; size?: number } = {}) => {
        g.save();
        g.font = o.mono ? FONT_MONO : o.size ? FONT_SANS.replace('12px', `${o.size}px`) : FONT_SANS;
        if (o.italic) g.font = 'italic ' + g.font;
        g.fillStyle = o.color ?? fg;
        g.globalAlpha = o.a ?? 0.85;
        g.textAlign = o.align ?? 'left';
        g.textBaseline = 'middle';
        g.fillText(str, X(mu), Y(T));
        g.restore();
      };
      // faint sketch of regions (why layer only)
      if (sketch > 0.01) {
        g.save();
        g.globalAlpha = 0.34 * sketch;
        g.strokeStyle = fg;
        g.lineWidth = 1;
        g.setLineDash([2, 5]);
        g.beginPath();
        for (let mu = 0; mu <= 520; mu += 20) {
          mu ? g.lineTo(X(mu), Y(tcOf(mu))) : g.moveTo(X(mu), Y(tcOf(mu)));
        }
        g.stroke();
        g.beginPath();
        g.ellipse(X(930), Y(8), 60, Y(0) - Y(26), 0, Math.PI, 0);
        g.stroke();
        g.restore();
      }
      // ---- region tints (cumulative)
      const aCross = a[IX.crossover];
      if (aCross > 0.01) {
        // plasma: above the boundary, amber; fades beyond the lattice-reliable range until the first-order line is drawn
        const aFO = a[IX['first-order']];
        g.save();
        g.beginPath();
        g.rect(r.x, r.y, r.w, r.h);
        g.clip();
        const steps = 90;
        for (let i = 0; i < steps; i++) {
          const m0 = (i / steps) * MU_MAX;
          const m1 = ((i + 1) / steps) * MU_MAX;
          const al = (0.1 * aCross * (1 - smooth(380, 600, m0) * (1 - aFO))) ;
          if (al < 0.003 || foLine(m1) <= 0.5) continue;
          g.fillStyle = acc;
          g.globalAlpha = al;
          g.fillRect(X(m0), r.y, X(m1) - X(m0) + 0.6, Math.max(0, Y(Math.min(foLine(m0), foLine(m1))) - r.y));
        }
        g.restore();
      }
      // hatched unexplored region
      const aUnk = a[IX['unknown-region']];
      if (aUnk > 0.01) {
        g.save();
        g.beginPath();
        g.moveTo(X(400), Y(22));
        g.lineTo(X(980), Y(22));
        g.lineTo(X(980), Y(188));
        g.lineTo(X(400), Y(188));
        g.closePath();
        g.clip();
        g.fillStyle = fg;
        g.globalAlpha = 0.035 * aUnk;
        g.fillRect(r.x, r.y, r.w, r.h);
        g.strokeStyle = fg;
        g.globalAlpha = 0.16 * aUnk;
        g.lineWidth = 1;
        g.beginPath();
        for (let x = r.x - r.h; x < r.x + r.w + r.h; x += 9) {
          g.moveTo(x, r.y + r.h);
          g.lineTo(x + r.h, r.y);
        }
        g.stroke();
        g.restore();
        g.save();
        g.setLineDash([2, 4]);
        g.strokeStyle = fg;
        g.globalAlpha = 0.3 * aUnk;
        g.strokeRect(X(400), Y(188), X(980) - X(400), Y(22) - Y(188));
        g.restore();
        txt('?', 690, 112, { a: 0.55 * aUnk, align: 'center', size: 44 });
        txt(L('unexplored'), 690, 78, { a: 0.8 * aUnk, align: 'center', italic: true });
      }
      // ---- dense regions (deep red family)
      const aNS = a[IX['neutron-star']];
      const aNM = a[IX['nuclear-matter']];
      if (aNS > 0.01) {
        g.save();
        g.fillStyle = '#b3402f';
        g.globalAlpha = 0.45 * aNS;
        g.beginPath();
        g.ellipse(X(1105), Y(0), X(1105) - X(985), Y(0) - Y(15), 0, Math.PI, 0);
        g.fill();
        // hot patch: merger remnants (dense and hot)
        g.fillStyle = '#d96a3a';
        g.globalAlpha = 0.17 * aNS;
        g.beginPath();
        g.ellipse(X(1070), Y(62), X(1060) - X(980), Y(55) - Y(80), 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        txt(L('neutronStars'), 1105, 24, { align: 'center', a: 0.9 * aNS });
        txt(L('mergers'), 1070, 90, { align: 'center', a: 0.8 * aNS });
        // little arrow from stars up to the hot patch is deliberately omitted: mergers are a separate (transient) population
      }
      // ---- crossover band
      if (aCross > 0.01) {
        const half = 9;
        g.save();
        const n = 80;
        for (let i = 0; i < n; i++) {
          const m0 = (i / n) * 620;
          const m1 = ((i + 1) / n) * 620;
          const al = (0.32 - 0.22 * smooth(380, 620, m0)) * aCross * (1 - 0.0);
          g.fillStyle = acc;
          g.globalAlpha = al;
          g.beginPath();
          g.moveTo(X(m0), Y(tcOf(m0) + half));
          g.lineTo(X(m1), Y(tcOf(m1) + half));
          g.lineTo(X(m1), Y(tcOf(m1) - half));
          g.lineTo(X(m0), Y(tcOf(m0) - half));
          g.closePath();
          g.fill();
        }
        // centreline beyond reliable range is only an extrapolation: dotted
        g.setLineDash([1.5, 4]);
        g.strokeStyle = acc;
        g.globalAlpha = 0.55 * aCross;
        g.lineWidth = 1.2;
        g.beginPath();
        for (let mu = 380; mu <= CP.mu; mu += 10) {
          mu === 380 ? g.moveTo(X(mu), Y(tcOf(mu))) : g.lineTo(X(mu), Y(tcOf(mu)));
        }
        g.stroke();
        g.restore();
        const hi = idx === IX.crossover ? 0.95 : 0.8;
        txt(L('plasma'), 330, 182, { align: 'center', a: hi * aCross });
        txt(L('hadronGas'), 200, 70, { align: 'center', a: hi * aCross });
        txt(L('crossover'), 235, tcOf(235) - 22, { align: 'center', a: hi * aCross });
        txt(L('tcRange'), 14, tcOf(14) - 24, { mono: true, a: 0.85 * aCross });
      }
      // ---- early universe / LHC marker
      const aEU = a[IX['early-universe']];
      if (aEU > 0.01) {
        g.save();
        g.globalAlpha = 0.9 * aEU;
        g.strokeStyle = acc;
        g.fillStyle = acc;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(X(14), Y(196));
        g.lineTo(X(14), Y(170) - 6);
        g.stroke();
        arrowHead(g, X(14), Y(170), Math.PI / 2, 7);
        g.restore();
        txt(L('earlyUniverse'), 36, 188, { a: 0.95 * aEU });
        txt(L('cooling'), 36, 174, { a: 0.6 * aEU, italic: true });
      }
      // ---- liquid–gas
      const aLG = a[IX['liquid-gas']];
      if (aLG > 0.01) {
        g.save();
        g.globalAlpha = aLG;
        g.strokeStyle = '#e4684f';
        g.lineWidth = 1.5;
        g.beginPath();
        for (let i = 0; i <= 20; i++) {
          const T = (i / 20) * 16;
          const mu = 923 - 18 * (T / 16) ** 1.6;
          i ? g.lineTo(X(mu), Y(T)) : g.moveTo(X(mu), Y(T));
        }
        g.stroke();
        g.fillStyle = '#e4684f';
        g.beginPath();
        g.arc(X(905), Y(16), 3.2, 0, Math.PI * 2);
        g.fill();
        g.restore();
        txt(L('liquidGas'), 893, 40, { align: 'right', a: 0.9 * aLG });
        txt(L('liquidGasT'), 893, 28, { align: 'right', mono: true, a: 0.8 * aLG });
      }
      // ---- nuclear matter
      if (aNM > 0.01) {
        g.save();
        g.globalAlpha = aNM;
        g.fillStyle = '#e4684f';
        g.beginPath();
        g.arc(X(923), Y(0), 4.5, 0, Math.PI * 2);
        g.fill();
        g.restore();
        txt(L('nuclei'), 896, 12, { align: 'right', a: 0.92 * aNM });
        txt(L('n0'), 896, 3.5, { align: 'right', mono: true, a: 0.8 * aNM });
      }
      // ---- hypothetical: first-order line, critical point
      const aF = a[IX['first-order']];
      if (aF > 0.01) {
        g.save();
        g.globalAlpha = aF;
        g.strokeStyle = fg;
        g.lineWidth = 1.5;
        g.setLineDash([7, 5]);
        g.beginPath();
        for (let mu = CP.mu; mu <= 1060; mu += 8) {
          const T = foLine(mu);
          mu === CP.mu ? g.moveTo(X(mu), Y(T)) : g.lineTo(X(mu), Y(Math.max(0, T)));
        }
        g.stroke();
        g.restore();
        txt(L('firstOrder'), 800, 98, { a: 0.9 * aF });
        txt(L('hypothesis'), 800, 86, { a: 0.7 * aF, italic: true });
      }
      const aC = a[IX['critical-point']];
      if (aC > 0.01) {
        g.save();
        g.globalAlpha = aC;
        g.strokeStyle = fg;
        g.lineWidth = 1;
        g.setLineDash([3, 3]);
        g.beginPath();
        g.ellipse(X(CP.mu), Y(CP.T), X(CP.mu + 85) - X(CP.mu), Y(CP.T - 22) - Y(CP.T), 0, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = ctx.theme.bg;
        g.beginPath();
        g.arc(X(CP.mu), Y(CP.T), 5, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = fg;
        g.lineWidth = 1.8;
        g.stroke();
        g.restore();
        txt(L('criticalPoint'), CP.mu, CP.T + 34, { align: 'center', a: 0.95 * aC });
        txt(L('somewhere'), CP.mu, CP.T - 34, { align: 'center', a: 0.7 * aC, italic: true });
      }
      // ---- freeze-out curve, beam-energy scan
      const iScan = IX['energy-scan'];
      const iCurve = IX['freezeout-curve'];
      const aScan = a[iScan];
      const aCurve = a[iCurve];
      const aExp = a[IX.experiments];
      if (aScan > 0.01) {
        const fNow = idx === iScan ? progD : 1;
        const arrowsA = (idx === iScan ? 1 : idx === iCurve ? 0.28 : 0) * aScan;
        // arrows: fireball cooling paths for six √s
        if (arrowsA > 0.01) {
          const arrow = (sq: number, emphasis: number) => {
            const f = fracOf(sq);
            const fp = foPoint(f);
            const Ti = 120 + (420 - 120) * f01(sq);
            const mui = 0.45 * fp.mu;
            // clip start at plot top
            let x0 = mui;
            let y0 = Ti;
            if (y0 > T_MAX) {
              const t = (y0 - T_MAX) / (y0 - fp.T);
              x0 = mui + (fp.mu - mui) * t;
              y0 = T_MAX;
            }
            g.save();
            g.strokeStyle = acc;
            g.fillStyle = acc;
            g.globalAlpha = arrowsA * (0.25 + 0.75 * emphasis);
            g.lineWidth = 1 + 1.4 * emphasis;
            g.beginPath();
            g.moveTo(X(x0), Y(y0));
            g.lineTo(X(fp.mu), Y(fp.T));
            g.stroke();
            const ang = Math.atan2(Y(fp.T) - Y(y0), X(fp.mu) - X(x0));
            arrowHead(g, X(fp.mu), Y(fp.T), ang, 6 + 3 * emphasis);
            g.restore();
          };
          function f01(sq: number) {
            return Math.log(sq / S_LO) / Math.log(S_HI / S_LO);
          }
          for (const sq of S_LIST) arrow(sq, 0);
          if (idx === iScan) arrow(sOf(fNow), 1);
        }
        // trail along freeze-out points
        const trailN = 120;
        const upto = idx >= iCurve ? 1 : fNow;
        const lineA = idx >= IX.experiments ? 0.4 : 0.9;
        g.save();
        g.strokeStyle = acc;
        g.globalAlpha = (idx === iScan ? 0.55 : lineA) * aScan;
        g.lineWidth = 1.5;
        g.beginPath();
        for (let i = 0; i <= trailN; i++) {
          const f = (i / trailN) * upto;
          const q = foPoint(f);
          i ? g.lineTo(X(q.mu), Y(q.T)) : g.moveTo(X(q.mu), Y(q.T));
        }
        g.stroke();
        g.restore();
        // marker
        if (idx === iScan || idx === iCurve) {
          const fm = idx === iScan ? fNow : progD;
          const q = foPoint(fm);
          g.save();
          g.fillStyle = acc;
          g.strokeStyle = ctx.theme.bg;
          g.lineWidth = 2;
          g.beginPath();
          g.arc(X(q.mu), Y(q.T), 5, 0, Math.PI * 2);
          g.stroke();
          g.fill();
          g.restore();
          const label = `√s_NN = ${fmt(q.s, q.s < 10 ? 1 : 0)} GeV`;
          const readout = `μ_B = ${fmt(q.mu)} MeV  ·  T = ${fmt(q.T)} MeV`;
          g.save();
          g.font = FONT_MONO;
          g.fillStyle = fg;
          g.globalAlpha = 0.9;
          g.textAlign = 'left';
          g.textBaseline = 'alphabetic';
          g.fillText(label, r.x + 14, r.y + r.h - 34);
          g.fillText(readout, r.x + 14, r.y + r.h - 16);
          g.restore();
        }
      }
      if (aCurve > 0.01) {
        const pts = S_LIST.map((sq) => ({ f: fracOf(sq), ...foPoint(fracOf(sq)) }));
        for (const q of pts) {
          const vis = idx === iCurve ? smooth(q.f - 0.02, q.f + 0.01, progD) : 1;
          if (vis < 0.02) continue;
          g.save();
          g.globalAlpha = vis * aCurve * (idx >= IX.experiments ? 0.5 : 1);
          g.fillStyle = ctx.theme.bg;
          g.strokeStyle = acc;
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(X(q.mu), Y(q.T), 3.6, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          g.restore();
          if (idx <= iCurve && q.s < 1000 && q.s !== 62.4) txt(q.s >= 1000 ? `${fmt(q.s / 1000, 2)} TeV` : `${fmt(q.s, q.s < 10 ? 1 : 1)} GeV`, q.mu, q.T + 13, { mono: true, a: 0.75 * vis * aCurve, align: q.s >= 1000 ? 'left' : 'center' });
        }
        txt(L('freezeout'), 250, tChem(250) - 36, { a: 0.9 * aCurve * (idx >= IX.experiments ? 0.5 : 1), align: 'center' });
      }
      // ---- experiments: lanes below the freeze-out curve
      if (aExp > 0.01) {
        g.save();
        g.fillStyle = ctx.theme.bg;
        g.globalAlpha = 0.62 * aExp;
        g.fillRect(r.x + 1, r.y - 20, r.w, r.h + 19);
        g.restore();
        const lane = 13;
        const fontLegend = FONT_SANS;
        EXPS.forEach((e, k) => {
          const mLo = muOf(e.hi);
          const mHi = muOf(e.lo);
          const off = 12 + k * lane;
          const col = e.collider ? acc : ctx.theme.accent2;
          g.save();
          g.globalAlpha = 0.85 * aExp;
          g.strokeStyle = col;
          g.fillStyle = col;
          g.lineWidth = 5;
          g.lineCap = 'butt';
          if (e.planned) g.setLineDash([6, 4]);
          g.beginPath();
          const n = 40;
          const wMin = Math.max(mHi, mLo + 6);
          for (let i = 0; i <= n; i++) {
            const mu = mLo + ((wMin - mLo) * i) / n;
            const y = Math.min(r.y + r.h - 3, Y(tChem(mu)) + off);
            i ? g.lineTo(X(mu), y) : g.moveTo(X(mu), y);
          }
          g.stroke();
          g.restore();
          const yEnd = Math.min(r.y + r.h - 3, Y(tChem(wMin)) + off);
          g.save();
          g.font = fontLegend;
          g.fillStyle = fg;
          g.globalAlpha = 0.9 * aExp;
          g.textAlign = 'left';
          g.textBaseline = 'middle';
          const lw = g.measureText(L(e.key)).width;
          if (X(wMin) + 8 + lw > W - 4) {
            g.textAlign = 'right';
            g.fillText(L(e.key), W - 6, yEnd - 9);
          } else g.fillText(L(e.key), X(wMin) + 8, yEnd);
          g.restore();
        });
        // key
        g.save();
        g.font = FONT_SANS;
        g.textBaseline = 'middle';
        g.globalAlpha = 0.85 * aExp;
        const kx = r.x + 14;
        const ky = r.y + r.h - 62;
        g.fillStyle = acc;
        g.fillRect(kx, ky - 2.5, 18, 5);
        g.fillStyle = fg;
        g.fillText(L('keyCollider'), kx + 26, ky);
        g.fillStyle = ctx.theme.accent2;
        g.fillRect(kx, ky + 15 - 2.5, 18, 5);
        g.fillStyle = fg;
        g.fillText(L('keyFixed'), kx + 26, ky + 15);
        g.strokeStyle = ctx.theme.accent2;
        g.lineWidth = 5;
        g.setLineDash([4, 3]);
        g.beginPath();
        g.moveTo(kx, ky + 30);
        g.lineTo(kx + 18, ky + 30);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = fg;
        g.fillText(L('keyPlanned'), kx + 26, ky + 30);
        g.restore();
      }
    }

    const apply = (i: number, p: number, imm: boolean) => {
      idx = i;
      prog = clamp(p);
      if (imm || ctx.reducedMotion) {
        for (let k = 0; k < a.length; k++) a[k] = idx >= k ? 1 : 0;
        progD = prog;
        if (sketchOn === null) sketchOn = !ctx.container.closest('#phase-diagram');
        sketch = idx === 0 && sketchOn ? 1 : 0;
      }
      c.animate = true;
      c.invalidate();
    };
    return {
      setState(state: string, opts: SetStateOptions) {
        const i = Math.max(0, STATES.indexOf(state as (typeof STATES)[number]));
        apply(i, opts.immediate || ctx.reducedMotion ? 1 : opts.direction > 0 ? 0 : 1, opts.immediate);
      },
      setProgress(p) {
        prog = clamp(p);
        c.animate = true;
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

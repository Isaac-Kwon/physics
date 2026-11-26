/**
 * sc.walkthrough-its3-heavyflavour — D⁰ → K⁻π⁺ and the impact-parameter resolution of ITS3 (schematic, not to scale).
 *  goal:        true-scale view (µm): D⁰ with p_T = 5 GeV/c, βγ = p/m = 5/1.865 = 2.68, flight L = βγ cτ = 2.68 × 123 µm ≈ 330 µm;
 *               decay angles to the D direction: K⁻ +0.15 rad, π⁺ −0.09 rad → d₀ = L sin θ ≈ 49 µm and 30 µm.
 *  vertex…trick: "track frame": horizontal axis = radial distance r (mm), vertical = transverse offset (µm), strongly magnified.
 *               The real track is the line y = 0; the primary vertex sits d₀ = 49 µm away. Hits are the true position + a fixed
 *               offset of a few µm (σ_hit = 5 µm). Fit = least-squares straight line through the layers.
 *               Band at radius x: hit part 5 µm·√(1/n + (x − r̄)²/S_xx), scattering part from the first layer and the beam pipe
 *               (Highland at p = 1 GeV/c); see _sc3-common.ts. Geometries: ITS3 (19/25/31 mm, 0.07 % X₀), ITS2-like (22.4/30.1/37.8 mm, 0.35 % X₀).
 */
import type { SceneModule } from '../shared/types';
import { clamp, dot, dim, ease, fadeStage, fitVarFactor, ITS2, ITS3, ln, poly, rect, ring, seg, sigmaHit, sigmaMs, SIGMA_HIT, txt, type Fr, type G, type Geom } from './_sc3-common';

const STATES = ['goal', 'vertex', 'extrapolate', 'displaced', 'trick'] as const;
const CTAU = 123; // µm
const M_D = 1.865; // GeV
const P_D = 5;
const L_FLIGHT = (P_D / M_D) * CTAU; // µm
const TH_K = 0.15;
const TH_PI = -0.09;
const D0 = L_FLIGHT * Math.sin(TH_K); // µm, the displaced track
const P_TRK = 1; // GeV/c for the scattering term
const HIT_DY = [4, -5, 3]; // µm offsets of the measured hits

/** Least-squares line y = a + b r through (r_i, y_i). */
function fit(r: number[], y: number[]) {
  const n = r.length;
  const rb = r.reduce((p, q) => p + q, 0) / n;
  const yb = y.reduce((p, q) => p + q, 0) / n;
  let sxx = 0;
  let sxy = 0;
  r.forEach((ri, i) => {
    sxx += (ri - rb) ** 2;
    sxy += (ri - rb) * (y[i] - yb);
  });
  const b = sxy / sxx;
  return { a: yb - b * rb, b };
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const fmt = (v: number, d = 0) => ctx.formatNumber(v, { maximumFractionDigits: d, minimumFractionDigits: d });

    // ---- goal: true-scale transverse view
    const drawGoal = (g: G, f: Fr) => {
      const k = Math.min((f.w - 150) / 700, (f.h - 140) / 260);
      const x0 = 60;
      const yc = f.h / 2 + 10;
      const X = (u: number) => x0 + u * k;
      const Y = (v: number) => yc - v * k;
      const a = ease(seg(f.ts, 0, 1.2));
      const b = ease(seg(f.ts, 1.2, 2.2));
      // primary tracks
      [0.7, 0.35, -0.5, -0.9, 2.5, -2.4].forEach((th, i) => {
        const len = 300 + 20 * i;
        ln(g, X(0), Y(0), X(len * Math.cos(th)), Y(len * Math.sin(th)), { alpha: 0.28 * b, width: 1 });
      });
      // D⁰ flight (neutral: dashed)
      const Lx = L_FLIGHT * a;
      ln(g, X(0), Y(0), X(Lx), Y(0), { alpha: 0.8, dash: [4, 3], width: 1.25 });
      // decay tracks
      const len = Math.min(560, (f.w - 24 - X(L_FLIGHT)) / k / Math.cos(TH_K));
      ln(g, X(L_FLIGHT), Y(0), X(L_FLIGHT + len * b * Math.cos(TH_K)), Y(len * b * Math.sin(TH_K)), { color: accent, alpha: 0.95 * (b > 0 ? 1 : 0), width: 1.5 });
      ln(g, X(L_FLIGHT), Y(0), X(L_FLIGHT + len * b * Math.cos(TH_PI)), Y(len * b * Math.sin(TH_PI)), { color: accent2, alpha: 0.95 * (b > 0 ? 1 : 0), width: 1.5 });
      dot(g, X(0), Y(0), 3.5, fg, 0.95);
      txt(g, L('pv'), X(0) - 8, Y(0) + 22, { align: 'left', alpha: 0.9 });
      if (a > 0.95) {
        ring(g, X(L_FLIGHT), Y(0), 4, fg, 0.95);
        txt(g, L('sv'), X(L_FLIGHT) + 4, Y(0) + 26, { alpha: 0.9 });
        dim(g, X(0), Y(0) - 22, X(L_FLIGHT), Y(0) - 22, `L = βγcτ ≈ ${fmt(L_FLIGHT)} µm`, { off: -14, alpha: 0.85 });
        txt(g, `D⁰: p_T = ${P_D} GeV/c, βγ = ${fmt(P_D / M_D, 1)}, cτ = ${CTAU} µm`, 16, 22, { mono: true, alpha: 0.85 });
      }
      if (b > 0.9) {
        txt(g, 'K⁻', X(L_FLIGHT + len * Math.cos(TH_K)) - 2, Y(len * Math.sin(TH_K)) - 10, { align: 'right', color: accent, mono: true, alpha: 1 });
        txt(g, 'π⁺', X(L_FLIGHT + len * Math.cos(TH_PI)) - 2, Y(len * Math.sin(TH_PI)) + 12, { align: 'right', color: accent2, mono: true, alpha: 1 });
        txt(g, L('primaries'), X(300 * Math.cos(0.7)) + 6, Y(300 * Math.sin(0.7)) - 4, { alpha: 0.6 * b });
      }
      dim(g, 16, f.h - 40, 16 + 100 * k, f.h - 40, '100 µm', { off: 14, alpha: 0.7 });
      txt(g, L('trueScale'), 16, f.h - 14, { alpha: 0.55 });
    };

    // ---- track-frame drawing
    interface FrameOpts {
      geom: Geom;
      n: number;
      hitsShown: number;
      band: number; // 0..1 reveal of the band
      primary: boolean;
      d0: boolean;
      title?: string;
      rmax: number;
      sig?: boolean;
      showLine?: boolean;
      axisLabel?: boolean;
    }
    const frame = (g: G, R: Rect, o: FrameOpts) => {
      const kx = (R.w - 140) / o.rmax;
      const x0 = R.x + 100;
      const yc = R.y + R.h / 2;
      const ky = (R.h * 0.4) / 95; // px per µm
      const X = (r: number) => x0 + r * kx;
      const Y = (v: number) => yc - v * ky;
      const gm = o.geom;
      const rs = gm.r.slice(0, o.n);
      // radial axis
      ln(g, x0, R.y + R.h - 6, X(o.rmax), R.y + R.h - 6, { alpha: 0.4 });
      for (let r = 0; r <= o.rmax; r += 10) {
        ln(g, X(r), R.y + R.h - 6, X(r), R.y + R.h - 2, { alpha: 0.5 });
        txt(g, String(r), X(r), R.y + R.h + 6, { mono: true, align: 'center', alpha: 0.55 });
      }
      if (o.axisLabel !== false) txt(g, L('radial'), X(o.rmax), R.y + R.h + 20, { align: 'right', alpha: 0.6 });
      // beam pipe and layers
      ln(g, X(gm.rPipe), R.y + 4, X(gm.rPipe), R.y + R.h - 8, { color: accent2, alpha: 0.7, dash: [4, 3] });
      rs.forEach((r) => ln(g, X(r), R.y + 4, X(r), R.y + R.h - 8, { color: accent, alpha: 0.75, width: 2.5 }));
      txt(g, L('pipe'), X(gm.rPipe) - 6, R.y + 14, { align: 'right', color: accent2, alpha: 0.9 });
      rs.forEach((r, i) => txt(g, R.w < 500 ? `L${i}` : `${L('layer')} ${i}`, X(r) + 6, R.y + 14, { color: accent, alpha: 0.9 }));
      // primary vertex and the true track (line y = 0)
      ln(g, x0, Y(0), X(o.rmax), Y(0), { alpha: 0.18, dash: [2, 4] });
      dot(g, X(0), Y(-D0), 3.5, fg, 0.95);
      txt(g, L('pvShort'), X(0) + 6, Y(-D0) + 14, { alpha: 0.85 });
      // hits
      const hy = rs.map((_, i) => HIT_DY[i]);
      rs.forEach((r, i) => {
        if (i < o.hitsShown) {
          dot(g, X(r), Y(hy[i]), 3.2, accent2, 1);
        }
      });
      const ft = fit(rs, hy);
      const yf = (r: number) => ft.a + ft.b * r;
      if (o.hitsShown >= o.n) {
        // line through the hits, extrapolated back to the vertex region
        const xs = rs[rs.length - 1] + 3;
        ln(g, X(0), Y(yf(0)), X(xs), Y(yf(xs)), { color: fg, alpha: 0.75, width: 1.25, dash: [0, 0] });
        // band
        if (o.band > 0) {
          const N = 50;
          const rTop = rs[rs.length - 1];
          const up1: [number, number][] = [];
          const dn1: [number, number][] = [];
          const up2: [number, number][] = [];
          const dn2: [number, number][] = [];
          for (let i = 0; i <= N; i++) {
            const r = rTop * (1 - (i / N) * o.band);
            const sh = SIGMA_HIT * Math.sqrt(fitVarFactor(rs, r));
            const sm = sigmaMs({ ...gm, r: rs }, r, P_TRK);
            const st = Math.hypot(sh, sm);
            up1.push([X(r), Y(yf(r) + sh)]);
            dn1.push([X(r), Y(yf(r) - sh)]);
            up2.push([X(r), Y(yf(r) + st)]);
            dn2.push([X(r), Y(yf(r) - st)]);
          }
          poly(g, [...up2, ...dn2.reverse()], { close: true, fill: accent2, fillAlpha: 0.2, color: accent2, alpha: 0.7, width: 1 });
          poly(g, [...up1, ...dn1.reverse()], { close: true, fill: accent, fillAlpha: 0.35, color: accent, alpha: 0.9, width: 1 });
        }
        if (o.sig && o.band > 0.99) {
          const sh = sigmaHit({ ...gm, r: rs }, 0);
          const sm = sigmaMs({ ...gm, r: rs }, 0, P_TRK);
          const st = Math.hypot(sh, sm);
          txt(g, `σ(d₀) = ${fmt(st)} µm`, X(0) + 10, Y(yf(0) + st) - 14, { mono: true, color: accent2, alpha: 1 });
        }
      }
      // primary track: passes through the vertex (d₀ ≈ 0)
      if (o.primary) {
        const sl = 3.5;
        const xs = rs[rs.length - 1] + 3;
        ln(g, X(0), Y(-D0), X(xs), Y(-D0 + sl * xs), { color: fg, alpha: 0.5, width: 1 });
        rs.forEach((r) => dot(g, X(r), Y(-D0 + sl * r), 2.6, fg, 0.7));
      }
      if (o.d0) {
        const xx = X(0) - 14;
        ln(g, xx, Y(0), xx, Y(-D0), { color: accent, alpha: 1, width: 1.5 });
        ln(g, xx - 4, Y(0), xx + 4, Y(0), { color: accent, alpha: 1 });
        ln(g, xx - 4, Y(-D0), xx + 4, Y(-D0), { color: accent, alpha: 1 });
        txt(g, `d₀ ≈ ${fmt(D0)} µm`, xx - 8, (Y(0) + Y(-D0)) / 2, { align: 'right', mono: true, color: accent, alpha: 1 });
      }
      return { X, Y, ky, kx };
    };

    const drawVertex = (g: G, f: Fr) => {
      const R: Rect = { x: 0, y: 36, w: f.w, h: f.h - 80 };
      const hs = f.ts > 1e2 ? 2 : Math.floor(seg(f.ts, 0.3, 1.5) * 2.01);
      frame(g, R, { geom: ITS3, n: 2, hitsShown: hs, band: 0, primary: false, d0: false, rmax: 35 });
      txt(g, L('twoHits'), 16, 20, { alpha: 0.85 });
      txt(g, L('transverse'), 16, f.h - 12, { alpha: 0.55 });
    };
    const drawExtrapolate = (g: G, f: Fr) => {
      const R: Rect = { x: 0, y: 58, w: f.w, h: f.h - 102 };
      const band = ease(seg(f.ts, 0.4, 2.4));
      frame(g, R, { geom: ITS3, n: 3, hitsShown: 3, band, primary: false, d0: false, rmax: 35, sig: true });
      txt(g, L('hitPart'), 16, 20, { color: accent, alpha: 1 });
      txt(g, L('msPart'), 16, 38, { color: accent2, alpha: 1 });
      txt(g, L('transverse'), 16, f.h - 12, { alpha: 0.55 });
    };
    const drawDisplaced = (g: G, f: Fr) => {
      const R: Rect = { x: 0, y: 58, w: f.w, h: f.h - 102 };
      const st = Math.hypot(sigmaHit(ITS3, 0), sigmaMs(ITS3, 0, P_TRK));
      frame(g, R, { geom: ITS3, n: 3, hitsShown: 3, band: 1, primary: true, d0: true, rmax: 35, sig: false });
      txt(g, `${L('displacedTrack')}: d₀ ≈ ${fmt(D0)} µm = ${fmt(D0 / st, 1)} σ`, 16, 20, { mono: true, color: accent, alpha: 1 });
      txt(g, `${L('primaryTrack')}: d₀ ≈ 0`, 16, 38, { mono: true, alpha: 0.8 });
      txt(g, L('transverse'), 16, f.h - 12, { alpha: 0.55 });
    };
    const drawTrick = (g: G, f: Fr) => {
      const half = (f.h - 40) / 2;
      const items: { gm: Geom; name: string; y: number }[] = [
        { gm: ITS2, name: 'ITS2', y: 28 },
        { gm: ITS3, name: 'ITS3', y: 28 + half },
      ];
      const band = ease(seg(f.ts, 0.2, 1.8));
      items.forEach((it, i) => {
        const R: Rect = { x: 0, y: it.y, w: f.w, h: half - 34 };
        const fr = frame(g, R, { geom: it.gm, n: 3, hitsShown: 3, band, primary: false, d0: false, rmax: 45, sig: false, axisLabel: i === 1 });
        void fr;
        const col = i === 0 ? accent2 : accent;
        const sd = Math.hypot(sigmaHit(it.gm, 0), sigmaMs(it.gm, 0, P_TRK));
        txt(g, `${it.name}: r₁ = ${fmt(it.gm.r[0], it.gm.r[0] < 20 ? 0 : 1)} mm, x/X₀ = ${fmt(it.gm.x * 100, 2)} %,  σ(d₀) = ${fmt(sd)} µm`, 16, it.y - 12, { mono: true, color: col, alpha: 1 });
      });
      txt(g, L('trickNote'), 16, f.h - 12, { alpha: 0.55 });
    };

    void clamp;
    void rect;
    return fadeStage(ctx, {
      states: STATES,
      draws: { goal: drawGoal, vertex: drawVertex, extrapolate: drawExtrapolate, displaced: drawDisplaced, trick: drawTrick },
      anim: 3,
    });
  },
};
export default mod;

type Rect = { x: number; y: number; w: number; h: number };

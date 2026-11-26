/**
 * sc.charge-sharing — a charge cloud diffuses while it drifts (σ = √(2Dt) ≈ 8 µm), lands near a pixel boundary,
 * is shared between neighbours; centroid of the shared charge vs the binary pixel-centre estimate (σ = p/√12).
 * Numbers: pitch 50 µm, depth 300 µm, σ(300 µm) = 8 µm (SC.DIFFUSION_SIGMA_UM), hit 4 µm right of the boundary.
 * The centroid is the plain charge-weighted mean of pixel centres, i.e. before any η-correction.
 */
import type { SceneModule } from '../shared/types';
import { gaussian, mulberry32 } from '../shared/canvas2d';
import { SC } from '../../data/semiconductor';
import { box, dimH, dimV, dot, interpolateInferno, line, makeLayer, Phi, plate, txt, arrow, createStage, type G } from './_sc2-common';

const STATES = ['cloud', 'pixels', 'centroid', 'binary'] as const;
type P = { side: number; end: number; cen: number; bin: number };
const TARGETS: Record<string, P> = {
  cloud: { side: 1, end: 0, cen: 0, bin: 0 },
  pixels: { side: 0, end: 1, cen: 0, bin: 0 },
  centroid: { side: 0, end: 1, cen: 1, bin: 0 },
  binary: { side: 0, end: 1, cen: 0, bin: 1 },
};

const PITCH = 50; // µm
const DEPTH = 300; // µm
const SIG = SC.DIFFUSION_SIGMA_UM.value as number; // µm, at the electrodes
const XB = PITCH / 2; // pixel boundary between the middle and the right column (µm from the middle pixel centre)
const X0 = XB + 4; // true hit position (µm)
const THR = 0.4; // fraction of the charge needed to fire a pixel in the binary picture
const D0 = 20; // depth where the packet starts (µm)

// Charge fractions per pixel (3 columns × 3 rows), from integrating the Gaussian cloud over each pixel.
const colEdges = [-1.5, -0.5, 0.5, 1.5].map((k) => k * PITCH);
const Fcol = [0, 1, 2].map((i) => Phi((colEdges[i + 1] - X0) / SIG) - Phi((colEdges[i] - X0) / SIG));
const Frow = [0, 1, 2].map((j) => Phi((colEdges[j + 1] - 0) / SIG) - Phi((colEdges[j] - 0) / SIG));
const Q = (i: number, j: number) => Fcol[i] * Frow[j];
const CENTROID_X = [0, 1, 2].reduce((a, i) => a + Fcol[i] * (i - 1) * PITCH, 0) / Fcol.reduce((a, b) => a + b, 0);

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg, bg } = ctx.theme;
    const rnd = mulberry32(61);
    const pack = Array.from({ length: 110 }, () => ({ gx: gaussian(rnd), gy: gaussian(rnd) }));
    const layS = makeLayer();
    const layE = makeLayer();
    const sigAt = (d: number) => SIG * Math.sqrt(Math.max(0, d - D0) / (DEPTH - D0));

    const drawSide = (g: G, w: number, h: number, t: number, reduced: boolean) => {
      const ks = Math.min((h - 110) / DEPTH, (w - 150) / (5 * PITCH), 1.6);
      const sw = 5 * PITCH * ks;
      const sh = DEPTH * ks;
      const x0 = Math.max(70, (w - sw) / 2 - 40);
      const y0 = 46;
      const xc = x0 + sw / 2; // track at the boundary between pixel 2 and 3 (centre of the strip)
      box(g, x0, y0, sw, sh, { fill: accent, fa: 0.1, stroke: fg, alpha: 0.4 });
      // pixel electrodes (copper) at the bottom, pixel boundaries dashed
      for (let i = 0; i < 5; i++) {
        const ex = x0 + (i + 0.5) * PITCH * ks;
        box(g, ex - 15 * ks, y0 + sh, 30 * ks, 4, { fill: accent2 });
        if (i > 0) line(g, x0 + i * PITCH * ks, y0 + sh - 18, x0 + i * PITCH * ks, y0 + sh, fg, { alpha: 0.35, dash: [2, 3] });
      }
      txt(g, L('backplane'), x0 + sw + 8, y0 + 2, { alpha: 0.6 });
      box(g, x0, y0 - 3, sw, 3, { fill: accent2, alpha: 0.7 });
      // incoming particle
      arrow(g, xc, y0 - 34, xc, y0 + D0 * ks, { color: fg, width: 1.25, alpha: 0.8 });
      txt(g, L('particle'), xc + 10, y0 - 12, { alpha: 0.8 });
      // ghost 1σ ellipses of the packet at three depths (σ grows like √t)
      for (const f of [0.3, 0.6]) {
        const d = D0 + f * (DEPTH - D0);
        g.save();
        g.strokeStyle = accent;
        g.globalAlpha = 0.35;
        g.setLineDash([3, 3]);
        g.beginPath();
        g.ellipse(xc, y0 + d * ks, Math.max(1.5, sigAt(d) * ks), Math.max(1.5, sigAt(d) * ks), 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
      // animated packet: pairs made at one point of the track, drifting down while spreading
      const T = 4.4;
      const ph = reduced ? 1 : Math.min(1, (t % T) / 3.4);
      const d = D0 + ph * (DEPTH - D0);
      const sg = sigAt(d) * ks;
      for (const p of pack) {
        dot(g, xc + p.gx * sg, y0 + d * ks + p.gy * sg * 0.8, 1.6, accent, 0.9);
      }
      // dimensions and labels
      dimV(g, x0 - 14, y0, y0 + sh, `${ctx.formatNumber(DEPTH)} µm`, fg, { side: -1 });
      dimH(g, x0 + 2 * PITCH * ks, x0 + 3 * PITCH * ks, y0 + sh + 18, `p = ${PITCH} µm`, fg);
      const bx = x0 + sw + 8;
      line(g, xc + sg + 4, y0 + sh - 6, bx - 2, y0 + sh - 26, fg, { alpha: 0.4 });
      txt(g, `σ ≈ ${ctx.formatNumber(SIG)} µm`, bx, y0 + sh - 26, { mono: true, alpha: 0.95 });
      txt(g, L('sigmaGrows'), bx, y0 + sh - 9, { alpha: 0.7 });
      txt(g, L('cloudOf'), 14, 16, { alpha: 0.75 });
    };

    const drawEnd = (g: G, w: number, h: number, p: P) => {
      const c = Math.min(130, (h - 120) / 3, (w - 70) / 3);
      const k = c / PITCH;
      const gx = w / 2 - 1.5 * c;
      const gy = h / 2 - 1.5 * c - 4;
      const cxm = gx + 1.5 * c; // centre of the middle pixel
      const cym = gy + 1.5 * c;
      const sx = (xum: number) => cxm + xum * k;
      const binary = p.bin > 0.5;
      // pixels
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const q = Q(i, j);
          const fired = q >= THR;
          const px = gx + i * c;
          const py = gy + j * c;
          const col = interpolateInferno(0.12 + 0.78 * Math.min(1, q));
          g.save();
          g.fillStyle = col;
          g.globalAlpha = (1 - p.bin) * (q > 0.004 ? 0.85 : 0.1);
          g.fillRect(px, py, c, c);
          g.globalAlpha = p.bin * (fired ? 0.5 : 0);
          g.fillStyle = accent;
          g.fillRect(px, py, c, c);
          g.restore();
          box(g, px, py, c, c, { stroke: fg, alpha: 0.4 });
        }
      }
      // charge percentages (hidden in the binary picture, where only fired / not fired remains)
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const q = Q(i, j);
          if (q < 0.004 && p.bin < 0.5) continue;
          const px = gx + (i + 0.5) * c;
          const py = gy + (j + 0.5) * c;
          if (!binary && q >= 0.004) txt(g, `${ctx.formatNumber(Math.round(q * 100))} %`, px, py + c * 0.34, { mono: true, align: 'center', alpha: 1, color: q > 0.45 ? '#111' : '#fff' });
          if (binary && j === 1 && i >= 1) txt(g, q >= THR ? L('hit') : L('belowThreshold'), px, py + c * 0.3, { align: 'center', alpha: q >= THR ? 1 : 0.7 });
        }
      }
      // Gaussian cloud outline (1σ, 2σ) and the true hit
      const hx = sx(X0);
      const hy = cym;
      g.save();
      g.strokeStyle = fg;
      g.lineWidth = 1;
      g.globalAlpha = 0.6 * (1 - p.bin * 0.6);
      g.setLineDash([3, 3]);
      for (const m of [1, 2]) {
        g.beginPath();
        g.arc(hx, hy, m * SIG * k, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
      txt(g, `σ = ${ctx.formatNumber(SIG)} µm`, hx + 2 * SIG * k * 0.72 + 4, hy - 2 * SIG * k * 0.72 - 6, { mono: true, alpha: 0.7 });
      dot(g, hx, hy, 3.2, accent);
      // pitch dimension below the grid
      dimH(g, gx, gx + c, gy + 3 * c + 16, `p = ${PITCH} µm`, fg);

      // centroid: cross at the charge-weighted mean of the pixel centres, residual to the true hit
      if (p.cen > 0.01) {
        const cx = sx(CENTROID_X);
        g.save();
        g.globalAlpha = p.cen;
        g.strokeStyle = accent2;
        g.lineWidth = 1.75;
        g.beginPath();
        g.moveTo(cx - 6, hy - 6);
        g.lineTo(cx + 6, hy + 6);
        g.moveTo(cx - 6, hy + 6);
        g.lineTo(cx + 6, hy - 6);
        g.stroke();
        g.restore();
        // pixel-centre markers used by the weighting
        for (const i of [1, 2]) dot(g, gx + (i + 0.5) * c, cym, 2, fg, 0.55 * p.cen);
        // residual (true hit to centroid), drawn on a bar above the grid so it stays readable at any zoom
        const by = gy - 14;
        line(g, hx, hy - 4, hx, by, fg, { alpha: 0.35 * p.cen, dash: [2, 3] });
        line(g, cx, hy - 6, cx, by, fg, { alpha: 0.35 * p.cen, dash: [2, 3] });
        line(g, Math.min(hx, cx), by, Math.max(hx, cx), by, accent2, { lw: 2, alpha: p.cen });
        plate(g, bg, `${L('residual')} ${ctx.formatNumber(CENTROID_X - (X0), { maximumFractionDigits: 1 })} µm`, (hx + cx) / 2, by - 12, { mono: true, align: 'center', alpha: p.cen });
        plate(g, bg, L('weighted'), cx + 12, hy + c * 0.62, { alpha: p.cen, color: accent2 });
        plate(g, bg, L('trueHit'), hx - 14, hy - c * 0.36, { alpha: p.cen, align: 'right' });
      }

      // binary: marker at the centre of the fired pixel; uniform error box of width p
      if (p.bin > 0.01) {
        const px = gx + 2.5 * c;
        g.save();
        g.globalAlpha = p.bin;
        box(g, gx + 2 * c, gy + c, c, c, { stroke: accent2, lw: 2 });
        g.fillStyle = accent2;
        g.beginPath();
        g.arc(px, cym, 4, 0, Math.PI * 2);
        g.fill();
        g.restore();
        const by = gy - 14;
        line(g, gx + 2 * c, by, gx + 3 * c, by, accent2, { lw: 2, alpha: p.bin });
        line(g, gx + 2 * c, by - 4, gx + 2 * c, by + 4, accent2, { alpha: p.bin });
        line(g, gx + 3 * c, by - 4, gx + 3 * c, by + 4, accent2, { alpha: p.bin });
        plate(g, bg, `σ = p/√12 = ${ctx.formatNumber(PITCH / Math.sqrt(12), { maximumFractionDigits: 0 })} µm`, gx + 2.5 * c, by - 12, { mono: true, align: 'center', alpha: p.bin });
      }
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['cloud'],
      draw(g, s, p, env) {
        layS(g, s.w, s.h, p.side, (g2) => drawSide(g2, s.w, s.h, s.t, env.reduced));
        layE(g, s.w, s.h, p.end, (g2) => drawEnd(g2, s.w, s.h, p));
      },
    });
  },
};
export default mod;

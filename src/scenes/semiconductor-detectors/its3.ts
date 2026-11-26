/**
 * sc.its3 — scrub scene: from ITS2 to ITS3 (ALICE inner tracker; design values as of 2025).
 *  its2        end view, true radii: 22.4, 30.1, 37.8 | 194.4, 243.9, 342.3, 391.8 mm, polygons with the stave counts 12/16/20/24/30/42/48.
 *  limits      inner three layers zoomed; X₀ per layer: 0.35 % of which silicon (50 µm / 93.7 mm = 0.05 %).
 *  flat-wafer  300 mm wafer, stitched sensor 26 cm × π R(layer 0) ≈ 6 cm; thinning 775 µm → 50 µm.
 *  bending     arc of fixed length π R(layer 0) bent from flat to R = 19 mm.
 *  cylinder    two half-cylinders at 19, 25, 31 mm around the beam pipe; carbon-foam spacers, air flow along z.
 *  material    X₀ bars 0.35 % vs 0.07 %, and σ_d0(p_T): ITS2 shape from the simplified model in _sc3-common; ITS3 drawn as ITS2/2,
 *              the improvement quoted by the ALICE ITS3 design studies (LoI/TDR: "about a factor of two over all momenta").
 *              (The 3-layer toy model alone would understate it: it ignores ITS3's smaller pixels and the full-detector fit.)
 */
import type { SceneModule } from '../shared/types';
import { plot, type Rect } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { dim, ease, fadeStage, hatch, ITS2, ITS3, ln, poly, rect, seg, sigmaD0, txt, X0_SI_MM, type Fr, type G, wideOf } from './_sc3-common';
import { drawSheet } from './_sc3-sheet';

const STATES = ['its2', 'limits', 'flat-wafer', 'bending', 'cylinder', 'material'] as const;
const ITS2_R = [22.4, 30.1, 37.8, 194.4, 243.9, 342.3, 391.8];
const ITS2_N = [12, 16, 20, 24, 30, 42, 48];
const X0_ITS2 = SC.ITS2_X0_INNER_PCT.value as number; // % X0
const X0_ITS3 = SC.ITS3_X0_PCT.value as number;
const SI_PCT = (((SC.ITS3_SENSOR_THICKNESS_UM.value as number) * 1e-3) / X0_SI_MM) * 100; // 0.053 %
const R0 = SC.ITS3_R_INNER_MM.value as number;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const fmt = (v: number, d = 0) => ctx.formatNumber(v, { maximumFractionDigits: d, minimumFractionDigits: d });

    const polygon = (g: G, cx: number, cy: number, r: number, n: number, col: string, alpha: number, w = 1.25) => {
      const rv = r / Math.cos(Math.PI / n);
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.PI / n;
        pts.push([cx + rv * Math.cos(a), cy + rv * Math.sin(a)]);
      }
      poly(g, pts, { close: true, color: col, alpha, width: w });
    };

    // ---- its2
    const drawIts2 = (g: G, f: Fr) => {
      const S = (Math.min(f.w * 0.5, f.h) * 0.42) / 400;
      const cx = f.w * 0.5;
      const cy = f.h / 2 + 6;
      ITS2_R.forEach((r, i) => {
        const a = seg(f.p, i * 0.1, i * 0.1 + 0.25);
        if (a > 0) polygon(g, cx, cy, r * S, ITS2_N[i], accent, 0.9 * a, i < 3 ? 1.5 : 1.1);
      });
      ln(g, cx, cy - 3, cx, cy + 3, { alpha: 0.8 });
      ln(g, cx - 3, cy, cx + 3, cy, { alpha: 0.8 });
      const r0 = ITS2_R[0] * S;
      const a = seg(f.p, 0.5, 0.75);
      const ro = ITS2_R[6] * S;
      const right = wideOf(f);
      const lx = right ? cx + ro + 28 : 16;
      const ly = right ? cy - ro * 0.55 : 50;
      ln(g, cx + r0 * 0.7, cy - r0 * 0.7, lx - 4, ly, { color: accent, alpha: 0.7 * a });
      txt(g, L('innermost'), lx, ly - 8, { color: accent, alpha: a });
      txt(g, `r ≈ ${fmt(ITS2_R[0])} mm`, lx, ly + 10, { mono: true, color: accent, alpha: a });
      txt(g, L('outer'), cx - ro * 0.72 - 8, cy + ro * 0.72 + 4, { align: 'right', alpha: 0.75 * seg(f.p, 0.7, 0.95) });
      txt(g, L('sevenLayers'), 16, 22, { alpha: 0.85 });
      txt(g, L('endView'), 16, f.h - 14, { alpha: 0.55 });
      dim(g, cx + ro + 14, cy + ro, cx + ro + 14, cy + ro - 100 * S, '10 cm', { off: -26, alpha: 0.6 });
    };

    // ---- limits
    const drawLimits = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const S = (Math.min(wide ? f.w * 0.5 : f.w * 0.6, f.h) * 0.42) / 42;
      const cx = wide ? f.w * 0.27 : f.w * 0.3;
      const cy = f.h / 2 + 8;
      ln(g, cx, cy - 3, cx, cy + 3, { alpha: 0.8 });
      ln(g, cx - 3, cy, cx + 3, cy, { alpha: 0.8 });
      g.save();
      g.beginPath();
      g.arc(cx, cy, 18.2 * S, 0, Math.PI * 2);
      g.strokeStyle = accent2;
      g.globalAlpha = 0.8;
      g.lineWidth = 1.25;
      g.setLineDash([4, 3]);
      g.stroke();
      g.restore();
      for (let i = 0; i < 3; i++) polygon(g, cx, cy, ITS2_R[i] * S, ITS2_N[i], accent, 0.95, 1.5);
      txt(g, L('beamPipe'), cx, cy + 18, { align: 'center', color: accent2, alpha: 0.9 });
      const a = seg(f.p, 0.1, 0.5);
      const ang = -Math.PI * 0.28;
      const rr = ITS2_R[2] * S;
      const sx = cx + rr * Math.cos(ang);
      const sy = cy + rr * Math.sin(ang);
      ln(g, sx, sy, sx + 24, sy - 34, { alpha: 0.6 * a });
      txt(g, L('stave'), sx + 28, sy - 40, { alpha: a });
      txt(g, L('flatChips'), sx + 28, sy - 24, { alpha: 0.7 * a });
      // material bar
      const bx = wide ? f.w * 0.62 : f.w * 0.62;
      const by = 56;
      const bh = f.h - 56 - 40;
      const bw = 40;
      const g2 = seg(f.p, 0.15, 0.7);
      txt(g, L('layerMaterial'), bx, by - 26, { alpha: 0.85 });
      ln(g, bx - 8, by + bh, bx + bw + 8, by + bh, { alpha: 0.5 });
      const hT = bh * g2;
      const hS = (SI_PCT / X0_ITS2) * bh * g2;
      rect(g, bx, by + bh - hT, bw, hT - hS, { fill: accent2, fillAlpha: 0.35, stroke: accent2, alpha: 0.7 });
      rect(g, bx, by + bh - hS, bw, hS, { fill: accent, fillAlpha: 0.85, stroke: accent, alpha: 1 });
      if (g2 > 0.9) {
        const ySi = by + bh * (1 - SI_PCT / X0_ITS2);
        txt(g, `${fmt(X0_ITS2, 2)} % X₀`, bx + bw + 10, by + 2, { mono: true, alpha: 0.9 });
        txt(g, `${L('silicon')} ≈ ${fmt(SI_PCT, 2)} %`, bx + bw + 10, ySi + 4, { mono: true, color: accent, alpha: 1 });
        txt(g, L('everythingElse'), bx + bw + 10, (by + ySi) / 2 - 8, { color: accent2, alpha: 1 });
        if (wide) txt(g, L('elseList'), bx + bw + 10, (by + ySi) / 2 + 10, { alpha: 0.65 });
      }
    };

    // ---- flat wafer
    const drawWafer = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const D = Math.min(wide ? f.w * 0.52 : f.w * 0.8, f.h - 110);
      const cx = wide ? f.w * 0.34 : f.w / 2;
      const cy = f.h / 2 - 6;
      const k = D / 300; // px per mm
      g.save();
      g.beginPath();
      g.arc(cx, cy, D / 2, 0, Math.PI * 2);
      g.fillStyle = fg;
      g.globalAlpha = 0.06;
      g.fill();
      g.globalAlpha = 0.5;
      g.strokeStyle = fg;
      g.lineWidth = 1;
      g.stroke();
      g.restore();
      const Ls = (SC.ITS3_SENSOR_LENGTH_CM.value as number) * 10;
      const Wd = Math.PI * R0;
      rect(g, cx - (Ls * k) / 2, cy - (Wd * k) / 2, Ls * k, Wd * k, { fill: accent, fillAlpha: 0.3, stroke: accent, alpha: 1, width: 1.5 });
      dim(g, cx - (Ls * k) / 2, cy - (Wd * k) / 2 - 8, cx + (Ls * k) / 2, cy - (Wd * k) / 2 - 8, '≈ 26 cm', { off: -12, alpha: 0.9, color: accent });
      txt(g, `≈ ${fmt(Wd / 10, 0)} cm = π R`, cx, cy, { align: 'center', mono: true, color: accent, alpha: 1 });
      dim(g, cx - D / 2, cy + D / 2 + 16, cx + D / 2, cy + D / 2 + 16, `${L('wafer')} 300 mm`, { off: 16, alpha: 0.7 });
      txt(g, L('stitched'), cx, cy + (Wd * k) / 2 + 16, { align: 'center', alpha: 0.85 });
      const t = 775 - 725 * ease(f.p);
      const px = wide ? f.w * 0.72 : f.w * 0.5;
      const py = wide ? f.h / 2 - 30 : f.h - 52;
      const th = Math.max(2, t * 0.04);
      if (wide) {
        rect(g, px, py - th / 2, 120, th, { fill: accent, fillAlpha: 0.5, stroke: accent, alpha: 1 });
        txt(g, L('thinning'), px, py - 46, { alpha: 0.85 });
        txt(g, `${fmt(t)} µm`, px, py + 40, { mono: true, color: accent, alpha: 1 });
        txt(g, `775 µm → ≲ ${fmt(SC.ITS3_SENSOR_THICKNESS_UM.value as number)} µm`, px, py + 60, { mono: true, alpha: 0.65 });
      } else {
        txt(g, `${L('thinning')}: ${fmt(t)} µm`, f.w / 2, f.h - 18, { align: 'center', mono: true, color: accent, alpha: 1 });
      }
    };

    // ---- bending
    const drawBending = (g: G, f: Fr) => {
      const c = Math.max(0.02, f.p);
      const Ws = Math.min(f.w * 0.5, f.h * 0.78 * (Math.PI / 2) * 0.9, 420);
      const geo = drawSheet(g, f.w / 2 - Ws * 0.1, f.h / 2 + f.h * 0.04, Ws, c, accent, fg);
      const below = Math.max(...geo.pts.map((p) => p[1])) + 26;
      const Rmm = R0 / c;
      txt(g, `${L('radius')} = ${Rmm > 999 ? '∞' : fmt(Rmm)} mm`, f.w / 2, Math.min(f.h - 34, below + 6), { align: 'center', mono: true, color: accent2, alpha: 1 });
      txt(g, `${L('width')} π R = ${fmt(Math.PI * R0)} mm  (R = ${fmt(R0)} mm)`, f.w / 2, Math.min(f.h - 14, below + 26), { align: 'center', mono: true, alpha: 0.7 });
      const [dx, dy] = geo.depth;
      const last = geo.pts[geo.pts.length - 1];
      dim(g, last[0] + 14, last[1] + 6, last[0] + 14 + dx, last[1] + 6 + dy, '≈ 26 cm', { off: 16, alpha: 0.8 });
    };

    // ---- cylinder
    const drawCylinder = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const S = (Math.min(f.h, wide ? f.w * 0.55 : f.w * 0.7) * 0.42) / 33;
      const cx = wide ? f.w * 0.36 : f.w * 0.3;
      const cy = f.h / 2;
      const gap = (1 - ease(f.p)) * 9 * S;
      g.save();
      g.beginPath();
      g.arc(cx, cy, ITS3.rPipe * S, 0, Math.PI * 2);
      g.strokeStyle = accent2;
      g.globalAlpha = 0.8;
      g.setLineDash([4, 3]);
      g.stroke();
      g.restore();
      ln(g, cx - 3, cy, cx + 3, cy, { alpha: 0.8 });
      ln(g, cx, cy - 3, cx, cy + 3, { alpha: 0.8 });
      for (const half of [-1, 1]) {
        const oy = half * gap;
        ITS3.r.forEach((r) => {
          g.save();
          g.beginPath();
          g.arc(cx, cy + oy, r * S, half < 0 ? Math.PI : 0, half < 0 ? 2 * Math.PI : Math.PI);
          g.strokeStyle = accent;
          g.lineWidth = 2;
          g.globalAlpha = 0.95;
          g.stroke();
          g.restore();
        });
        for (const ang of [0, Math.PI / 2, Math.PI]) {
          const ca = Math.cos(ang);
          const sa = -half * Math.sin(ang);
          for (let i = 0; i < 2; i++) {
            const r1 = ITS3.r[i] * S + 2;
            const r2 = ITS3.r[i + 1] * S - 2;
            const px = cx + (ca * (r1 + r2)) / 2;
            const py = cy + oy + (sa * (r1 + r2)) / 2;
            const horiz = Math.abs(ca) > 0.5;
            const w2 = horiz ? r2 - r1 : 3.5 * S;
            const h2 = horiz ? 3.5 * S : r2 - r1;
            hatch(g, px - w2 / 2, py - h2 / 2, w2, h2, accent2, 4, 0.8);
            rect(g, px - w2 / 2, py - h2 / 2, w2, h2, { stroke: accent2, alpha: 0.6 });
          }
        }
        if (gap < 1)
          for (const ang of [Math.PI * 0.25, Math.PI * 0.75]) {
            for (let i = 0; i < 2; i++) {
              const rm = ((ITS3.r[i] + ITS3.r[i + 1]) / 2) * S;
              const px = cx + Math.cos(ang) * rm;
              const py = cy + oy - half * Math.sin(ang) * rm;
              g.save();
              g.strokeStyle = fg;
              g.globalAlpha = 0.7;
              g.lineWidth = 1;
              g.beginPath();
              g.arc(px, py, 4, 0, Math.PI * 2);
              g.moveTo(px - 2.5, py - 2.5);
              g.lineTo(px + 2.5, py + 2.5);
              g.moveTo(px - 2.5, py + 2.5);
              g.lineTo(px + 2.5, py - 2.5);
              g.stroke();
              g.restore();
            }
          }
      }
      const lx = cx + 36 * S + 16;
      const place = (i: number) => cy - 52 + i * 26;
      ITS3.r.forEach((r, i) => {
        const a = -Math.PI * (0.12 + 0.08 * i);
        const px = cx + r * S * Math.cos(a);
        const py = cy - gap + r * S * Math.sin(a);
        ln(g, px, py, lx - 4, place(i), { alpha: 0.4 });
        txt(g, `${L('layer')} ${i}`, lx, place(i), { alpha: 0.85 });
        txt(g, `${fmt(r)} mm`, lx + (wide ? 56 : 48), place(i), { mono: true, color: accent, alpha: 1 });
      });
      txt(g, L('foam'), lx, place(3) + 6, { color: accent2, alpha: 0.95 });
      txt(g, L('air'), lx, place(3) + 26, { alpha: 0.8 });
      txt(g, L('pipeLabel'), lx, place(3) + 46, { color: accent2, alpha: 0.8 });
    };

    // ---- material
    const drawMaterial = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const bx0 = wide ? 70 : 20;
      const bw = wide ? 56 : 34;
      const by = 60;
      const bh = f.h - by - 80;
      const pr = seg(f.p, 0, 0.5);
      txt(g, L('xPerLayer'), bx0 - 4, by - 30, { alpha: 0.85 });
      ln(g, bx0 - 10, by + bh, bx0 + 2 * bw + 40, by + bh, { alpha: 0.5 });
      [
        { x: bx0, v: X0_ITS2, c: accent2, n: 'ITS2' },
        { x: bx0 + bw + 24, v: X0_ITS3, c: accent, n: 'ITS3' },
      ].forEach((b) => {
        const h = (b.v / X0_ITS2) * bh * pr;
        rect(g, b.x, by + bh - h, bw, h, { fill: b.c, fillAlpha: 0.6, stroke: b.c, alpha: 1 });
        txt(g, b.n, b.x + bw / 2, by + bh + 14, { align: 'center', color: b.c, alpha: 1 });
        if (pr > 0.95) txt(g, `${fmt(b.v, 2)} %`, b.x + bw / 2, by + bh - h - 10, { align: 'center', mono: true, color: b.c, alpha: 1 });
      });
      txt(g, L('designValues'), bx0 - 4, f.h - 14, { alpha: 0.6 });
      const x0 = bx0 + 2 * bw + (wide ? 130 : 82);
      const pr2: Rect = { x: x0, y: 56, w: f.w - x0 - (wide ? 110 : 56), h: f.h - 56 - (wide ? 70 : 56) };
      const pl = plot(
        g,
        ctx,
        pr2,
        { min: 0.2, max: 10, log: true, label: 'p_T (GeV/c)', ticks: [0.3, 1, 3, 10].map((v) => ({ v, label: String(v) })) },
        { min: 5, max: 150, log: true, label: L('d0axis'), ticks: [10, 30, 100].map((v) => ({ v, label: String(v) })) },
      );
      pl.axes();
      const q = seg(f.p, 0.35, 1);
      pl.curve((p) => sigmaD0(ITS2, p), { color: accent2, width: 1.75, progress: q }, 160);
      const s3 = (p: number) => sigmaD0(ITS2, p) / 2; // ITS3 design studies: ~×2 better over all momenta
      pl.curve(s3, { color: accent, width: 1.75, progress: q }, 160);
      if (q > 0.95) {
        txt(g, 'ITS2', pl.X(10) + 8, pl.Y(sigmaD0(ITS2, 10)) - 10, { color: accent2, alpha: 1 });
        txt(g, 'ITS3', pl.X(10) + 8, pl.Y(s3(10)) + 10, { color: accent, alpha: 1 });
        const p0 = 0.3;
        const x = pl.X(p0);
        ln(g, x, pl.Y(sigmaD0(ITS2, p0)), x, pl.Y(s3(p0)), { alpha: 0.7, dash: [3, 3] });
        txt(g, `×${fmt(2, 0)}`, x + 8, (pl.Y(sigmaD0(ITS2, p0)) + pl.Y(s3(p0))) / 2, { mono: true, alpha: 1 });
      }
    };

    return fadeStage(ctx, {
      states: STATES,
      draws: { its2: drawIts2, limits: drawLimits, 'flat-wafer': drawWafer, bending: drawBending, cylinder: drawCylinder, material: drawMaterial },
      anim: 0.6,
    });
  },
};
export default mod;

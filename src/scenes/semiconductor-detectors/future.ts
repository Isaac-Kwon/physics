/**
 * sc.future — where silicon tracking goes next (schematic; all "as of 2025").
 *  timing-4d: two vertices 0.35 mm apart in z (overlapping, since the track z-resolution is 0.25 mm) but 180 ps apart in time;
 *             track times smeared by σ_t = 40 ps (SC.LGAD_TIME_PS 30–50 ps). Simulated points (seeded), marginal histograms.
 *  alice3:    end view, true radii: three vertex layers at 5, 12, 25 mm inside the beam-pipe vacuum (design concept), compared with
 *             ITS3 layer 0 at 19 mm; the two half-barrels retract during injection.
 *  fcc:       concept: three barrel layers (r ≈ 17, 37, 57 mm indicative) of thin monolithic sensors with overlapping staves.
 *  beyond:    three pictograms (space tracker, X-ray imaging with a pixel detector, radiation monitor).
 */
import type { SceneModule } from '../shared/types';
import { gaussian, mulberry32 } from '../shared/canvas2d';
import { plot, type Rect } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { arrow, clamp, dim, dot, ease, fadeStage, ln, poly, rect, seg, txt, type Fr, type G, wideOf } from './_sc3-common';

const STATES = ['timing-4d', 'alice3', 'fcc', 'beyond'] as const;
const SIG_T = 40; // ps
const SIG_Z = 0.25; // mm per track
const VA = { z: 0, t: -70 };
const VB = { z: 0.35, t: 110 };

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const rnd = mulberry32(4040);
    const pts = [VA, VB].flatMap((v, k) => Array.from({ length: 36 }, () => ({ z: v.z + SIG_Z * gaussian(rnd), t: v.t + SIG_T * gaussian(rnd), k })));
    void SC;

    const hist = (vals: number[], lo: number, hi: number, nb: number) => {
      const c = new Array(nb).fill(0);
      vals.forEach((v) => {
        const b = Math.floor(((v - lo) / (hi - lo)) * nb);
        if (b >= 0 && b < nb) c[b]++;
      });
      return c;
    };

    // ---- timing
    const dTiming = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const top = wide ? 70 : 64;
      const right = wide ? 90 : 60;
      const R: Rect = { x: 56, y: top + 14, w: f.w - 56 - right - 24, h: f.h - top - 14 - 54 };
      const zl = -1;
      const zh = 1.6;
      const tl = -300;
      const th = 300;
      const pl = plot(g, ctx, R, { min: zl, max: zh, label: 'z (mm)', ticks: [-1, 0, 1].map((v) => ({ v, label: String(v) })) }, { min: tl, max: th, label: 't (ps)', ticks: [-200, 0, 200].map((v) => ({ v, label: String(v) })) });
      pl.axes();
      const col = seg(f.ts, 1.2, 2.2);
      pts.forEach((p) => {
        const c = col > 0.5 ? (p.k ? accent2 : accent) : fg;
        dot(g, pl.X(p.z), pl.Y(p.t), 2.6, c, col > 0.5 ? 1 : 0.7);
      });
      // marginals
      const nb = 16;
      const hz = hist(pts.map((p) => p.z), zl, zh, nb);
      const ht = hist(pts.map((p) => p.t), tl, th, nb);
      const mz = Math.max(...hz);
      const mt = Math.max(...ht);
      const m = seg(f.ts, 0.4, 1.4);
      hz.forEach((c, i) => {
        const x0 = pl.X(zl + ((zh - zl) * i) / nb);
        const x1 = pl.X(zl + ((zh - zl) * (i + 1)) / nb);
        const hh = ((c / mz) * (top - 6)) * m;
        rect(g, x0, R.y - 6 - hh, x1 - x0 - 1, hh, { fill: fg, fillAlpha: 0.45 });
      });
      ht.forEach((c, i) => {
        const y0 = pl.Y(tl + ((th - tl) * i) / nb);
        const y1 = pl.Y(tl + ((th - tl) * (i + 1)) / nb);
        const ww = ((c / mt) * (right - 14)) * m;
        rect(g, R.x + R.w + 8, y1, ww, y0 - y1 - 1, { fill: fg, fillAlpha: 0.45 });
      });
      txt(g, L('zOnly'), R.x + 6, 16, { alpha: 0.85 });
      if (f.h >= 300) txt(g, L('zOnly2'), R.x + 6, 34, { alpha: 0.6 });
      txt(g, L('overlap'), R.x + 6, 52 - (wide ? 0 : 8), { alpha: 0 });
      if (col > 0.5) {
        txt(g, L('vertexA'), pl.X(VA.z) - 12, pl.Y(VA.t) + 38, { align: 'right', color: accent, alpha: 1 });
        txt(g, L('vertexB'), pl.X(VB.z) + 12, pl.Y(VB.t) - 38, { color: accent2, alpha: 1 });
        if (f.h >= 300) txt(g, L('tResolved'), R.x + R.w - 4, R.y + R.h - 12, { align: 'right', alpha: 0.85, mono: true });
      }
      txt(g, L('tProj'), R.x + R.w + 8, R.y - 8, { alpha: 0.6 });
    };

    // ---- ALICE 3
    const dAlice3 = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const S = (Math.min(f.h, wide ? f.w * 0.55 : f.w * 0.4) * 0.42) / 40;
      const cx = wide ? f.w * 0.36 : f.w * 0.27;
      const cy = f.h / 2 + 6;
      const k = f.reduced || f.ts > 1e2 ? 0 : 0.5 - 0.5 * Math.cos(((f.t % 7) / 7) * Math.PI * 2); // 0 closed … 1 open
      const kk = ease(clamp(k * 1.6));
      const dx = kk * 17 * S;
      // ITS3 layer 0 for comparison
      g.save();
      g.beginPath();
      g.arc(cx, cy, 19 * S, 0, Math.PI * 2);
      g.strokeStyle = fg;
      g.globalAlpha = 0.45;
      g.setLineDash([4, 4]);
      g.stroke();
      g.restore();
      txt(g, L('its3ref'), cx, cy + 19 * S + 10, { align: 'center', alpha: 0.7 });
      // vertex layers: two half-barrels
      [5, 12, 25].forEach((r) => {
        for (const side of [-1, 1]) {
          g.save();
          g.beginPath();
          g.arc(cx + side * dx, cy, r * S, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? (3 * Math.PI) / 2 : Math.PI / 2);
          g.strokeStyle = accent;
          g.lineWidth = 2;
          g.globalAlpha = 0.95;
          g.stroke();
          g.restore();
        }
      });
      ln(g, cx - 3, cy, cx + 3, cy, { alpha: 0.9 });
      ln(g, cx, cy - 3, cx, cy + 3, { alpha: 0.9 });
      const lx = cx + (wide ? 40 : 28) * S + 24;
      [5, 12, 25].forEach((r) => txt(g, `${r} mm`, cx, cy - r * S - 9, { align: 'center', mono: true, color: accent, alpha: 1 }));
      txt(g, L('inVacuum'), lx, cy - 10, { alpha: 0.85 });
      txt(g, L('retract'), lx, cy + 10, { alpha: 0.85 });
      txt(g, L('tracker'), lx, cy + 36, { alpha: 0.65 });
      if (dx > 1) arrow(g, cx + 25 * S + 2, cy + 30 * S * 0.8, cx + 25 * S + 2 + dx * 0.6, cy + 30 * S * 0.8, { alpha: 0.6 });
      txt(g, L('designStage'), 16, f.h - 14, { alpha: 0.6 });
    };

    // ---- FCC
    const dFcc = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const S = (Math.min(f.h, wide ? f.w * 0.55 : f.w * 0.4) * 0.42) / 62;
      const cx = wide ? f.w * 0.36 : f.w * 0.27;
      const cy = f.h / 2 + 6;
      const radii = [17, 37, 57];
      const nst = [12, 22, 32];
      g.save();
      g.beginPath();
      g.arc(cx, cy, 10 * S, 0, Math.PI * 2);
      g.strokeStyle = accent2;
      g.globalAlpha = 0.8;
      g.setLineDash([4, 3]);
      g.stroke();
      g.restore();
      radii.forEach((r, li) => {
        const n = nst[li];
        for (let i = 0; i < n; i++) {
          // each stave is a short flat tile; alternate tiles sit slightly higher so neighbours overlap
          const a = (i / n) * Math.PI * 2;
          const rr = (r + (i % 2) * 1.3) * S;
          const hl = Math.PI * r / n * 1.12 * S;
          const x = cx + rr * Math.cos(a);
          const y = cy + rr * Math.sin(a);
          const tx = -Math.sin(a);
          const ty = Math.cos(a);
          ln(g, x - tx * hl, y - ty * hl, x + tx * hl, y + ty * hl, { color: accent, alpha: 0.95, width: 1.75 });
        }
      });
      const lx = cx + 62 * S + 20;
      const a1 = -0.8;
      ln(g, cx + 17 * S * Math.cos(a1), cy + 17 * S * Math.sin(a1), lx - 4, cy - 70, { alpha: 0.4 });
      txt(g, L('less'), lx, cy - 70, { color: accent, alpha: 1 });
      txt(g, L('lessSub'), lx, cy - 52, { alpha: 0.65 });
      txt(g, L('few'), lx, cy - 14, { color: accent, alpha: 1 });
      txt(g, L('fewSub'), lx, cy + 4, { alpha: 0.65 });
      txt(g, L('inner'), lx, cy + 40, { alpha: 0.85 });
      txt(g, L('concept'), 16, f.h - 14, { alpha: 0.6 });
      dim(g, cx - 62 * S, cy + 62 * S + 14, cx + 62 * S, cy + 62 * S + 14, '', { alpha: 0 });
    };

    // ---- beyond
    const dBeyond = (g: G, f: Fr) => {
      const cols = wideOf(f) || f.h < 450;
      const wide = cols;
      const subs = wideOf(f) || f.h >= 450;
      const cw = cols ? f.w / 3 : f.w;
      const ch = cols ? f.h : f.h / 3;
      const cell = (i: number): Rect => (cols ? { x: i * cw, y: 0, w: cw, h: ch } : { x: 0, y: i * ch, w: cw, h: ch });
      const a = [seg(f.ts, 0, 1), seg(f.ts, 0.5, 1.5), seg(f.ts, 1, 2)];
      // 1: space tracker — a photon converts, e⁺e⁻ cross silicon planes
      {
        const c = cell(0);
        const x0 = c.x + 30;
        const x1 = c.x + c.w - 30;
        const y0 = c.y + c.h * 0.22;
        const y1 = c.y + c.h * 0.7;
        const n = 6;
        for (let i = 0; i < n; i++) {
          const y = y0 + ((y1 - y0) * i) / (n - 1);
          ln(g, x0, y, x1, y, { color: accent, alpha: 0.85 * a[0], width: 2 });
        }
        const conv = y0 + (y1 - y0) * 0.3;
        const px = (x0 + x1) / 2;
        ln(g, px - 22, y0 - 26, px, conv, { color: fg, alpha: 0.8 * a[0], dash: [4, 3] });
        ln(g, px, conv, px - 28, y1 + 10, { color: accent2, alpha: a[0], width: 1.25 });
        ln(g, px, conv, px + 36, y1 + 10, { color: accent2, alpha: a[0], width: 1.25 });
        for (let i = 2; i < n; i++) {
          const y = y0 + ((y1 - y0) * i) / (n - 1);
          const t = (y - conv) / (y1 + 10 - conv);
          dot(g, px - 28 * t, y, 2.5, accent2, a[0]);
          dot(g, px + 36 * t, y, 2.5, accent2, a[0]);
        }
        txt(g, L('space'), c.x + c.w / 2, y1 + 34, { align: 'center', alpha: a[0] });
        if (subs) txt(g, L('spaceSub'), c.x + c.w / 2, y1 + 52, { align: 'center', alpha: 0.6 * a[0] });
      }
      // 2: imaging — fan of X-rays through a body onto a pixel row
      {
        const c = cell(1);
        const sx = c.x + c.w * 0.5;
        const sy = c.y + c.h * 0.16;
        const dy = c.y + c.h * 0.66;
        const nPix = 15;
        const pw = Math.min(14, (c.w - 60) / nPix);
        for (let i = 0; i < nPix; i++) {
          const x = sx + (i - (nPix - 1) / 2) * pw;
          const atten = Math.exp(-3 * Math.max(0, 1 - ((i - 7) / 5) ** 2));
          ln(g, sx, sy, x, dy, { alpha: 0.35 * a[1], width: 1 });
          rect(g, x - pw / 2 + 1, dy, pw - 2, 12, { fill: accent, fillAlpha: (0.15 + 0.8 * atten) * a[1], stroke: accent, alpha: 0.5 * a[1] });
        }
        g.save();
        g.beginPath();
        g.ellipse(sx, (sy + dy) / 2, pw * 5, (dy - sy) * 0.2, 0, 0, Math.PI * 2);
        g.strokeStyle = fg;
        g.globalAlpha = 0.6 * a[1];
        g.stroke();
        g.restore();
        dot(g, sx, sy, 3, accent2, a[1]);
        txt(g, L('imaging'), c.x + c.w / 2, dy + 38, { align: 'center', alpha: a[1] });
        if (subs) txt(g, L('imagingSub'), c.x + c.w / 2, dy + 56, { align: 'center', alpha: 0.6 * a[1] });
      }
      // 3: radiation monitor — counts per time bin
      {
        const c = cell(2);
        const bx = c.x + 40;
        const by = c.y + c.h * 0.68;
        const bw = c.w - 80;
        const bh = c.h * 0.42;
        const nbars = 14;
        const bwid = bw / nbars;
        ln(g, bx, by, bx + bw, by, { alpha: 0.5 });
        for (let i = 0; i < nbars; i++) {
          const v = (0.25 + 0.6 * Math.exp(-((i - 8.5) ** 2) / 6) + 0.05 * Math.sin(i * 3.1)) * bh * a[2];
          rect(g, bx + i * bwid + 1, by - v, bwid - 2, v, { fill: accent, fillAlpha: 0.7, stroke: accent, alpha: 0.9 });
        }
        txt(g, 't', bx + bw, by + 14, { mono: true, align: 'right', alpha: 0.6 * a[2] });
        txt(g, L('counts'), bx, by - bh - 10, { alpha: 0.7 * a[2] });
        txt(g, L('monitor'), c.x + c.w / 2, by + 38, { align: 'center', alpha: a[2] });
        if (subs) txt(g, L('monitorSub'), c.x + c.w / 2, by + 56, { align: 'center', alpha: 0.6 * a[2] });
      }
    };

    return fadeStage(ctx, { states: STATES, draws: { 'timing-4d': dTiming, alice3: dAlice3, fcc: dFcc, beyond: dBeyond }, loop: ['alice3'], anim: 3 });
  },
};
export default mod;

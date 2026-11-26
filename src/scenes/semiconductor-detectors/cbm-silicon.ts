/**
 * sc.cbm-silicon — CBM at FAIR: MVD (4 MAPS stations, in vacuum) and STS (8 double-sided strip stations in a dipole). Schematic.
 *  Side view (bending plane), z along the beam. MVD stations at z = 5, 10, 15, 20 cm; STS stations at z = 30 … 100 cm (10 cm steps);
 *  field B ≈ 1 T over z = 25 … 105 cm. Tracks in the field: Δy = 0.3 B (z − z_B)² / (2p) (z in m, p in GeV/c, B in T), sign = charge.
 *  Decay vertex displaced 2 cm from the target (exaggerated: a Λ flies cτ ≈ 8 cm). Time inset: collisions at 10 MHz (SC.CBM_RATE_HZ),
 *  i.e. one every ≈ 100 ns on average; hits carry a time stamp (≈ 5 ns spread), so collisions are separated by time, not by a trigger.
 */
import type { SceneModule } from '../shared/types';
import { gaussian, mulberry32 } from '../shared/canvas2d';
import { SC } from '../../data/semiconductor';
import { dim, dot, fadeStage, hatch, ln, poly, rect, seg, txt, ease, type Fr, type G } from './_sc3-common';

const STATES = ['mvd', 'sts'] as const;
const MVD_Z = [5, 10, 15, 20];
const STS_Z = [30, 40, 50, 60, 70, 80, 90, 100];
const Z_DV = 2; // cm
const B_FIELD = 1; // T
const Z_B = 25; // cm, start of the field region
const Z_B_END = 105;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const rnd = mulberry32(525);
    const rate = SC.CBM_RATE_HZ.value as number;
    const spacing = 1e9 / rate; // ns

    // primary tracks: initial slope, momentum (GeV/c), charge sign
    const prim = [
      { s: 0.16, p: 1.2, q: 1 }, { s: -0.14, p: 0.9, q: -1 }, { s: 0.09, p: 2.5, q: -1 }, { s: -0.07, p: 3.5, q: 1 },
      { s: 0.04, p: 4.5, q: 1 }, { s: -0.1, p: 1.6, q: 1 }, { s: 0.12, p: 2.0, q: -1 }, { s: -0.05, p: 5.0, q: -1 },
    ];
    // decay daughters from the displaced vertex
    const dau = [
      { s: 0.075, p: 1.5, q: 1, c: accent },
      { s: -0.045, p: 2.2, q: -1, c: accent2 },
    ];
    const yAt = (t: { s: number; p: number; q: number }, z0: number, z: number) => {
      let y = t.s * (z - z0);
      if (z > Z_B) {
        const dz = (Math.min(z, Z_B_END) - Math.max(Z_B, z0)) / 100;
        y += t.q * ((0.3 * B_FIELD) * dz * dz) / (2 * t.p) * 100;
        if (z > Z_B_END) y += t.q * ((0.3 * B_FIELD) / t.p) * dz * (z - Z_B_END) ;
      }
      return y;
    };

    // time-stamped hits: 4 collisions in a 400 ns window, the highlighted one carries the decay
    const ev = Array.from({ length: 4 }, (_, e) => {
      const t0 = 55 + e * spacing + (rnd() - 0.5) * 40;
      return STS_Z.flatMap((_, row) => Array.from({ length: 2 + Math.floor(rnd() * 2) }, () => ({ t: t0 + 5 * gaussian(rnd), row, e })));
    });
    const HI = 1;

    const mvdDraw = (g: G, f: Fr) => {
      const kz = Math.min((f.w - 90) / 29, (f.h * 0.4) / 5.5);
      const x0 = 50;
      const yc = f.h / 2 + 6;
      const X = (z: number) => x0 + (z + 2) * kz;
      const Y = (y: number) => yc - y * kz;
      const a = seg(f.ts, 0, 1.2);
      // vacuum chamber
      rect(g, X(-1.2), Y(7), (22.5 - -1.2) * kz, 14 * kz, { stroke: fg, alpha: 0.35, dash: [5, 4] });
      txt(g, L('vacuum'), X(22.2), Y(7) + 12, { align: 'right', alpha: 0.65 });
      // target
      ln(g, X(0), Y(0.7), X(0), Y(-0.7), { color: accent2, alpha: 1, width: 3 });
      txt(g, L('target'), X(0), Y(-0.7) + 16, { align: 'center', color: accent2, alpha: 0.95 });
      // stations (central hole for the beam)
      MVD_Z.forEach((z) => {
        const hole = 0.55 + 0.05 * z / 5;
        ln(g, X(z), Y(5), X(z), Y(hole), { color: accent, alpha: 0.9, width: 2.5 });
        ln(g, X(z), Y(-hole), X(z), Y(-5), { color: accent, alpha: 0.9, width: 2.5 });
      });
      txt(g, L('stations'), X(12.5), Y(5) - 14, { align: 'center', color: accent, alpha: 0.95 });
      dim(g, X(5), Y(5) - 4, X(20), Y(5) - 4, '', { alpha: 0 });
      // beam axis
      ln(g, X(-2), Y(0), X(26), Y(0), { alpha: 0.2, dash: [2, 5] });
      // primary tracks (hits on stations): straight in the weak field
      prim.slice(0, 6).forEach((t) => {
        const zEnd = Math.min(24, 24 * a);
        ln(g, X(0), Y(0), X(zEnd), Y(t.s * zEnd), { alpha: 0.35, width: 1 });
        MVD_Z.forEach((z) => {
          if (z <= zEnd && Math.abs(t.s * z) > 0.6 + 0.05 * z / 5 && Math.abs(t.s * z) < 5) dot(g, X(z), Y(t.s * z), 2, fg, 0.55);
        });
      });
      // decay vertex + daughters
      const b = seg(f.ts, 1.2, 2.4);
      const zd = Z_DV;
      dau.forEach((t) => {
        const zEnd = Math.min(24, zd + (24 - zd) * b);
        ln(g, X(zd), Y(0), X(zEnd), Y(t.s * (zEnd - zd)), { color: t.c, alpha: b > 0 ? 0.95 : 0, width: 1.5 });
        MVD_Z.forEach((z) => {
          if (z <= zEnd) dot(g, X(z), Y(t.s * (z - zd)), 3, t.c, 1);
        });
      });
      // the neutral parent
      ln(g, X(0), Y(0), X(zd), Y(0), { alpha: 0.9 * seg(f.ts, 0.8, 1.2), dash: [3, 3], width: 1.25 });
      ln(g, X(zd) - 0, Y(0), X(zd), Y(0), { alpha: 0 });
      ring2(g, X(zd), Y(0), fg);
      if (b > 0.95) {
        ln(g, X(zd), Y(0) - 5, X(zd) - 14, Y(0) - 52, { alpha: 0.6 });
        txt(g, L('decay'), X(zd) - 18, Y(0) - 66, { alpha: 0.95 });
        txt(g, L('decayNote'), X(zd) - 18, Y(0) - 50, { alpha: 0.65 });
      }
      dim(g, X(5), Y(-5) + 10, X(20), Y(-5) + 10, '15 cm', { off: 14, alpha: 0.6 });
      txt(g, L('zAxis'), f.w - 16, f.h - 14, { align: 'right', alpha: 0.55 });
    };
    const ring2 = (g: G, x: number, y: number, col: string) => {
      g.save();
      g.strokeStyle = col;
      g.globalAlpha = 0.95;
      g.lineWidth = 1.25;
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    };

    const stsDraw = (g: G, f: Fr) => {
      const insetH = f.h > 380 ? 96 : 0;
      const hMain = f.h - insetH;
      const kz = (f.w - 80) / 112;
      const ky = Math.min(kz, (hMain * 0.4) / 38);
      const x0 = 36;
      const yc = hMain / 2 + 4;
      const X = (z: number) => x0 + (z + 3) * kz;
      const Y = (y: number) => yc - y * ky;
      const a = seg(f.ts, 0, 1.6);
      // magnet region
      const mh = 34;
      rect(g, X(Z_B), Y(mh), (Z_B_END - Z_B) * kz, 2 * mh * ky, { stroke: fg, alpha: 0.3, dash: [5, 4] });
      for (let z = Z_B + 8; z < Z_B_END - 4; z += 14) {
        for (const y of [-mh * 0.82, -mh * 0.55, mh * 0.55, mh * 0.82]) {
          g.save();
          g.strokeStyle = fg;
          g.globalAlpha = 0.28;
          g.lineWidth = 1;
          g.beginPath();
          g.arc(X(z), Y(y), 3.5, 0, Math.PI * 2);
          g.moveTo(X(z) - 2, Y(y) - 2);
          g.lineTo(X(z) + 2, Y(y) + 2);
          g.moveTo(X(z) - 2, Y(y) + 2);
          g.lineTo(X(z) + 2, Y(y) - 2);
          g.stroke();
          g.restore();
        }
      }
      txt(g, L('dipole'), 16, 34, { alpha: 0.8 });
      ln(g, X(-3), Y(0), X(112), Y(0), { alpha: 0.18, dash: [2, 5] });
      // target + MVD (small)
      ln(g, X(0), Y(0.7), X(0), Y(-0.7), { color: accent2, width: 3, alpha: 1 });
      MVD_Z.forEach((z) => {
        ln(g, X(z), Y(5), X(z), Y(0.8), { color: accent, alpha: 0.9, width: 2 });
        ln(g, X(z), Y(-0.8), X(z), Y(-5), { color: accent, alpha: 0.9, width: 2 });
      });
      txt(g, 'MVD', X(12.5), Y(5) - 12, { align: 'center', color: accent, alpha: 0.9 });
      // STS stations: size grows with z (angular acceptance)
      STS_Z.forEach((z) => {
        const hh = 0.27 * z;
        const hole = 1.5 + 0.03 * z;
        ln(g, X(z), Y(hh), X(z), Y(hole), { color: accent, alpha: 0.95, width: 3 });
        ln(g, X(z), Y(-hole), X(z), Y(-hh), { color: accent, alpha: 0.95, width: 3 });
      });
      txt(g, `STS: ${STS_Z.length} ${L('stsStations')}`, 16, 16, { color: accent, alpha: 0.95 });
      // tracks
      const zmax = Math.min(108, 108 * a);
      const trace = (t: { s: number; p: number; q: number }, z0: number, col: string, alpha: number, w: number) => {
        const pts: [number, number][] = [];
        for (let z = z0; z <= zmax; z += 1.5) pts.push([X(z), Y(yAt(t, z0, z))]);
        poly(g, pts, { color: col, alpha, width: w });
      };
      prim.forEach((t) => trace(t, 0, fg, 0.38, 1));
      dau.forEach((t) => trace({ ...t, s: t.s }, Z_DV, t.c, 0.95, 1.5));
      // hits on the STS for the highlighted tracks
      dau.forEach((t) => STS_Z.forEach((z) => z <= zmax && dot(g, X(z), Y(yAt(t, Z_DV, z)), 2.8, t.c, 1)));
      prim.forEach((t) => STS_Z.forEach((z) => z <= zmax && Math.abs(yAt(t, 0, z)) < 0.27 * z && dot(g, X(z), Y(yAt(t, 0, z)), 1.8, fg, 0.5)));
      txt(g, L('curvature'), 16, 52, { alpha: 0.7 });
      if (ky < kz * 0.97) txt(g, L('compressed'), f.w - 16, 16, { align: 'right', alpha: 0.55 });
      // time-stamped stream
      if (insetH) {
        const ix = f.w > 700 ? 270 : 120;
        const iw = f.w - ix - 40;
        const iy = hMain + 14;
        const ih = insetH - 44;
        const T = (t: number) => ix + (t / 450) * iw;
        const R = (row: number) => iy + 6 + (row / 7) * (ih - 12);
        txt(g, L('stream'), 16, iy + ih / 2 - 8, { alpha: 0.85 });
        txt(g, L('streamSub'), 16, iy + ih / 2 + 10, { alpha: 0.6 });
        ln(g, ix, iy + ih, ix + iw, iy + ih, { alpha: 0.5 });
        [0, 100, 200, 300, 400].forEach((t) => {
          ln(g, T(t), iy + ih, T(t), iy + ih + 4, { alpha: 0.5 });
          txt(g, String(t), T(t), iy + ih + 14, { mono: true, align: 'center', alpha: 0.6 });
        });
        txt(g, 't (ns)', ix + iw, iy + ih + 28, { mono: true, align: 'right', alpha: 0.7 });
        const nShow = Math.floor(seg(f.ts, 0.4, 2.4) * 1e3) / 1e3;
        ev.forEach((hits, e) =>
          hits.forEach((h, i) => {
            if (i / hits.length > nShow) return;
            ln(g, T(h.t), R(h.row) - 4, T(h.t), R(h.row) + 4, { color: e === HI ? accent : fg, alpha: e === HI ? 1 : 0.4, width: 1.5 });
          }),
        );
        const t0 = ev[HI].reduce((s, h) => s + h.t, 0) / ev[HI].length;
        txt(g, L('oneCollision'), T(t0), iy - 2, { align: 'center', color: accent, alpha: 0.95 * nShow });
        dim(g, T(t0 + spacing), iy + ih + 4, T(t0), iy + ih + 4, '', { alpha: 0 });
        void hatch;
        void ease;
      }
    };

    return fadeStage(ctx, { states: STATES, draws: { mvd: mvdDraw, sts: stsDraw }, anim: 3 });
  },
};
export default mod;

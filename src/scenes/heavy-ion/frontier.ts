/**
 * hi.frontier — P2 figure with five pages (one per state), cross-faded:
 *   bes-next      : phase-diagram map (T versus baryon chemical potential), freeze-out curve from the Cleymans et al. fit used by the
 *                   EnergyScan widget, energy-scan arrow and the highest-density region; the critical point is hypothetical ("?").
 *   small-systems : three droplets drawn with their physical size (pp ~1 fm, p-Pb ~2 fm, Pb-Pb 7 fm radius), outward flow arrows;
 *                   dashed = whether this is flow is still debated.
 *   shapes        : round O-16 vs elongated Ne-20 (projected along the beam), seeded nucleon positions, participant zone, and the elliptic
 *                   eccentricity eps2 computed from it; arrow length along the short axis is proportional to eps2.
 *   future        : timeline 2025-2040 with fuzzy (dashed) starts; wording only ("late 2020s", "2030s"), as of 2025.
 *   astro         : the same map with cold dense matter (neutron stars, mergers) highlighted at high mu_B, low T.
 * Simplifications: uniform-density nucleon clouds, no NN repulsion, eps2 from participants within 1.5 fm; dates are schematic.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32 } from '../shared/canvas2d';
import { plot, plotRect } from '../shared/plot';
import { HI } from '../../data/heavy-ion';
import { Tch } from '../../components/widgets/_physics';
import { arrow, dot, line, ring, txt } from '../common/_draw';

const STATES = ['bes-next', 'small-systems', 'shapes', 'future', 'astro'] as const;
type St = (typeof STATES)[number];
const PAGE: Record<St, string> = { 'bes-next': 'bes', 'small-systems': 'small', shapes: 'shapes', future: 'future', astro: 'astro' };

const MU_CP = 400; // MeV, hypothetical critical point position (schematic)
const MU_NUC = 923; // MeV, nuclear matter at T = 0
const T_MAX = 200;
const MU_MAX = 1250;
/** Freeze-out / crossover curve T(mu) in MeV. */
const Tfo = (mu: number) => 1000 * Tch(mu / 1000);
/** First-order line (hypothetical): from the critical point down to nuclear matter at T = 0. */
const T_CP = Tfo(MU_CP);
const Tfirst = (mu: number) => T_CP * (1 - ((mu - MU_CP) / (MU_NUC - MU_CP)) ** 1.5);

interface Nuc {
  pts: [number, number][];
}
/** Nucleon positions projected along the beam: uniform ellipsoid with semi-axes (a, b, b), long axis along x. */
function nucleus(n: number, a: number, b: number, rnd: () => number): Nuc {
  const pts: [number, number][] = [];
  while (pts.length < n) {
    const x = (2 * rnd() - 1) * a;
    const y = (2 * rnd() - 1) * b;
    const z = (2 * rnd() - 1) * b;
    if ((x / a) ** 2 + (y / b) ** 2 + (z / b) ** 2 <= 1) pts.push([x, y]);
  }
  return { pts };
}
/** Participants of a head-on collision of two such nuclei (same orientation): nucleons within d of any nucleon of the other. */
function collide(a: Nuc, b: Nuc, d: number) {
  const part = (u: Nuc, v: Nuc) => u.pts.filter((p) => v.pts.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < d));
  const pa = part(a, b);
  const pb = part(b, a);
  const all = [...pa, ...pb];
  const n = all.length;
  const mx = all.reduce((s, p) => s + p[0], 0) / n;
  const my = all.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  all.forEach((p) => {
    const x = p[0] - mx;
    const y = p[1] - my;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  });
  sxx /= n;
  syy /= n;
  sxy /= n;
  // eps2 = |<r^2 e^{2 i phi}>| / <r^2>
  const eps2 = Math.hypot(sxx - syy, 2 * sxy) / (sxx + syy);
  const phi = 0.5 * Math.atan2(2 * sxy, sxx - syy); // direction of the long axis
  const tr = sxx + syy;
  const disc = Math.hypot(sxx - syy, 2 * sxy);
  return { pa, pb, mx, my, eps2, phi, major: Math.sqrt((tr + disc) / 2), minor: Math.sqrt(Math.max(1e-6, (tr - disc) / 2)) };
}
/** Pick the seeded event whose eps2 is closest to the ensemble mean (so the picture is representative). */
function representative(make: (rnd: () => number) => [Nuc, Nuc]) {
  const evs = Array.from({ length: 80 }, (_, i) => {
    const rnd = mulberry32(100 + i);
    const [a, b] = make(rnd);
    return { a, b, r: collide(a, b, 1.5) };
  });
  const mean = evs.reduce((s, e) => s + e.r.eps2, 0) / evs.length;
  const best = evs.reduce((m, e) => (Math.abs(e.r.eps2 - mean) < Math.abs(m.r.eps2 - mean) ? e : m));
  return { ...best, mean };
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const f2 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const oxy = representative((r) => [nucleus(16, 3.0, 3.0, r), nucleus(16, 3.0, 3.0, r)]);
    const ne = representative((r) => [nucleus(20, 4.4, 2.8, r), nucleus(20, 4.4, 2.8, r)]);
    const nucOutline = { O: [3.0, 3.0], Ne: [4.4, 2.8] };

    const pg: Record<string, number> = { bes: 1, small: 0, shapes: 0, future: 0, astro: 0 };
    let tgt: Record<string, number> = { bes: 1, small: 0, shapes: 0, future: 0, astro: 0 };

    // ---------- the phase-diagram map ----------
    const drawMap = (g: CanvasRenderingContext2D, w: number, h: number, hiBes: number, hiAstro: number, a: number) => {
      const r = plotRect(w, h, { l: 56, r: 26, t: 30, b: 50 });
      const pl = plot(
        g,
        ctx,
        r,
        { min: 0, max: MU_MAX, label: L('mu'), ticks: [0, 400, 800, 1200].map((v) => ({ v, label: String(v) })) },
        { min: 0, max: T_MAX, label: L('temp'), ticks: [0, 50, 100, 150, 200].map((v) => ({ v, label: String(v) })) },
      );
      g.save();
      g.globalAlpha = a;
      // highlights behind the curves
      g.save();
      g.fillStyle = th.accent2;
      if (hiBes > 0.02) {
        g.globalAlpha = 0.06 * hiBes * a;
        g.fillRect(pl.X(MU_CP), pl.Y(T_MAX), pl.X(850) - pl.X(MU_CP), pl.Y(0) - pl.Y(T_MAX));
      }
      if (hiAstro > 0.02) {
        g.globalAlpha = 0.08 * hiAstro * a;
        g.fillRect(pl.X(850), pl.Y(80), pl.X(MU_MAX) - pl.X(850), pl.Y(0) - pl.Y(80));
      }
      g.restore();
      pl.axes();
      // regions
      txt(g, L('qgp'), pl.X(60), pl.Y(190), { color: th.fg, alpha: 0.75 * a });
      txt(g, L('hadrons'), pl.X(150), pl.Y(40), { color: th.fg, alpha: 0.75 * a });
      // crossover (solid) and hypothetical first-order line (dashed)
      g.save();
      g.globalAlpha = a;
      g.strokeStyle = th.fg;
      g.lineWidth = 1.5;
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const mu = (MU_CP * i) / 60;
        const x = pl.X(mu);
        const y = pl.Y(Tfo(mu));
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.setLineDash([5, 4]);
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const mu = MU_CP + ((MU_NUC - MU_CP) * i) / 60;
        const x = pl.X(mu);
        const y = pl.Y(Tfirst(mu));
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.restore();
      // critical point (hypothetical) and nuclear matter
      ring(g, pl.X(MU_CP), pl.Y(T_CP), 6, th.accent, 1.3, a);
      txt(g, L('cp'), pl.X(MU_CP) + 10, pl.Y(T_CP) - 10, { color: th.accent, alpha: a });
      dot(g, pl.X(MU_NUC), pl.Y(0), 3, th.fg, 0.9 * a);
      txt(g, L('nuclear'), pl.X(MU_NUC), pl.Y(0) - 14, { color: th.fg, align: 'center', alpha: 0.8 * a });
      // collision energies along the freeze-out curve
      const mus: [number, string][] = [
        [HI.MU_B_LHC_MEV.value as number, 'LHC'],
        [HI.MU_B_RHIC_200_MEV.value as number, '200'],
        [HI.MU_B_RHIC_7_7_MEV.value as number, '7.7'],
        [HI.MU_B_FIXED_TARGET_MAX_MEV.value as number, '3'],
      ];
      mus.forEach(([mu, name], i) => {
        const x = pl.X(mu);
        const y = pl.Y(Tfo(mu));
        dot(g, x, y, 3, th.accent, a);
        if (i === 0) txt(g, 'LHC', x + 8, y - 12, { mono: true, color: th.accent, alpha: a });
        else if (i === 1) txt(g, '200 GeV', x + 12, y - 12, { mono: true, color: th.accent, alpha: a });
        else txt(g, `${name} GeV`, x, y + 16, { mono: true, color: th.accent, align: 'center', alpha: a });
      });
      txt(g, L('sqrts'), pl.X(MU_MAX), pl.Y(T_MAX) - 14, { color: th.fg, align: 'right', alpha: 0.75 * a });
      if (hiBes > 0.02) {
        // energy-scan arrow along the curve toward higher density
        const m0 = 60;
        const m1 = 700;
        g.save();
        g.globalAlpha = hiBes * a;
        g.strokeStyle = th.accent;
        g.lineWidth = 1.4;
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
          const mu = m0 + ((m1 - m0) * i) / 40;
          const [x, y] = [pl.X(mu), pl.Y(Tfo(mu)) + 8];
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.restore();
        arrow(g, pl.X(m1 - 25), pl.Y(Tfo(m1 - 25)) + 8, pl.X(m1), pl.Y(Tfo(m1)) + 8, th.accent, 1.4, hiBes * a, 7);
        txt(g, L('lowerE'), pl.X(520), pl.Y(Tfo(520) + 34), { color: th.accent, alpha: hiBes * a });
        txt(g, L('densest'), pl.X(MU_CP) + 8, pl.Y(T_MAX) + 14, { color: th.accent2, alpha: hiBes * a });
      }
      if (hiAstro > 0.02) {
        txt(g, L('ns'), pl.X(850) + 8, pl.Y(80) + 14, { color: th.accent2, alpha: hiAstro * a });
        // merger icon: two discs spiralling in
        const cx = pl.X(1060);
        const cy = pl.Y(45);
        for (const sgn of [-1, 1]) {
          ring(g, cx + sgn * 14, cy, 6, th.accent2, 1.2, hiAstro * a);
          dot(g, cx + sgn * 14, cy, 3, th.accent2, hiAstro * a * 0.8);
        }
        g.save();
        g.strokeStyle = th.accent2;
        g.globalAlpha = 0.6 * hiAstro * a;
        g.lineWidth = 1;
        g.beginPath();
        for (let i = 0; i <= 30; i++) {
          const ang = i * 0.25;
          const rr = 8 + i * 0.9;
          const x = cx + rr * Math.cos(ang) * 0.9;
          const y = cy + rr * Math.sin(ang) * 0.9 - 26;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.restore();
        txt(g, L('merger'), cx, cy + 22, { color: th.accent2, align: 'center', alpha: hiAstro * a });
        arrow(g, pl.X(HI.MU_B_FIXED_TARGET_MAX_MEV.value as number) + 10, pl.Y(Tfo(720)) + 4, pl.X(850) - 4, pl.Y(45), th.fg, 1, 0.6 * hiAstro * a, 6);
        txt(g, L('samedensity'), pl.X(560), pl.Y(14), { color: th.fg, align: 'center', alpha: 0.75 * hiAstro * a });
      }
      g.restore();
    };

    // ---------- small systems ----------
    const drawSmall = (g: CanvasRenderingContext2D, w: number, h: number, a: number) => {
      const ksf = (h * 0.3) / 7;
      const cy = h * 0.46;
      const items = [
        { x: w * 0.17, R: 1.0, name: 'pp', flow: 0 },
        { x: w * 0.42, R: 2.2, name: 'pPb', flow: 1 },
        { x: w * 0.74, R: 7, name: 'PbPb', flow: 2 },
      ];
      items.forEach((it, idx) => {
        const rpx = it.R * ksf;
        const dash = it.flow === 0 ? [4, 3] : it.flow === 1 ? [4, 3] : [];
        ring(g, it.x, cy, rpx, th.accent, 1.5, a);
        g.save();
        g.fillStyle = th.accent;
        g.globalAlpha = 0.12 * a;
        g.beginPath();
        g.arc(it.x, cy, rpx, 0, Math.PI * 2);
        g.fill();
        g.restore();
        const n = it.flow === 2 ? 14 : 10;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          const r0 = rpx + 4;
          const len = 16 + (it.flow === 2 ? 4 : 0);
          // elliptic modulation visible in Pb-Pb only, schematic
          const mod = it.flow === 2 ? 1 + 0.35 * Math.cos(2 * ang) : 1;
          const x0 = it.x + r0 * Math.cos(ang);
          const y0 = cy - r0 * Math.sin(ang);
          const x1 = it.x + (r0 + len * mod) * Math.cos(ang);
          const y1 = cy - (r0 + len * mod) * Math.sin(ang);
          if (dash.length) {
            line(g, x0, y0, x1, y1, th.fg, 1.1, 0.7 * a, dash);
          } else arrow(g, x0, y0, x1, y1, th.fg, 1.2, 0.85 * a, 5);
        }
        txt(g, L(it.name), it.x, cy + rpx + 40, { color: th.fg, align: 'center', alpha: a });
        if (idx === 0) txt(g, '?', it.x, cy, { color: th.accent, align: 'center', alpha: a });
        if (idx === 1) txt(g, '?', it.x, cy, { color: th.accent, align: 'center', alpha: a });
      });
      // scale bar: 5 fm
      const bx = w * 0.06;
      const by = h - 38;
      line(g, bx, by, bx + 5 * ksf, by, th.fg, 1.5, 0.85 * a);
      line(g, bx, by - 4, bx, by + 4, th.fg, 1, 0.85 * a);
      line(g, bx + 5 * ksf, by - 4, bx + 5 * ksf, by + 4, th.fg, 1, 0.85 * a);
      txt(g, `5 fm`, bx + 2.5 * ksf, by + 14, { mono: true, color: th.fg, align: 'center', alpha: 0.85 * a });
      line(g, w * 0.5, by, w * 0.5 + 24, by, th.fg, 1.1, 0.7 * a, [4, 3]);
      txt(g, L('debated'), w * 0.5 + 32, by, { color: th.fg, alpha: 0.8 * a });
      arrow(g, w * 0.5 + 6, by + 18, w * 0.5 + 28, by + 18, th.fg, 1.2, 0.85 * a, 5);
      txt(g, L('established'), w * 0.5 + 32, by + 18, { color: th.fg, alpha: 0.8 * a });
    };

    // ---------- shapes ----------
    const drawShapes = (g: CanvasRenderingContext2D, w: number, h: number, a: number) => {
      const ksf = Math.min((w * 0.22) / 5, (h * 0.2) / 3.5);
      const rows = [
        { cy: h * 0.27, ev: oxy, key: 'O', name: 'o16' },
        { cy: h * 0.72, ev: ne, key: 'Ne', name: 'ne20' },
      ];
      rows.forEach((row) => {
        const [sa, sb] = nucOutline[row.key as 'O' | 'Ne'];
        const cx1 = w * 0.17;
        const cx2 = w * 0.62;
        // nucleus (projected along the beam)
        g.save();
        g.strokeStyle = th.fg;
        g.globalAlpha = 0.45 * a;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(cx1, row.cy, sa * ksf, sb * ksf, 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        row.ev.a.pts.forEach(([x, y]) => dot(g, cx1 + x * ksf, row.cy - y * ksf, 2.4, th.fg, 0.75 * a));
        txt(g, L(row.name), cx1, row.cy + (sb + 0.9) * ksf + 6, { color: th.fg, align: 'center', alpha: 0.9 * a });
        arrow(g, cx1 + (sa + 0.6) * ksf, row.cy, cx2 - 4.2 * ksf, row.cy, th.fg, 1, 0.5 * a, 6);
        txt(g, L('collide'), (cx1 + cx2) / 2 - 0.9 * ksf, row.cy - 10, { color: th.fg, align: 'center', alpha: 0.6 * a });
        // participant zone
        const r = row.ev.r;
        g.save();
        g.strokeStyle = th.fg;
        g.globalAlpha = 0.15 * a;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(cx2, row.cy, sa * ksf, sb * ksf, 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        // spectators faint, participants bright
        const isPart = (p: [number, number], list: [number, number][]) => list.some((q) => q[0] === p[0] && q[1] === p[1]);
        [row.ev.a, row.ev.b].forEach((nuc, k) => {
          const parts = k === 0 ? r.pa : r.pb;
          nuc.pts.forEach((p) => {
            const part = isPart(p, parts);
            dot(g, cx2 + p[0] * ksf, row.cy - p[1] * ksf, part ? 2.8 : 1.6, part ? th.accent : th.fg, (part ? 0.95 : 0.3) * a);
          });
        });
        // ellipse of the participant distribution (2 sigma) and flow arrows along its short axis
        g.save();
        g.strokeStyle = th.accent;
        g.globalAlpha = 0.8 * a;
        g.setLineDash([4, 3]);
        g.lineWidth = 1.1;
        g.beginPath();
        g.ellipse(cx2 + r.mx * ksf, row.cy - r.my * ksf, 2 * r.major * ksf, 2 * r.minor * ksf, -r.phi, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        const unit = 130 * r.eps2 + 6; // arrow length ~ eps2 along the short axis
        for (const sgn of [-1, 1]) {
          const ang = -r.phi + Math.PI / 2; // short-axis direction in canvas coordinates
          const x0 = cx2 + r.mx * ksf + sgn * Math.cos(ang) * (2 * r.minor * ksf + 5);
          const y0 = row.cy - r.my * ksf + sgn * Math.sin(ang) * (2 * r.minor * ksf + 5);
          arrow(g, x0, y0, x0 + sgn * Math.cos(ang) * unit, y0 + sgn * Math.sin(ang) * unit, th.fg, 1.4, 0.95 * a, 6);
        }
        txt(g, `ε₂ = ${f2(r.eps2)}`, cx2 + 5.6 * ksf, row.cy - 8, { mono: true, color: th.accent, alpha: a });
        txt(g, L(row.key === 'O' ? 'weaker' : 'stronger'), cx2 + 5.6 * ksf, row.cy + 10, { color: th.fg, alpha: 0.85 * a });
      });
    };

    // ---------- future timeline ----------
    const drawFuture = (g: CanvasRenderingContext2D, w: number, h: number, a: number) => {
      const x0 = 70;
      const x1 = w - 30;
      const y0 = h - 56;
      const X = (yr: number) => x0 + ((x1 - x0) * (yr - 2025)) / 15;
      line(g, x0, y0, x1, y0, th.fg, 1, 0.5 * a);
      for (let yr = 2025; yr <= 2040; yr += 5) {
        line(g, X(yr), y0, X(yr), y0 + 5, th.fg, 1, 0.5 * a);
        txt(g, String(yr), X(yr), y0 + 17, { mono: true, color: th.fg, align: 'center', alpha: 0.7 * a });
      }
      // each: [label, start range (fuzzy), end]
      const rows: { k: string; from: number; fuzz: number; col: string }[] = [
        { k: 'cbm', from: 2028, fuzz: 2, col: th.accent },
        { k: 'eic', from: 2034, fuzz: 2, col: th.accent2 },
        { k: 'alice3', from: 2035, fuzz: 2, col: th.accent },
      ];
      rows.forEach((row, i) => {
        const y = 50 + i * ((y0 - 90) / 3);
        // fuzzy start: dashed, then solid to the end of the axis with an arrowhead
        line(g, X(row.from - row.fuzz / 2), y, X(row.from + row.fuzz / 2), y, row.col, 2, 0.85 * a, [3, 3]);
        arrow(g, X(row.from + row.fuzz / 2), y, x1, y, row.col, 2, 0.95 * a, 7);
        txt(g, L(row.k), X(row.from - row.fuzz / 2), y - 14, { color: row.col, alpha: a });
        txt(g, L(row.k + 'When'), x1, y - 14, { color: th.fg, align: 'right', alpha: 0.8 * a });
      });
      txt(g, L('asof'), x0, 14, { color: th.fg, alpha: 0.65 * a });
    };

    const c = createCanvas2D(ctx, (g, s) => {
      for (const k of Object.keys(tgt)) pg[k] = approach(pg[k], tgt[k], s.dt, 0.35);
      const mapA = Math.max(pg.bes, pg.astro);
      if (mapA > 0.25) drawMap(g, s.w, s.h, pg.bes / Math.max(0.001, mapA), pg.astro / Math.max(0.001, mapA), mapA);
      if (pg.small > 0.02) drawSmall(g, s.w, s.h, pg.small);
      if (pg.shapes > 0.02) drawShapes(g, s.w, s.h, pg.shapes);
      if (pg.future > 0.02) drawFuture(g, s.w, s.h, pg.future);
    });
    c.animate = true;

    return {
      setState(st: string, o: SetStateOptions) {
        const k = (STATES as readonly string[]).includes(st) ? (st as St) : 'bes-next';
        tgt = { bes: 0, small: 0, shapes: 0, future: 0, astro: 0 };
        tgt[PAGE[k]] = 1;
        if (o.immediate || ctx.reducedMotion) Object.assign(pg, tgt);
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

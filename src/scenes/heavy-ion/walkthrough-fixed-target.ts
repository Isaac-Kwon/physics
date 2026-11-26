/**
 * hi.walkthrough-fixed-target — P9 Detection Walkthrough, schematic top view of a fixed-target experiment (CBM-like).
 * Beam along z, target at z = 0. Tracks come from a simple model of a Au+Au collision at a few GeV per nucleon: pions, kaons and
 * protons with exponential CM momentum (mean 0.35 GeV/c), isotropic in the CM frame, then Lorentz-boosted along z with
 * gamma_cm = 2.5 (about 10 AGeV beam) — so the forward cone follows from the kinematics. A vertical dipole field B = 1 T
 * fills z in [0, 1 m] and bends tracks in the horizontal plane with R = p_xz / (0.3 B). Hits are exact crossings of the station
 * planes; flight times at the TOF wall are path length / (beta c).
 * Simplifications: a 2D projection (py only enters through |p|), station sizes and the RICH/TOF distances are schematic,
 * charge sign random, no multiple scattering or detector resolution.
 */
import { interpolateViridis } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32, gaussian, clamp } from '../shared/canvas2d';
import { plot, plotRect } from '../shared/plot';
import { HI } from '../../data/heavy-ion';
import { arrow, dot, fieldSymbol, line, ring, txt } from '../common/_draw';

const STATES = ['cone', 'silicon-stations', 'bend', 'time-stamp', 'reconstruct', 'free-streaming'] as const;
type St = (typeof STATES)[number];

const B = 1; // T
const GAMMA_CM = 2.5;
const BETA_CM = Math.sqrt(1 - 1 / GAMMA_CM ** 2);
const Z_MAG = 1.0;
const ST_Z = [0.05, 0.1, 0.3, 0.42, 0.54, 0.66, 0.78, 0.9]; // two MAPS planes, six strip stations
const N_MAPS = 2;
const apert = (z: number) => 0.05 + 0.32 * z; // half height of a station
const Z_RICH0 = 1.55;
const Z_RICH1 = 2.3;
const Z_TOF = 3.0;
const X_MAX = 0.9;
const C = 0.2998; // m/ns
const MASS = { pi: 0.13957, K: 0.49368, p: 0.93827 };
const N_TRK = 46;

interface Kin {
  m: number;
  q: 1 | -1;
  p: number; // GeV/c
  pxz: number;
  a0: number; // angle from +z toward +x in the plane
  theta: number; // lab polar angle
  beta: number;
}
interface Traj {
  pts: [number, number][];
  hits: ([number, number] | null)[];
  tof: number | null;
  ztof: number | null;
}

function makeKin(n: number): Kin[] {
  const rnd = mulberry32(21);
  const out: Kin[] = [];
  while (out.length < n) {
    const u = rnd();
    const m = u < 0.78 ? MASS.pi : u < 0.9 ? MASS.K : MASS.p;
    const q = (m === MASS.p ? 1 : rnd() < 0.5 ? 1 : -1) as 1 | -1;
    const ps = -0.35 * Math.log(1 - rnd() * 0.999) + 0.05;
    const ct = 2 * rnd() - 1;
    const st = Math.sqrt(1 - ct * ct);
    const ph = rnd() * Math.PI * 2;
    const Es = Math.hypot(ps, m);
    const px = ps * st * Math.cos(ph);
    const py = ps * st * Math.sin(ph);
    const pz = GAMMA_CM * (ps * ct + BETA_CM * Es);
    if (pz <= 0.1 || Math.hypot(px, py, pz) < 0.35) continue;
    const theta = Math.atan2(Math.hypot(px, py), pz);
    if (Math.tan(theta) > 0.42) continue;
    const p = Math.hypot(px, py, pz);
    out.push({ m, q, p, pxz: Math.hypot(px, pz), a0: Math.atan2(px, pz), theta, beta: p / Math.hypot(p, m) });
  }
  return out;
}

function trajectory(k: Kin, bfac: number): Traj {
  const ds = 0.02;
  let z = 0;
  let x = 0;
  let a = k.a0;
  let len = 0;
  const pts: [number, number][] = [[0, 0]];
  const hits: ([number, number] | null)[] = ST_Z.map(() => null);
  let tof: number | null = null;
  let ztof: number | null = null;
  const R = k.pxz / (0.3 * B);
  for (let i = 0; i < 400; i++) {
    const inMag = z >= 0 && z <= Z_MAG;
    const zn = z + Math.cos(a) * ds;
    const xn = x + Math.sin(a) * ds;
    ST_Z.forEach((zs, j) => {
      if (!hits[j] && z < zs && zn >= zs) {
        const f = (zs - z) / (zn - z);
        const xh = x + (xn - x) * f;
        if (Math.abs(xh) <= apert(zs)) hits[j] = [zs, xh];
      }
    });
    if (tof === null && z < Z_TOF && zn >= Z_TOF) {
      const f = (Z_TOF - z) / (zn - z);
      tof = (len + ds * f) / (k.beta * C);
      ztof = x + (xn - x) * f;
    }
    z = zn;
    x = xn;
    len += ds;
    if (inMag) a -= (k.q * bfac * ds) / R;
    pts.push([z, x]);
    if (z > Z_TOF + 0.02 || Math.abs(x) > X_MAX) break;
  }
  return { pts, hits, tof, ztof };
}

type Levels = Record<string, number>;
const TARGET: Record<St, Levels> = {
  cone: { sta: 0, mag: 0, bfac: 0, ts: 0, rec: 0, strm: 0, guide: 1, tag: 0, trk: 0.6 },
  'silicon-stations': { sta: 1, mag: 0, bfac: 0, ts: 0, rec: 0, strm: 0, guide: 0, tag: 0, trk: 0.4 },
  bend: { sta: 1, mag: 1, bfac: 1, ts: 0, rec: 0, strm: 0, guide: 0, tag: 1, trk: 0.55 },
  'time-stamp': { sta: 0.6, mag: 0.6, bfac: 1, ts: 1, rec: 0, strm: 0, guide: 0, tag: 0, trk: 0.4 },
  reconstruct: { sta: 1, mag: 0.6, bfac: 1, ts: 0.3, rec: 1, strm: 0, guide: 0, tag: 0, trk: 0.12 },
  'free-streaming': { sta: 0, mag: 0, bfac: 1, ts: 0, rec: 0, strm: 1, guide: 0, tag: 0, trk: 0 },
};

const sup = (n: number) => String(n).replace(/[-0-9]/g, (ch) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(ch)]);

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const f1 = (v: number, d = 1) => ctx.formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d });
    const kin = makeKin(Math.max(18, Math.round(N_TRK * ctx.quality)));
    const thetas = kin.map((k) => k.theta).sort((a, b) => a - b);
    const theta90 = thetas[Math.floor(thetas.length * 0.9)];

    // free-streaming data: collisions at fixed times (a Poisson-like sample, a few of them closer than the hit time spread)
    const rnd = mulberry32(77);
    const T_COL = [18, 44, 52, 128, 142, 236];
    const T_MAX = 280;
    const streamHits: { t: number; y: number; k: number }[] = [];
    T_COL.forEach((t0, k) => {
      const n = 14;
      for (let i = 0; i < n; i++) streamHits.push({ t: t0 + clamp(gaussian(rnd) * 4, -9, 9) + 6, y: (rnd() * 2 - 1) * 0.9, k });
    });
    streamHits.sort((a, b) => a.t - b.t);
    const colOf = (k: number) => interpolateViridis(0.3 + (0.65 * k) / (T_COL.length - 1));
    const rateExp = Math.round(Math.log10(HI.CBM_RATE_HZ.value as number));
    const spacing = 1e9 / (HI.CBM_RATE_HZ.value as number); // ns

    const lv: Levels = { ...TARGET.cone, hits: 0, sep: 0 };
    let tgt: Levels = { ...TARGET.cone };
    let state: St = 'cone';
    let tEnter = 0;
    let tNow = 0;

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      tNow = s.t;
      for (const k of Object.keys(tgt)) lv[k] = approach(lv[k], tgt[k], s.dt, 0.45);
      const hitsTarget = state === 'cone' ? 0 : 1;
      lv.hits = approach(lv.hits, hitsTarget, s.dt, 0.4);
      const sinceEnter = s.t - tEnter;

      // ---------- free streaming view ----------
      if (lv.strm > 0.5) {
        const a = lv.strm;
        const reveal = ctx.reducedMotion ? 1 : clamp(sinceEnter / 2.2);
        const sepT = ctx.reducedMotion ? 1 : sinceEnter > 2.6 ? 1 : 0;
        lv.sep = approach(lv.sep, state === 'free-streaming' ? sepT : 0, s.dt, 0.6);
        const r = plotRect(w, h, { l: 56, r: 24, t: 66, b: 56 });
        g.save();
        g.globalAlpha = a;
        const pl = plot(g, ctx, r, { min: 0, max: T_MAX, label: L('timeaxis'), ticks: [0, 100, 200].map((v) => ({ v, label: String(v) })) }, { min: -1, max: 1, label: L('posaxis'), ticks: [] });
        pl.axes();
        const cursor = reveal * T_MAX;
        for (const ht of streamHits) {
          if (ht.t > cursor) continue;
          dot(g, pl.X(ht.t), pl.Y(ht.y), 2.6, th.fg, (1 - lv.sep) * 0.8);
          dot(g, pl.X(ht.t), pl.Y(ht.y), 2.6, colOf(ht.k), lv.sep);
        }
        if (reveal < 1) line(g, pl.X(cursor), r.y, pl.X(cursor), r.y + r.h, th.fg, 1, 0.4);
        // collision labels once separated
        T_COL.forEach((t0, k) => txt(g, String(k + 1), pl.X(t0 + 6), r.y + 4, { mono: true, color: colOf(k), align: 'center', alpha: lv.sep }));
        txt(g, `${L('rate')} ~10${sup(rateExp)} s⁻¹`, r.x + 4, 10, { mono: true, color: th.accent, alpha: 1 });
        txt(g, `${L('spacing')} ~${f0(spacing)} ns`, r.x + 4, 26, { mono: true, color: th.fg, alpha: 0.75 });
        txt(g, L(lv.sep > 0.5 ? 'sorted' : 'stream'), r.x + r.w, 10, { color: th.fg, align: 'right', alpha: 0.9 });
        g.restore();
      }
      if (lv.strm > 0.5) return;

      // ---------- geometry view ----------
      const geo = 1 - lv.strm;
      const ks = Math.min((w - 70) / 3.45, (h - 72) / 1.9);
      const ox = 22;
      const cy = h * 0.5 - 6;
      const P = (z: number, x: number): [number, number] => [ox + (z + 0.2) * ks, cy - x * ks];
      g.save();
      g.globalAlpha = geo;

      // beam line, target
      const [bx0, by0] = P(-0.2, 0);
      const [tx, ty] = P(0, 0);
      const [bx1] = P(Z_TOF + 0.1, 0);
      line(g, tx, ty, bx1, ty, th.fg, 1, 0.2, [2, 5]);
      arrow(g, bx0, by0, tx - 6, ty, th.fg, 1.4, 0.85, 7);
      txt(g, L('beam'), bx0 + 2, by0 - 14, { color: th.fg, alpha: 0.75 });
      g.save();
      g.fillStyle = th.fg;
      g.globalAlpha = 0.9;
      g.fillRect(tx - 1.5, ty - 5, 3, 10);
      g.restore();
      txt(g, L('target'), tx, ty + 20, { color: th.fg, align: 'center', alpha: 0.75 });

      // magnet
      if (lv.mag > 0.02) {
        const [m0x, m0y] = P(0, 0.78);
        const [m1x] = P(Z_MAG, 0);
        const wm = m1x - m0x;
        const yh = 0.17 * ks;
        g.save();
        g.fillStyle = th.fg;
        g.globalAlpha = 0.06 * lv.mag;
        g.fillRect(m0x, m0y, wm, yh);
        g.fillRect(m0x, P(0, -0.78)[1] - yh, wm, yh);
        g.restore();
        for (const yy of [m0y, P(0, -0.78)[1] - yh]) {
          g.save();
          g.strokeStyle = th.fg;
          g.globalAlpha = 0.45 * lv.mag;
          g.lineWidth = 1;
          g.strokeRect(m0x, yy, wm, yh);
          g.restore();
        }
        for (let i = 0; i < 6; i++) for (const xx of [-0.5, 0, 0.5]) {
          const [qx, qy] = P(0.1 + i * 0.16, xx);
          fieldSymbol(g, qx, qy, true, th.fg, 0.28 * lv.mag, 3.6);
        }
        txt(g, L('magnet'), m0x, m0y - 10, { color: th.fg, alpha: 0.85 * lv.mag });
        txt(g, `B = ${f0(B)} T`, m1x, m0y - 10, { mono: true, color: th.fg, align: 'right', alpha: 0.85 * lv.mag });
      }

      // station planes
      if (lv.sta > 0.02) {
        ST_Z.forEach((zs, j) => {
          const [x0, y0] = P(zs, apert(zs));
          const [, y1] = P(zs, -apert(zs));
          const maps = j < N_MAPS;
          line(g, x0, y0, x0, y1, th.accent2, maps ? 3 : 1.6, lv.sta * (maps ? 0.9 : 0.75));
        });
        const [lx0, ly0] = P(ST_Z[0], apert(ST_Z[0]));
        txt(g, L('pixels'), lx0 - 4, ly0 - 26, { color: th.accent2, alpha: lv.sta, align: 'left' });
        const [lx1, ly1] = P(ST_Z[4], apert(ST_Z[4]));
        txt(g, L('strips'), lx1, ly1 - 12, { color: th.accent2, alpha: lv.sta, align: 'center' });
      }

      // RICH and TOF
      if (lv.ts > 0.02) {
        const [r0x, r0y] = P(Z_RICH0, 0.62);
        const [r1x, r1y] = P(Z_RICH1, -0.62);
        g.save();
        g.strokeStyle = th.fg;
        g.globalAlpha = 0.4 * lv.ts;
        g.lineWidth = 1;
        g.strokeRect(r0x, r0y, r1x - r0x, r1y - r0y);
        g.restore();
        txt(g, L('rich'), (r0x + r1x) / 2, r0y - 10, { color: th.fg, align: 'center', alpha: 0.85 * lv.ts });
        const [wx, wy0] = P(Z_TOF, X_MAX);
        const [, wy1] = P(Z_TOF, -X_MAX);
        const nseg = 14;
        for (let i = 0; i < nseg; i++) {
          const ya = wy0 + ((wy1 - wy0) * i) / nseg + 1;
          const yb = wy0 + ((wy1 - wy0) * (i + 1)) / nseg - 1;
          line(g, wx, ya, wx, yb, th.accent2, 3, lv.ts);
        }
        txt(g, L('tofwall'), wx + 6, wy0 + 4, { color: th.accent2, alpha: lv.ts });
      }

      // tracks
      const trajs = kin.map((k) => trajectory(k, lv.bfac));
      if (lv.trk > 0.01) {
        g.save();
        g.strokeStyle = th.accent;
        g.lineWidth = 1;
        g.globalAlpha = lv.trk;
        trajs.forEach((t) => {
          g.beginPath();
          t.pts.forEach(([z, x], i) => {
            const [px, py] = P(z, x);
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          });
          g.stroke();
        });
        g.restore();
      }

      // cone guide
      if (lv.guide > 0.02) {
        const zz = 1.5;
        const [gx0, gy0] = P(0, 0);
        const [gx1, gy1] = P(zz, zz * Math.tan(theta90));
        const [, gy2] = P(zz, -zz * Math.tan(theta90));
        line(g, gx0, gy0, gx1, gy1, th.fg, 1, 0.55 * lv.guide, [4, 4]);
        line(g, gx0, gy0, gx1, gy2, th.fg, 1, 0.55 * lv.guide, [4, 4]);
        g.save();
        g.strokeStyle = th.fg;
        g.globalAlpha = 0.7 * lv.guide;
        g.beginPath();
        g.arc(gx0, gy0, 0.55 * ks, -theta90, 0);
        g.stroke();
        g.restore();
        txt(g, `θ ≈ ${f0((theta90 * 180) / Math.PI)}°`, gx0 + 0.58 * ks, gy0 - 0.58 * ks * Math.tan(theta90) / 2 - 8, { mono: true, color: th.fg, alpha: 0.9 * lv.guide });
        txt(g, L('cone'), gx1 + 8, gy1 + 2, { color: th.fg, alpha: 0.9 * lv.guide });
        txt(g, L('boost'), gx1 + 8, gy1 + 18, { color: th.fg, alpha: 0.6 * lv.guide });
      }

      // hits
      if (lv.hits > 0.02 && lv.sta > 0.02) {
        trajs.forEach((t) =>
          t.hits.forEach((hh) => {
            if (!hh) return;
            const [x, y] = P(hh[0], hh[1]);
            dot(g, x, y, 1.9, th.accent, lv.hits * lv.sta);
          }),
        );
      }

      // bend: highlight a soft and a stiff positive track and tag with p
      if (lv.tag > 0.02) {
        const reach = (i: number) => trajs[i].pts[trajs[i].pts.length - 1][0] > Z_TOF - 0.05;
        const pickSoft = kin.findIndex((k, i) => k.q > 0 && k.p > 0.45 && k.p < 0.9 && reach(i));
        let pickStiff = -1;
        kin.forEach((k, i) => {
          if (k.q > 0 && k.p > 1.8 && reach(i) && (pickStiff < 0 || k.p > kin[pickStiff].p)) pickStiff = i;
        });
        [
          [pickSoft, th.fg],
          [pickStiff, th.accent],
        ].forEach(([i, col]) => {
          if ((i as number) < 0) return;
          const t = trajs[i as number];
          g.save();
          g.strokeStyle = col as string;
          g.lineWidth = 1.8;
          g.globalAlpha = lv.tag;
          g.beginPath();
          t.pts.forEach(([z, x], j) => {
            const [px, py] = P(z, x);
            j ? g.lineTo(px, py) : g.moveTo(px, py);
          });
          g.stroke();
          g.restore();
          const e = t.pts[t.pts.length - 1];
          const [ex, ey] = P(e[0], e[1]);
          txt(g, `p = ${f1(kin[i as number].p, 1)} GeV/c`, ex - 6, ey + (ey > cy ? 14 : -12), { mono: true, color: col as string, align: 'right', alpha: lv.tag });
        });
        txt(g, L('bendhint'), ox, h - 14, { color: th.fg, alpha: 0.8 * lv.tag });
      }

      // time stamps and a Cherenkov ring
      if (lv.ts > 0.02) {
        let shown = 0;
        trajs.forEach((t, i) => {
          if (t.tof === null || t.ztof === null) return;
          if (kin[i].p < 0.4) return;
          const [x, y] = P(Z_TOF, t.ztof);
          dot(g, x, y, 2.6, th.accent, lv.ts);
          if (shown < 6 && i % 5 === 0) {
            txt(g, `${f1(t.tof, 1)} ns`, x + 8, y, { mono: true, color: th.fg, alpha: 0.9 * lv.ts });
            shown++;
          }
        });
        const e = trajs.findIndex((t, i) => kin[i].m === MASS.pi && kin[i].p > 1.2 && t.pts[t.pts.length - 1][0] > Z_TOF - 0.05);
        if (e >= 0) {
          const t = trajs[e];
          const q = t.pts.find((pp) => pp[0] >= Z_RICH1) ?? t.pts[t.pts.length - 1];
          const [rx, ry] = P(Z_RICH1, q[1]);
          ring(g, rx, ry, 0.1 * ks, th.accent, 1.2, lv.ts);
          dot(g, rx, ry, 2.2, th.accent, lv.ts);
          txt(g, L('ring'), rx, ry + 0.1 * ks + 12, { color: th.accent, align: 'center', alpha: lv.ts });
        }
      }

      // reconstruction: hits connected to tracks, extrapolated back to the vertex
      if (lv.rec > 0.02) {
        trajs.forEach((t) => {
          const hh = t.hits.filter((q): q is [number, number] => !!q);
          if (hh.length < 3) return;
          const nShow = Math.max(2, Math.ceil(hh.length * lv.rec));
          g.save();
          g.strokeStyle = th.accent;
          g.lineWidth = 1.3;
          g.globalAlpha = 0.9;
          g.beginPath();
          hh.slice(0, nShow).forEach(([z, x], i) => {
            const [px, py] = P(z, x);
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          });
          g.stroke();
          g.restore();
          // straight back-extrapolation of the two innermost hits to the target plane
          const [a, b] = hh;
          const slope = (b[1] - a[1]) / (b[0] - a[0]);
          const [e0x, e0y] = P(0, a[1] - slope * a[0]);
          const [e1x, e1y] = P(a[0], a[1]);
          line(g, e0x, e0y, e1x, e1y, th.fg, 1, 0.5 * lv.rec, [2, 3]);
        });
        ring(g, tx, ty, 6, th.fg, 1.2, lv.rec);
        txt(g, L('vertex'), tx + 10, ty + 24, { color: th.fg, alpha: lv.rec, align: 'left' });
        txt(g, L('reco'), ox, h - 14, { color: th.fg, alpha: 0.8 * lv.rec });
      }
      g.restore();
    });
    c.animate = true;

    return {
      setState(st: string, o: SetStateOptions) {
        const s2 = (STATES as readonly string[]).includes(st) ? (st as St) : 'cone';
        state = s2;
        tEnter = tNow;
        tgt = { ...TARGET[s2] };
        if (o.immediate || ctx.reducedMotion) {
          Object.assign(lv, TARGET[s2]);
          lv.hits = s2 === 'cone' ? 0 : 1;
          lv.sep = s2 === 'free-streaming' ? 1 : 0;
        }
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

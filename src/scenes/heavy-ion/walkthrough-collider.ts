/**
 * hi.walkthrough-collider — P9 Detection Walkthrough, schematic cutaway of a collider barrel (ALICE-like), end view.
 * Layers from the inside: beam pipe, three silicon pixel layers (ITS, radii exaggerated), TPC (0.85-2.5 m), TOF barrel (3.7 m),
 * solenoid with B = 0.5 T along the beam axis (out of the page). All tracks are exact circles with R = pT / (0.3 B)
 * [R m, pT GeV/c, B T]; hit points are true intersections with the layer radii. The TPC drift times (v_d = 2.7 cm/us) and
 * the time of flight L / (beta c) are computed from the geometry, not typed in.
 * Simplifications: pz = 0 for the arc-length bookkeeping (side view uses a fixed cot(theta)), silicon radii not to scale,
 * one particle shown in detail, ionization clusters equally spaced with a heavy-tailed charge.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32, clamp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { HI } from '../../data/heavy-ion';
import { dEdx, betaOf } from '../../components/widgets/_physics';
import { arrow, dot, fieldSymbol, line, ring, txt } from '../common/_draw';

const STATES = ['birth', 'pixels', 'curvature', 'tpc-drift', 'tof', 'identity', 'pid-trick'] as const;
type St = (typeof STATES)[number];

const B = HI.B_FIELD_BARREL_T.value as number; // T
const R_PIPE = 0.18;
const R_ITS = [0.3, 0.45, 0.6];
const R_TPC0 = 0.85;
const R_TPC1 = 2.5;
const R_TOF = 3.7;
const R_MAG = 4.3;
const R_VIEW = 4.6;
const L_TPC = 2.5; // half length, m
const V_DRIFT = 0.027; // m/us
const C = 0.2998; // m/ns
const M = { pi: 0.13957, K: 0.49368, p: 0.93827 };

interface Trk {
  x0: number;
  y0: number;
  phi: number;
  q: 1 | -1;
  pT: number;
}
const Rof = (t: Trk) => t.pT / (0.3 * B);
/** Position at transverse arc length s. Positive charge turns clockwise (F = q v x B, B out of the page). */
function at(t: Trk, s: number) {
  const R = Rof(t);
  const a = s / R;
  const cx = t.x0 + Math.sin(t.phi) * t.q * R; // centre = P0 + q R (sin phi, -cos phi)
  const cy = t.y0 - Math.cos(t.phi) * t.q * R;
  const ang = Math.atan2(t.y0 - cy, t.x0 - cx) - t.q * a;
  return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
}
/** First arc length at which |P| reaches radius rho (null if the track curls up before). */
function sAtRadius(t: Trk, rho: number): number | null {
  const R = Rof(t);
  const sMax = Math.PI * R;
  const ds = 0.02;
  let prev = 0;
  for (let s = ds; s <= sMax; s += ds) {
    const p = at(t, s);
    if (Math.hypot(p.x, p.y) >= rho) {
      let lo = prev;
      let hi = s;
      for (let i = 0; i < 24; i++) {
        const m = (lo + hi) / 2;
        const q = at(t, m);
        if (Math.hypot(q.x, q.y) >= rho) hi = m;
        else lo = m;
      }
      return (lo + hi) / 2;
    }
    prev = s;
  }
  return null;
}
const sEnd = (t: Trk) => sAtRadius(t, R_TOF) ?? Math.PI * Rof(t) * 0.9;

const deg = Math.PI / 180;
const A: Trk = { x0: 0, y0: 0, phi: 38 * deg, q: 1, pT: 0.6 };
const STIFF: Trk = { x0: 0, y0: 0, phi: -28 * deg, q: 1, pT: 1.5 };
const SOFT: Trk = { x0: 0, y0: 0, phi: 168 * deg, q: -1, pT: 0.3 };
const D: Trk = { x0: -0.05, y0: 0.13, phi: 22 * deg, q: -1, pT: 0.8 };
const PIDX = A.pT; // GeV/c of the example particle (a proton)

type Levels = Record<string, number>;
const TARGET: Record<St, Levels> = {
  birth: { zoom: 1, its: 0, tpc: 0, tof: 0, mag: 0, hits: 0, sv: 0, curv: 0, bg: 0.4, inset: 0, tofv: 0, ident: 0, trick: 0, ion: 0 },
  pixels: { zoom: 3.4, its: 1, tpc: 0, tof: 0, mag: 0, hits: 1, sv: 1, curv: 0, bg: 0, inset: 0, tofv: 0, ident: 0, trick: 0, ion: 0 },
  curvature: { zoom: 1, its: 0, tpc: 0, tof: 0, mag: 1, hits: 0, sv: 0, curv: 1, bg: 0.1, inset: 0, tofv: 0, ident: 0, trick: 0, ion: 0 },
  'tpc-drift': { zoom: 1, its: 0, tpc: 1, tof: 0, mag: 0, hits: 0, sv: 0, curv: 0, bg: 0.1, inset: 1, tofv: 0, ident: 0, trick: 0, ion: 1 },
  tof: { zoom: 1, its: 0, tpc: 0, tof: 1, mag: 0, hits: 0, sv: 0, curv: 0, bg: 0.1, inset: 0, tofv: 1, ident: 0, trick: 0, ion: 0 },
  identity: { zoom: 1, its: 0, tpc: 0, tof: 0, mag: 0, hits: 0, sv: 0, curv: 0, bg: 0.1, inset: 0, tofv: 0, ident: 1, trick: 0, ion: 0 },
  'pid-trick': { zoom: 1, its: 0, tpc: 0, tof: 0, mag: 0, hits: 0, sv: 0, curv: 0, bg: 0.1, inset: 0, tofv: 0, ident: 0, trick: 1, ion: 0 },
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number, d = 1) => ctx.formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d });
    const rnd = mulberry32(5);

    // faint background tracks
    const bgTracks: Trk[] = Array.from({ length: 11 }, () => ({
      x0: 0,
      y0: 0,
      phi: rnd() * Math.PI * 2,
      q: (rnd() < 0.5 ? 1 : -1) as 1 | -1,
      pT: Math.min(2.5, 0.32 + -0.55 * Math.log(1 - rnd())),
    }));
    // ionization clusters of track A inside the TPC: arc length, charge (heavy-tailed)
    const sIn = sAtRadius(A, R_TPC0)!;
    const sOut = sAtRadius(A, R_TPC1)!;
    const NCL = 18;
    const cl = Array.from({ length: NCL }, (_, i) => ({ s: sIn + ((sOut - sIn) * (i + 0.5)) / NCL, q: 0.5 + 0.5 * -Math.log(1 - rnd() * 0.92) }));
    const COT = 0.55; // z = s cot(theta), schematic polar angle
    const lenA = sEnd(A);
    // time of flight of the example proton over the arc
    const betaP = betaOf(PIDX, M.p);
    const dtP = lenA / (betaP * C); // ns

    const lv: Levels = { ...TARGET.birth, head: 0 };
    let tgt: Levels = { ...TARGET.birth };
    let state: St = 'birth';

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      const dt = s.dt;
      for (const k of Object.keys(tgt)) lv[k] = approach(lv[k], tgt[k], dt, 0.45);
      lv.head = approach(lv.head, 1, dt, 0.9);

      const wide = w > h * 1.05;
      const narrow = w < 560;
      const S = wide ? Math.min(h - 8, w * 0.6) : Math.min(w - 8, h * 0.62);
      const mx = 4;
      const my = 4;
      const cx = mx + S / 2;
      const cy = my + S / 2;
      const ks = ((S / 2 - 8) / R_VIEW) * lv.zoom;
      const P = (x: number, y: number): [number, number] => [cx + x * ks, cy - y * ks];
      const panel = wide ? { x: mx + S + 18, y: 12, w: w - (mx + S + 18) - 10, h: h - 24 } : { x: 10, y: S + 14, w: w - 20, h: Math.max(60, h - S - 20) };

      // ---------- main end view ----------
      g.save();
      g.beginPath();
      g.rect(mx, my, S, S);
      g.clip();

      const R = (r: number) => r * ks;
      ring(g, cx, cy, R(R_PIPE), th.fg, 1, 0.45);
      R_ITS.forEach((r) => {
        ring(g, cx, cy, R(r), th.fg, 1, 0.3 * (1 - lv.its));
        ring(g, cx, cy, R(r), th.accent2, 1.6, lv.its);
      });
      // TPC annulus
      g.save();
      g.globalAlpha = 0.05 + 0.1 * lv.tpc;
      g.fillStyle = th.accent2;
      g.beginPath();
      g.arc(cx, cy, R(R_TPC1), 0, Math.PI * 2);
      g.arc(cx, cy, R(R_TPC0), 0, Math.PI * 2, true);
      g.fill();
      g.restore();
      ring(g, cx, cy, R(R_TPC0), th.fg, 1, 0.3);
      ring(g, cx, cy, R(R_TPC1), th.fg, 1, 0.3 * (1 - lv.tpc));
      ring(g, cx, cy, R(R_TPC1), th.accent2, 1.5, lv.tpc);
      // TOF barrel (segmented)
      ring(g, cx, cy, R(R_TOF), th.fg, 1.4, 0.35 * (1 - lv.tof), [14 * lv.zoom, 3]);
      ring(g, cx, cy, R(R_TOF), th.accent2, 2, lv.tof, [14 * lv.zoom, 3]);
      // solenoid
      ring(g, cx, cy, R(R_MAG), th.fg, 1, 0.28 + 0.5 * lv.mag);
      ring(g, cx, cy, R(R_MAG + 0.1), th.fg, 1, 0.28 + 0.5 * lv.mag);
      if (lv.mag > 0.02)
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2 + 0.2;
          fieldSymbol(g, cx + R(3.0) * Math.cos(a), cy - R(3.0) * Math.sin(a), true, th.fg, 0.5 * lv.mag, 4);
        }

      // tracks
      const drawTrack = (t: Trk, frac: number, color: string, w2: number, alpha: number) => {
        if (alpha <= 0.01 || frac <= 0) return;
        const send = sEnd(t) * frac;
        g.save();
        g.strokeStyle = color;
        g.lineWidth = w2;
        g.globalAlpha = clamp(alpha);
        g.beginPath();
        const n = 90;
        for (let k = 0; k <= n; k++) {
          const q = at(t, (send * k) / n);
          const [x, y] = P(q.x, q.y);
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.restore();
      };
      bgTracks.forEach((t) => drawTrack(t, lv.head, th.fg, 1, 0.45 * lv.bg));
      drawTrack(STIFF, lv.head, th.fg, 1.2, 0.9 * lv.curv);
      drawTrack(SOFT, lv.head, th.accent2, 1.2, 0.9 * lv.curv);
      const dim = state === 'identity' || state === 'pid-trick' ? 0.7 : 1;
      drawTrack(A, lv.head, th.accent, 1.6, dim);
      if (lv.sv > 0.02) drawTrack(D, 1, th.accent2, 1.4, lv.sv);
      const [vx, vy] = P(0, 0);
      dot(g, vx, vy, 2.5 * Math.max(1, lv.zoom * 0.6), th.fg, 0.9);

      // pixels: hits, extrapolation back, impact parameter
      if (lv.hits > 0.02) {
        const hitsA = R_ITS.map((r) => at(A, sAtRadius(A, r)!));
        hitsA.forEach((q) => {
          const [x, y] = P(q.x, q.y);
          dot(g, x, y, 3, th.accent, lv.hits);
        });
        const hitsD = R_ITS.map((r) => at(D, sAtRadius(D, r)!));
        hitsD.forEach((q) => {
          const [x, y] = P(q.x, q.y);
          dot(g, x, y, 3, th.accent2, lv.hits);
        });
        const ext = (a: { x: number; y: number }, b: { x: number; y: number }, color: string) => {
          const n = Math.hypot(b.x - a.x, b.y - a.y);
          const dx = (b.x - a.x) / n;
          const dy = (b.y - a.y) / n;
          const [x0, y0] = P(a.x - dx * 0.55, a.y - dy * 0.55);
          const [x1, y1] = P(a.x, a.y);
          line(g, x0, y0, x1, y1, color, 1, 0.75 * lv.hits, [3, 3]);
        };
        ext(hitsA[0], hitsA[1], th.accent);
        ext(hitsD[0], hitsD[1], th.accent2);
        // impact parameter d: distance of the back-extrapolated displaced track from the primary vertex
        const a = hitsD[0];
        const b = hitsD[1];
        const n = Math.hypot(b.x - a.x, b.y - a.y);
        const ux = (b.x - a.x) / n;
        const uy = (b.y - a.y) / n;
        const tproj = -(a.x * ux + a.y * uy);
        const [f0x, f0y] = P(a.x + ux * tproj, a.y + uy * tproj);
        line(g, vx, vy, f0x, f0y, th.fg, 1, 0.8 * lv.sv);
        txt(g, 'd', (vx + f0x) / 2 + 8, (vy + f0y) / 2 + 2, { mono: true, color: th.fg, alpha: lv.sv });
        const [sx, sy] = P(D.x0, D.y0);
        ring(g, sx, sy, 5, th.accent2, 1.2, lv.sv);
        if (!narrow) txt(g, L('secondary'), sx - 12, sy - 24, { color: th.accent2, alpha: lv.sv, align: 'right' });
        if (!narrow) txt(g, L('primary'), vx + 12, vy + 30, { color: th.fg, alpha: 0.8 * lv.sv });
      }

      // curvature: fitted circle of A, radius line, labels of pT
      if (lv.curv > 0.02) {
        const Ra = Rof(A);
        const ccx = A.x0 + Math.sin(A.phi) * A.q * Ra;
        const ccy = A.y0 - Math.cos(A.phi) * A.q * Ra;
        const [px, py] = P(ccx, ccy);
        ring(g, px, py, Ra * ks, th.accent, 1, 0.35 * lv.curv, [4, 4]);
        const qm = at(A, sAtRadius(A, 2.6)!);
        const [qx, qy] = P(qm.x, qm.y);
        line(g, px, py, qx, qy, th.accent, 1, 0.8 * lv.curv);
        dot(g, px, py, 2, th.accent, lv.curv);
        txt(g, 'R', (px + qx) / 2 + 7, (py + qy) / 2 + 2, { mono: true, color: th.accent, alpha: lv.curv });
        const tag = (t: Trk, color: string) => {
          const q = at(t, sEnd(t) * lv.head);
          const [x, y] = P(q.x, q.y);
          txt(g, `${t.q > 0 ? '+' : '−'} ${f1(t.pT, 1)}`, x + (x > cx ? 6 : -6), y + (y > cy ? 10 : -10), { mono: true, color, align: x > cx ? 'left' : 'right', alpha: lv.curv });
        };
        tag(A, th.accent);
        tag(STIFF, th.fg);
        tag(SOFT, th.accent2);
      }

      // TPC ionization clusters in the end view
      if (lv.ion > 0.02)
        cl.forEach((k) => {
          const q = at(A, k.s);
          const [x, y] = P(q.x, q.y);
          dot(g, x, y, 1 + 1.1 * Math.sqrt(k.q), th.fg, 0.85 * lv.ion);
        });

      // tof: hit and path length
      if (lv.tofv > 0.02) {
        const q = at(A, lenA);
        const [x, y] = P(q.x, q.y);
        dot(g, x, y, 4.5, th.accent, lv.tofv);
        ring(g, x, y, 9, th.accent, 1, lv.tofv * 0.7);
        const qm = at(A, lenA * 0.5);
        const [mx2, my2] = P(qm.x, qm.y);
        txt(g, `L = ${f1(lenA, 1)} m`, mx2 + 12, my2 + 14, { mono: true, color: th.accent, alpha: lv.tofv });
      }
      g.restore();

      // legend (top-left of the end view)
      const lg = [
        { c: th.accent2, a: lv.its, key: 'its' },
        { c: th.accent2, a: lv.tpc, key: 'tpc' },
        { c: th.accent2, a: lv.tof, key: 'tof' },
        { c: th.fg, a: lv.mag, key: 'solenoid' },
      ];
      lg.forEach((e, i) => {
        if (narrow && e.a < 0.5) return;
        const yy = my + 12 + (narrow ? 0 : i * 15);
        line(g, mx + 8, yy, mx + 24, yy, e.c, 1.5, 0.45 + 0.55 * e.a);
        txt(g, L(e.key), mx + 30, yy, { color: th.fg, alpha: 0.5 + 0.45 * e.a });
      });
      fieldSymbol(g, mx + S - 18, my + S - 16, true, th.fg, 0.85, 5);
      txt(g, `B = ${f1(B, 1)} T`, mx + S - 30, my + S - 16, { mono: true, color: th.fg, align: 'right', alpha: 0.85 });
      if (!narrow && lv.zoom > 1.5) txt(g, L('zoom'), mx + 8, my + S - 14, { color: th.fg, alpha: 0.7 * smooth(1.5, 3, lv.zoom) });

      // ---------- side panel ----------
      if (lv.inset > 0.02) {
        const pw = panel.w;
        const ph = Math.min(panel.h, pw * 0.7);
        const px0 = panel.x;
        const py0 = panel.y + (panel.h - ph) / 2;
        const ksz = Math.min(pw / 6.0, ph / 3.2);
        const zx = (z: number) => px0 + pw / 2 + z * ksz;
        const ry = (r: number) => py0 + ph - 16 - r * ksz;
        const a = lv.inset;
        g.save();
        g.globalAlpha = 0.07 * a;
        g.fillStyle = th.accent2;
        g.fillRect(zx(-L_TPC), ry(R_TPC1), 2 * L_TPC * ksz, (R_TPC1 - R_TPC0) * ksz);
        g.restore();
        line(g, zx(-L_TPC), ry(R_TPC1), zx(L_TPC), ry(R_TPC1), th.fg, 1, 0.35 * a);
        line(g, zx(-L_TPC), ry(R_TPC0), zx(L_TPC), ry(R_TPC0), th.fg, 1, 0.35 * a);
        line(g, zx(0), ry(R_TPC0), zx(0), ry(R_TPC1), th.fg, 1, 0.45 * a, [3, 3]);
        line(g, zx(L_TPC), ry(R_TPC0), zx(L_TPC), ry(R_TPC1), th.accent2, 2.2, a);
        line(g, zx(-L_TPC), ry(R_TPC0), zx(-L_TPC), ry(R_TPC1), th.accent2, 2.2, 0.6 * a);
        if (!narrow) txt(g, L('endplate'), zx(L_TPC) + 6, ry(R_TPC1) - 12, { color: th.accent2, align: 'right', alpha: a });
        if (!narrow) txt(g, L('membrane'), zx(0) - 4, ry(R_TPC1) - 12, { color: th.fg, align: 'right', alpha: 0.6 * a });
        if (!narrow) txt(g, L('sideview'), px0, py0 + 2, { color: th.fg, alpha: 0.75 * a });
        line(g, zx(-L_TPC), ry(0), zx(L_TPC), ry(0), th.fg, 1, 0.3 * a, [2, 4]);
        if (!narrow) txt(g, L('beam'), zx(-L_TPC), ry(0) - 8, { color: th.fg, alpha: 0.5 * a });
        // the particle path in the (z, r) plane
        g.save();
        g.strokeStyle = th.fg;
        g.globalAlpha = 0.3 * a;
        g.lineWidth = 1;
        g.beginPath();
        for (let k = 0; k <= 40; k++) {
          const sv = (sOut * 1.08 * k) / 40;
          const q = at(A, sv);
          const [x, y] = [zx(sv * COT), ry(Math.hypot(q.x, q.y))];
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.restore();
        const tcyc = ctx.reducedMotion ? 99 : s.t % 8;
        const T_FAR = 4.0; // display seconds for the farthest cluster
        const zIn = sIn * COT;
        const vdisp = (L_TPC - zIn) / T_FAR;
        const physPerDisp = (L_TPC - zIn) / V_DRIFT / T_FAR; // us per display second
        const tdr = ctx.reducedMotion ? T_FAR * 0.55 : Math.max(0, tcyc - 1.0);
        const arr: { r: number; t: number }[] = [];
        cl.forEach((k) => {
          const q = at(A, k.s);
          const r = Math.hypot(q.x, q.y);
          const z0 = k.s * COT;
          const arrive = (L_TPC - z0) / vdisp;
          const z = tdr >= arrive ? L_TPC : z0 + vdisp * tdr;
          const rad = 1 + 1.4 * Math.sqrt(k.q);
          if (tdr > 0 && tdr < arrive) ring(g, zx(z0), ry(r), rad + 1, th.fg, 1, 0.3 * a);
          dot(g, zx(z), ry(r), rad, th.accent, a);
          if (tdr >= arrive) arr.push({ r, t: arrive * physPerDisp });
        });
        if (arr.length) {
          const first = arr[arr.length - 1]; // outermost, nearest the plate: earliest
          const last = arr[0];
          txt(g, `${f1(first.t, 0)} μs`, zx(L_TPC) - 8, ry(first.r) + 10, { mono: true, color: th.fg, align: 'right', alpha: 0.85 * a });
          if (arr.length > 1) txt(g, `${f1(last.t, 0)} μs`, zx(L_TPC) - 8, ry(last.r) + 10, { mono: true, color: th.fg, align: 'right', alpha: 0.85 * a });
        }
        const clock = Math.min(tdr * physPerDisp, (L_TPC - zIn) / V_DRIFT);
        txt(g, `t = ${f1(clock, 0)} μs`, px0 + pw, py0 + 2, { mono: true, color: th.fg, align: 'right', alpha: 0.8 * a });
        arrow(g, zx(0.2), ry(R_TPC0) + 16, zx(1.2), ry(R_TPC0) + 16, th.accent, 1.2, 0.8 * a, 6);
        txt(g, L('drift'), zx(1.3), ry(R_TPC0) + 16, { color: th.accent, alpha: a });
        if (!narrow) txt(g, 'z = L − v_d · t', px0, ry(0) + 14, { mono: true, color: th.fg, alpha: 0.85 * a });
        if (!narrow) txt(g, L('charge'), px0 + pw, ry(0) + 14, { color: th.fg, align: 'right', alpha: 0.85 * a });
      }

      // TOF stopwatch
      if (lv.tofv > 0.02) {
        const a = lv.tofv;
        const x0 = panel.x + 4;
        const x1 = panel.x + panel.w - 8;
        const y0 = panel.y + panel.h * 0.42;
        const tmax = 40;
        const TX = (t: number) => x0 + ((x1 - x0) * t) / tmax;
        line(g, x0, y0, x1, y0, th.fg, 1, 0.5 * a);
        for (let t = 0; t <= tmax; t += 10) {
          line(g, TX(t), y0, TX(t), y0 + 4, th.fg, 1, 0.5 * a);
          txt(g, String(t), TX(t), y0 + 15, { mono: true, color: th.fg, align: 'center', alpha: 0.6 * a });
        }
        txt(g, L('ns'), x1, y0 + 31, { color: th.fg, align: 'right', alpha: 0.8 * a });
        line(g, TX(0), y0 - 20, TX(0), y0, th.fg, 1.5, a);
        txt(g, L('collision'), TX(0), y0 - 30, { color: th.fg, alpha: a });
        line(g, TX(dtP), y0 - 20, TX(dtP), y0, th.accent, 2, a);
        arrow(g, TX(0) + 2, y0 - 10, TX(dtP) - 2, y0 - 10, th.accent, 1.2, a, 6);
        txt(g, L('tofhit'), TX(dtP), y0 - 30, { color: th.accent, align: 'center', alpha: a });
        txt(g, `Δt = ${f1(dtP, 1)} ns`, TX(dtP / 2), y0 - 44, { mono: true, color: th.accent, align: 'center', alpha: a });
        txt(g, 'β = L / (c · Δt)', panel.x + 4, y0 + 56, { mono: true, color: th.fg, alpha: 0.9 * a });
        if (!narrow) txt(g, `= ${f1(lenA, 1)} m / (0.30 m/ns × ${f1(dtP, 1)} ns) = ${f1(lenA / (C * dtP), 2)}`, panel.x + 4, y0 + 74, { mono: true, color: th.accent, alpha: a });
      }

      // identity (beta vs p) and trick (dE/dx vs p)
      const showPlot = (mode: 'beta' | 'dedx', a: number) => {
        if (a < 0.5) return;
        const pad = { x: panel.x + 42, y: panel.y + (narrow ? 20 : 38), w: panel.w - 62, h: Math.min(panel.h - 70, panel.w * 0.8) };
        const xa = { min: 0.2, max: 3, label: L('pax'), log: true, ticks: [0.2, 0.5, 1, 2].map((v) => ({ v, label: String(v) })) };
        const ya =
          mode === 'beta'
            ? { min: 0.2, max: 1.02, label: L('beta'), ticks: [0.2, 0.4, 0.6, 0.8, 1].map((v) => ({ v, label: String(v) })) }
            : { min: 0.5, max: 12, log: true, label: L('dedx'), ticks: [{ v: 1, label: '1' }, { v: 10, label: '10' }] };
        const pl = plot(g, ctx, pad, xa, ya);
        pl.axes();
        const f = (m: number) => (mode === 'beta' ? (p: number) => betaOf(p, m) : (p: number) => dEdx(p, m));
        const sp: [string, number][] = [
          ['π', M.pi],
          ['K', M.K],
          ['p', M.p],
        ];
        sp.forEach(([n, m]) => {
          const hl = n === 'p';
          pl.curve(f(m), { color: hl ? th.accent : th.fg, alpha: hl ? 1 : 0.6, width: hl ? 1.6 : 1.1 });
          if (mode === 'beta') pl.text(0.235, f(m)(0.235) + 0.05, n, { color: hl ? th.accent : th.fg, align: 'left' });
        });
        if (mode === 'beta') {
          pl.vline(PIDX, { color: th.accent, dash: [3, 3], alpha: 0.6 });
          pl.hline(betaP, { color: th.accent, dash: [3, 3], alpha: 0.6 });
          pl.dot(PIDX, betaP, 4.5, th.accent);
          if (!narrow) pl.text(PIDX * 1.1, betaP - 0.06, L('thistrack'), { color: th.accent });
        } else {
          pl.vline(PIDX, { color: th.fg, dash: [3, 3], alpha: 0.6 });
          sp.forEach(([n, m]) => {
            const hl = n === 'p';
            pl.dot(PIDX, dEdx(PIDX, m), hl ? 4.5 : 3.5, hl ? th.accent : th.fg);
            pl.text(PIDX * 1.12, dEdx(PIDX, m), n, { color: hl ? th.accent : th.fg });
          });
          if (!narrow) pl.text(PIDX * 1.12, 0.7, `p = ${f1(PIDX, 1)} GeV/c`, { mono: true, color: th.fg });
        }
        if (!narrow) txt(g, L(mode === 'beta' ? 'identity' : 'trick'), panel.x + 4, panel.y + 6, { color: th.accent, alpha: a });
      };
      showPlot('beta', lv.ident);
      showPlot('dedx', lv.trick);
    });
    c.animate = true;

    return {
      setState(st: string, o: SetStateOptions) {
        const s2 = (STATES as readonly string[]).includes(st) ? (st as St) : 'birth';
        state = s2;
        tgt = { ...TARGET[s2] };
        if (s2 === 'birth' && !o.immediate && !ctx.reducedMotion) lv.head = 0;
        if (o.immediate || ctx.reducedMotion) {
          Object.assign(lv, TARGET[s2]);
          lv.head = 1;
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

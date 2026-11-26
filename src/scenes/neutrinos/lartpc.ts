/**
 * nu.lartpc — P9 walkthrough of a liquid-argon TPC (DUNE-like). Blue variant of the shared.tpc drawing.
 * One simulated event in 3D (d = distance from the anode wire plane, y vertical, z along the beam), all metres:
 *   muon 2.4 m (nearly minimum ionizing), pion 0.9 m, proton 0.35 m. Charge per 4 cm step q(rho) rises towards the end of the
 *   track (residual range rho: q ~ rho^-0.43, the Bragg shape) and is larger for the proton; dot area = charge.
 *   drift  : x_screen = x_plane - v_d t with v_d = 1.6 m/ms (500 V/cm); 3.5 m takes 2.2 ms; clock in ms.
 *   wires  : each plane records (wire coordinate, arrival time): p = -y sin(a) + z cos(a), a = +60 deg, -60 deg, 0 (collection).
 *   event  : the same 3D points, rotated orthographically; colour = q (inferno) = dE/dx.
 *   purity : electron lifetime tau ~ 0.3 ms / ppb O2-equivalent; surviving charge exp(-t/tau), t = d / v_d. Lanes: first-impurity
 *            distance ~ exponential with mean v_d tau (tau = 3 ms), so the survivors at 3.5 m agree with the curve (0.48).
 *   argon  : Fermilab (41.8 N, 88.3 W) and Sanford Lab (44.35 N, 103.75 W) in equirectangular km: 1,290 km apart.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, clamp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { NU } from '../../data/neutrinos';
import { createStage, arrow, dim, dot, interpolateInferno, line, poly, ring, txt } from './_n2-common';

const STATES = ['argon', 'ionize', 'drift', 'wires', 'event', 'purity'] as const;
const VD = 1.6; // m/ms
const DRIFT = 3.5; // m
const T_MAX = DRIFT / VD; // ms
const D0 = 1.4;
const STEP = 0.05;

type P = { map: number; vol: number; wires: number; ev: number; pur: number };
const TARGETS: Record<string, P> = {
  argon: { map: 1, vol: 0, wires: 0, ev: 0, pur: 0 },
  ionize: { map: 0, vol: 1, wires: 0, ev: 0, pur: 0 },
  drift: { map: 0, vol: 1, wires: 0, ev: 0, pur: 0 },
  wires: { map: 0, vol: 0, wires: 1, ev: 0, pur: 0 },
  event: { map: 0, vol: 0, wires: 0, ev: 1, pur: 0 },
  purity: { map: 0, vol: 0, wires: 0, ev: 0, pur: 1 },
};

interface Hit {
  d: number;
  y: number;
  z: number;
  q: number;
  k: 0 | 1 | 2;
  s: number;
}
interface Trk {
  k: 0 | 1 | 2;
  dir: [number, number, number];
  len: number;
  name: string;
}
const unit = (v: [number, number, number]): [number, number, number] => {
  const n = Math.hypot(...v);
  return [v[0] / n, v[1] / n, v[2] / n];
};
const TRKS: Trk[] = [
  { k: 0, dir: unit([0.55, 0.55, 0.63]), len: 2.4, name: 'μ' },
  { k: 1, dir: unit([-0.5, 0.75, -0.4]), len: 0.9, name: 'π' },
  { k: 2, dir: unit([-0.7, -0.5, 0.5]), len: 0.35, name: 'p' },
];
const qOf = (k: 0 | 1 | 2, rho: number) => {
  if (k === 0) return 1 + 0.35 * Math.pow(0.5 / (rho + 0.05), 0.43);
  if (k === 1) return 1.15 * (1 + 0.6 * Math.pow(0.3 / (rho + 0.03), 0.43));
  return 3 * (1 + 0.8 * Math.pow(0.05 / (rho + 0.01), 0.43));
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const rnd = mulberry32(21);

    const hits: Hit[] = [];
    TRKS.forEach((t) => {
      const n = Math.floor(t.len / STEP);
      for (let i = 0; i <= n; i++) {
        const s = i * STEP;
        hits.push({ d: D0 + t.dir[0] * s, y: t.dir[1] * s, z: t.dir[2] * s, q: qOf(t.k, t.len - s), k: t.k, s });
      }
    });
    const qMax = Math.max(...hits.map((h) => h.q));
    const rad = (q: number) => 0.7 + 0.6 * Math.sqrt(q);
    const lanes = Array.from({ length: 12 }, (_, i) => -(VD * 3) * Math.log(1 - (i + 0.5) / 12)).sort(() => rnd() - 0.5);

    // fermilab and sanford lab in km (equirectangular around 43 N)
    const km = (lonW: number, lat: number) => [(-lonW) * 111.32 * Math.cos((43 * Math.PI) / 180), lat * 110.57] as const;
    const fnal = km(88.3, 41.83);
    const surf = km(103.75, 44.35);
    const dMap = Math.hypot(fnal[0] - surf[0], fnal[1] - surf[1]);

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { ionize: 1.5, drift: 4.6, wires: 3.2, event: 2.2, purity: 5.5 },
      draw(g, s, lv, env) {
        const { w, h } = s;
        const narrow = w < 520;
        const fin = env.ts >= 1e3;
        const ts = env.ts;

        // ------------- argon: map + cutaway -------------
        if (lv.map > 0.01) {
          const a = lv.map;
          const mw = Math.min(w * 0.6, 520);
          const ks = (mw - 40) / Math.abs(fnal[0] - surf[0]);
          const mx = (w - mw) / 2 + 20;
          const my = 52;
          const P = (p: readonly [number, number]): [number, number] => [mx + (p[0] - surf[0]) * ks, my + (surf[1] - p[1]) * ks + 8];
          const [ax, ay] = P(surf);
          const [bx, by] = P(fnal);
          line(g, bx, by, ax, ay, th.fg, 1, 0.7 * a, [5, 4]);
          arrow(g, bx - (bx - ax) * 0.4, by - (by - ay) * 0.4, ax + (bx - ax) * 0.45, ay + (by - ay) * 0.45, th.fg, 1, 0.7 * a, 6);
          dot(g, ax, ay, 4, th.accent, a);
          dot(g, bx, by, 4, th.fg, a);
          txt(g, L('sanford'), ax - 8, ay - 14, { color: th.accent, alpha: a });
          txt(g, L('fermilab'), bx + 8, by + 14, { color: th.fg, align: 'right', alpha: a });
          if (!narrow) txt(g, L('beamNote'), (ax + bx) / 2, (ay + by) / 2 - 22, { color: th.fg, align: 'center', alpha: 0.85 * a });
          g.save();
          g.globalAlpha = a;
          dim(g, ax, by + 40, bx, by + 40, `${f0(NU.DUNE_BASELINE_KM.value as number)} km`, th.fg, 0.8 * a);
          g.restore();
          void dMap;
          // cutaway of the tank
          const ty = Math.max(my + (by - ay) + 90, h * 0.55);
          const tw0 = Math.min(w * 0.55, 460);
          const tx = (w - tw0) / 2 + 30;
          const th0 = Math.max(60, h - ty - 40);
          line(g, 14, ty - 14, w - 14, ty - 14, th.fg, 1, 0.5 * a);
          txt(g, L('surface'), 16, ty - 26, { color: th.fg, alpha: 0.8 * a });
          g.save();
          g.globalAlpha = 0.06 * a;
          g.fillStyle = th.fg;
          g.fillRect(14, ty - 14, w - 28, h - ty);
          g.globalAlpha = 0.16 * a;
          g.fillStyle = th.accent2;
          g.fillRect(tx, ty + th0 * 0.25, tw0, th0 * 0.75);
          g.restore();
          [[tx, ty + th0 * 0.25, tx + tw0, ty + th0 * 0.25], [tx, ty + th0, tx + tw0, ty + th0], [tx, ty + th0 * 0.25, tx, ty + th0], [tx + tw0, ty + th0 * 0.25, tx + tw0, ty + th0]].forEach(([x0, y0, x1, y1]) => line(g, x0, y0, x1, y1, th.accent2, 1.2, a));
          txt(g, L('liquidArgon'), tx + tw0 / 2, ty + th0 * 0.62, { color: th.fg, align: 'center', alpha: 0.9 * a });
          dim(g, tx - 20, ty - 14, tx - 20, ty + th0 * 0.25, `${f1(NU.DUNE_DEPTH_KM.value as number)} km`, th.fg, 0.8 * a);
        }

        // ------------- drift volume (ionize, drift) -------------
        const kx = Math.min((w - 100) / DRIFT, (h - 120) / 3.5);
        const vx1 = (w + DRIFT * kx) / 2; // anode plane x
        const vx0 = vx1 - DRIFT * kx;
        const vy0 = (h - 110) / 2 + 22;
        const SX = (d: number) => vx1 - d * kx;
        const SY = (y: number) => vy0 - y * kx;
        if (lv.vol > 0.01) {
          const a = lv.vol;
          g.save();
          g.globalAlpha = 0.1 * a;
          g.fillStyle = th.accent2;
          g.fillRect(vx0, vy0 - 1.75 * kx, DRIFT * kx, 3.5 * kx);
          g.restore();
          line(g, vx0, vy0 - 1.75 * kx, vx0, vy0 + 1.75 * kx, th.fg, 1.2, 0.7 * a);
          line(g, vx1, vy0 - 1.75 * kx, vx1, vy0 + 1.75 * kx, th.accent, 2.5, a);
          line(g, vx0, vy0 - 1.75 * kx, vx1, vy0 - 1.75 * kx, th.fg, 1, 0.3 * a);
          line(g, vx0, vy0 + 1.75 * kx, vx1, vy0 + 1.75 * kx, th.fg, 1, 0.3 * a);
          txt(g, L('cathode'), vx0, vy0 - 1.75 * kx - 12, { color: th.fg, align: 'center', alpha: 0.85 * a });
          txt(g, L('anode'), vx1, vy0 - 1.75 * kx - 12, { color: th.accent, align: 'center', alpha: a });
          // field arrow
          arrow(g, vx1 - 40, vy0 + 1.75 * kx + 24, vx0 + 40, vy0 + 1.75 * kx + 24, th.fg, 1, 0.7 * a, 6);
          if (!narrow) txt(g, 'E ≈ 500 V/cm', (vx0 + vx1) / 2, vy0 + 1.75 * kx + 40, { mono: true, color: th.fg, align: 'center', alpha: 0.85 * a });
          // 1 m scale bar
          line(g, vx0 + 8, vy0 + 1.75 * kx - 12, vx0 + 8 + kx, vy0 + 1.75 * kx - 12, th.fg, 1.5, 0.8 * a);
          txt(g, '1 m', vx0 + 8, vy0 + 1.75 * kx - 24, { mono: true, color: th.fg, alpha: 0.85 * a });
          // particle tracks (thin) appear at c, then electrons
          const tr = env.state === 'ionize' ? (fin ? 1 : smooth(0, 0.7, ts)) : 1;
          const vxs = SX(D0);
          const vys = SY(0);
          TRKS.forEach((t) => {
            line(g, vxs, vys, vxs + (SX(D0 + t.dir[0] * t.len) - vxs) * tr, vys + (SY(t.dir[1] * t.len) - vys) * tr, th.accent, 1, 0.9 * a);
          });
          // drift clock: 55 % of the full drift when frozen
          const T_DISP = 4.5;
          const clk = env.state === 'drift' ? (fin ? T_MAX * 0.55 : Math.min(T_MAX, (Math.max(0, ts - 0.4) / T_DISP) * T_MAX)) : 0;
          const reveal = env.state === 'ionize' ? (fin ? 1 : smooth(0.3, 1.4, ts)) : 1;
          const maxSel = Math.floor(reveal * hits.length);
          let arrived = 0;
          hits.forEach((q, i) => {
            if (i >= maxSel) return;
            const d = Math.max(0, q.d - VD * clk);
            if (d <= 0) arrived++;
            const x = SX(d);
            const y = SY(q.y);
            dot(g, x, y, rad(q.q), th.fg, d <= 0 ? 0.55 * a : 0.9 * a);
            if (clk > 0 && d > 0) ring(g, SX(q.d), y, rad(q.q) + 1.5, th.fg, 1, 0.18 * a);
          });
          void arrived;
          if (env.state === 'drift') {
            txt(g, `t = ${f1(clk)} ms`, vx1, vy0 + 1.75 * kx + 40, { mono: true, color: th.fg, align: 'right', alpha: 0.95 * a });
            txt(g, `x = x_plane − v_d · t`, vx0, vy0 + 1.75 * kx + 40, { mono: true, color: th.fg, alpha: narrow ? 0 : 0.85 * a });
            arrow(g, vxs, vys + 1.2 * kx, vx1 - 8, vys + 1.2 * kx, th.accent, 1.2, 0.8 * a, 6);
            txt(g, narrow ? `${f1(VD)} m/ms` : `v_d = ${f1(VD)} m/ms`, (vxs + vx1) / 2, vys + 1.2 * kx + 14, { mono: true, color: th.accent, align: 'center', alpha: a });
          }
          if (env.state === 'ionize') {
            const [mex, mey] = [SX(D0 + TRKS[0].dir[0] * TRKS[0].len), SY(TRKS[0].dir[1] * TRKS[0].len)];
            txt(g, L('muon'), mex - 6, mey - 12, { color: th.accent, align: 'right', alpha: a * tr });
            const [pex, pey] = [SX(D0 + TRKS[2].dir[0] * TRKS[2].len), SY(TRKS[2].dir[1] * TRKS[2].len)];
            txt(g, L('proton'), pex + 6, pey + 12, { color: th.accent, alpha: a * tr });
            const [pix, piy] = [SX(D0 + TRKS[1].dir[0] * TRKS[1].len), SY(TRKS[1].dir[1] * TRKS[1].len)];
            txt(g, L('pion'), pix - 6, piy - 10, { color: th.accent, align: 'right', alpha: a * tr });
            if (!narrow) txt(g, L('areaNote'), vx0, vy0 + 1.75 * kx + 40, { color: th.fg, alpha: 0.85 * a });
          }
        }

        // ------------- three wire planes -------------
        if (lv.wires > 0.01) {
          const a = lv.wires;
          const row = w >= 560;
          const pw = row ? (w - 48) / 3 : w - 40;
          const ph = row ? Math.min(h - 120, pw * 1.15) : (h - 90) / 3 - 30;
          const planes = [
            { ang: 60, key: 'planeU' },
            { ang: -60, key: 'planeV' },
            { ang: 0, key: 'planeX' },
          ];
          const clk = fin ? T_MAX : Math.min(T_MAX, (ts / 3.2) * T_MAX);
          planes.forEach((pl, i) => {
            const px = row ? 12 + i * (pw + 12) : 20;
            const py = row ? 66 : 44 + i * (ph + 30);
            g.save();
            g.globalAlpha = 0.3 * a;
            g.strokeStyle = th.fg;
            g.strokeRect(px, py, pw, ph);
            g.restore();
            // wire orientation icon: three wires at this angle
            const ar = (pl.ang * Math.PI) / 180;
            for (let j = -1; j <= 1; j++) {
              const cx = px + 14 + j * 6;
              line(g, cx - Math.sin(ar) * 9, py - 22 + Math.cos(ar) * -9 + 4, cx + Math.sin(ar) * 9, py - 22 + Math.cos(ar) * 9 + 4, th.accent, 1, a);
            }
            txt(g, L(pl.key), px + 36, py - 12, { color: th.fg, alpha: 0.9 * a });
            const sa = Math.sin(ar);
            const ca = Math.cos(ar);
            hits.forEach((q) => {
              const p = -q.y * sa + q.z * ca; // wire coordinate (m)
              const t = q.d / VD; // arrival ms
              if (t > clk) return;
              dot(g, px + pw / 2 + (p / 4) * pw, py + 8 + (t / T_MAX) * (ph - 16), rad(q.q) * 0.9, th.fg, 0.9 * a);
            });
            if (row || i === 2) txt(g, L('wireAxis'), px + pw / 2, py + ph + 14, { color: th.fg, align: 'center', alpha: 0.7 * a });
          });
          txt(g, row ? L('timeAxis') : L('timeS'), row ? 14 : w - 14, 18, { color: th.fg, align: row ? 'left' : 'right', alpha: 0.7 * a });
        }

        // ------------- reconstructed 3D event -------------
        if (lv.ev > 0.01) {
          const a = lv.ev;
          const spin = fin ? 1 : smooth(0, 2, ts);
          const yaw = (-65 + 30 * spin) * (Math.PI / 180);
          const pitch = (22 * Math.PI) / 180;
          const k3 = Math.min(w * 0.36, h * 0.4);
          const cx = w * 0.5;
          const cy = h * 0.5;
          const proj = (q: Hit): [number, number] => {
            const X = -(q.d - D0) - 0.2; // drift axis, toward the cathode is +
            const Y = q.y - 0.3;
            const Z = q.z - 0.7;
            const x1 = X * Math.cos(yaw) + Z * Math.sin(yaw);
            const z1 = -X * Math.sin(yaw) + Z * Math.cos(yaw);
            const y1 = Y * Math.cos(pitch) - z1 * Math.sin(pitch);
            return [cx + x1 * k3, cy - y1 * k3];
          };
          [0, 1, 2].forEach((k) => {
            const pts = hits.filter((q) => q.k === k);
            for (let i = 1; i < pts.length; i++) {
              const [x0, y0] = proj(pts[i - 1]);
              const [x1, y1] = proj(pts[i]);
              line(g, x0, y0, x1, y1, interpolateInferno(0.3 + 0.65 * clamp((pts[i].q - 1) / (qMax - 1))), 3, a);
            }
            const e = pts[pts.length - 1];
            const [ex, ey] = proj(e);
            txt(g, TRKS[k].name, ex + 10, ey - 4, { color: th.fg, alpha: 0.95 * a, mono: true });
          });
          const [vx, vy] = proj(hits[0]);
          dot(g, vx, vy, 2.5, th.fg, a);
          // colour bar
          const bx = 16;
          const by = h - 38;
          for (let i = 0; i < 80; i++) {
            g.save();
            g.globalAlpha = a;
            g.fillStyle = interpolateInferno(0.3 + 0.65 * (i / 79));
            g.fillRect(bx + i * 1.6, by, 1.8, 8);
            g.restore();
          }
          txt(g, L('lowDedx'), bx, by + 20, { color: th.fg, alpha: 0.85 * a });
          txt(g, L('highDedx'), bx + 128, by + 20, { color: th.fg, align: 'right', alpha: 0.85 * a });
          txt(g, L('dedx'), bx, by - 10, { color: th.fg, alpha: 0.85 * a });
          line(g, w - 16 - k3 * 0.5, h - 30, w - 16, h - 30, th.fg, 1.5, 0.8 * a);
          txt(g, '0.5 m', w - 16, h - 44, { mono: true, color: th.fg, align: 'right', alpha: 0.85 * a });
        }

        // ------------- purity -------------
        if (lv.pur > 0.01) {
          const a = lv.pur;
          const xa0 = 56;
          const xa1 = w - 30;
          const XM = (d: number) => xa0 + ((xa1 - xa0) * d) / 4;
          const ly0 = narrow ? 34 : 40;
          const lh = narrow ? 56 : Math.min(120, h * 0.26);
          const clk = fin ? T_MAX : Math.min(T_MAX, (ts / 4.5) * T_MAX);
          line(g, XM(0), ly0 - 8, XM(0), ly0 + lh + 8, th.fg, 1.2, 0.7 * a);
          line(g, XM(DRIFT), ly0 - 8, XM(DRIFT), ly0 + lh + 8, th.accent, 2.5, a);
          txt(g, L('cathode'), XM(0), ly0 - 18, { color: th.fg, align: 'center', alpha: 0.8 * a });
          txt(g, L('anode'), XM(DRIFT), ly0 - 18, { color: th.accent, align: 'center', alpha: a });
          let ok = 0;
          lanes.forEach((dl, i) => {
            const y = ly0 + (lh * (i + 0.5)) / lanes.length;
            const x = Math.min(VD * clk, dl, DRIFT);
            line(g, XM(0), y, XM(DRIFT), y, th.fg, 1, 0.12 * a);
            if (dl < DRIFT) {
              if (VD * clk >= dl) {
                ring(g, XM(dl), y, 3.6, th.fg, 1, 0.9 * a);
                if (i === lanes.findIndex((v) => v < DRIFT)) txt(g, 'O₂', XM(dl), y - 9, { mono: true, color: th.fg, align: 'center', alpha: 0.9 * a });
              } else dot(g, XM(x), y, 2.4, th.fg, a);
            } else {
              dot(g, XM(x), y, 2.4, th.accent, a);
              if (VD * clk >= DRIFT) ok++;
            }
          });
          txt(g, `${ok} / ${lanes.length}`, XM(DRIFT) + 4, ly0 + lh + 22, { mono: true, color: th.accent, align: 'right', alpha: a * (VD * clk >= DRIFT ? 1 : 0) });
          txt(g, `t = ${f1(clk)} ms`, XM(0), ly0 + lh + 22, { mono: true, color: th.fg, alpha: 0.9 * a });
          const R = { x: xa0, y: ly0 + lh + 60, w: xa1 - xa0, h: Math.max(60, h - (ly0 + lh + 60) - 58) };
          const p = plot(g, ctx, R, { min: 0, max: 4, label: L('driftAxis'), ticks: [0, 1, 2, 3, 4].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 1, label: L('survive'), ticks: [0, 0.5, 1].map((v) => ({ v, label: f1(v) })) });
          g.save();
          g.globalAlpha = a;
          p.axes();
          p.curve((x) => Math.exp(-x / VD / 3), { color: th.fg, width: 1.5 });
          p.curve((x) => Math.exp(-x / VD / 10), { color: th.accent, width: 1.8 });
          p.vline(DRIFT, { color: th.fg, dash: [3, 3] });
          if (narrow) {
            p.text(2.4, 0.3, 'τ = 3 ms', { align: 'left' });
            p.text(2.4, 0.66, 'τ = 10 ms', { align: 'left', color: th.accent });
          } else {
            p.text(0.12, 0.26, `${L('dirty')}  τ = 3 ms`, { align: 'left' });
            p.text(0.12, 0.12, `${L('clean')}  τ = 10 ms`, { align: 'left', color: th.accent });
          }
          g.restore();
          void poly;
        }
      },
    });
  },
};
export default mod;

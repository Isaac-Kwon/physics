/**
 * nu.water-cherenkov — P9 walkthrough of Super-Kamiokande (principle drawing, real geometry).
 * Tank: cylinder R = 16.9 m, half height 18.1 m (inner detector). A muon neutrino makes a muon at V = (4.5, 0, 0) m heading
 * along +x. Cherenkov angle cos(theta) = 1/(n beta), n = 1.33 (NU.WATER_INDEX), beta = 1 -> 41.2 degrees.
 *   side view  : section y = 0. Rays leave six emission points along the 3 m track at +-theta; they hit the wall at the true
 *                intersection with the rectangle; arrival time = s/c + n d/c.
 *   unrolled   : the standard display: barrel (u = R phi, v = z) with the two end caps above and below. Every PMT (1 dot ~ 5 PMTs,
 *                pitch 1.56 m) is lit if, seen from SOME point of the track, it sits at exactly theta from the track direction
 *                (angle range over the track +- 2 degrees). Same geometry as the side view (phi = 0 is the +x wall).
 *   electron   : 6 short sub-tracks fanned by ~20 degrees (shower) -> each makes its own ring, the sum is fuzzy.
 * Ring width sigma shown is the measured spread of the lit PMTs' angles about theta, from the same data.
 * Simplifications: no scattering/absorption, no photon statistics, PMT acceptance uniform, dot = ~5 PMTs.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, gaussian, clamp, smooth } from '../shared/canvas2d';
import { NU } from '../../data/neutrinos';
import { createStage, arrow, dot, line, ring, txt, ray, poly } from './_n2-common';

const STATES = ['tank', 'interaction', 'cone', 'ring', 'reconstruct', 'ring-sharpness'] as const;
const R = 16.9;
const H = 18.1;
const N_W = NU.WATER_INDEX.value as number;
const THETA = Math.acos(1 / N_W); // beta = 1
const THD = (THETA * 180) / Math.PI;
const C = 0.2998; // m/ns
const VX = 4.5;
const LTRK = 3;
const PITCH = 1.56;
const GAP = 1.5;

type V3 = [number, number, number];
interface Seg {
  o: V3;
  d: V3;
  len: number;
  w: number;
}
interface Pmt {
  p: V3;
  u: number;
  v: number;
  barrel: boolean;
  Im: number;
  Ie: number;
  t: number;
  am: number; // angle from the muon direction seen from the vertex (deg), for the width estimate
  ae: number;
}

type P = { side: number; nu: number; rays: number; unroll: number; recon: number; sharp: number };
const TARGETS: Record<string, P> = {
  tank: { side: 1, nu: 0, rays: 0, unroll: 0, recon: 0, sharp: 0 },
  interaction: { side: 1, nu: 1, rays: 0, unroll: 0, recon: 0, sharp: 0 },
  cone: { side: 1, nu: 1, rays: 1, unroll: 0, recon: 0, sharp: 0 },
  ring: { side: 1, nu: 1, rays: 1, unroll: 1, recon: 0, sharp: 0 },
  reconstruct: { side: 1, nu: 1, rays: 1, unroll: 1, recon: 1, sharp: 0 },
  'ring-sharpness': { side: 0, nu: 0, rays: 0, unroll: 0, recon: 0, sharp: 1 },
};

const norm = (v: V3): V3 => {
  const n = Math.hypot(...v);
  return [v[0] / n, v[1] / n, v[2] / n];
};
const dotp = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Intensity and arrival time at a PMT from a set of straight sub-tracks. */
function light(p: V3, segs: Seg[]) {
  let I = 0;
  let tBest = 1e9;
  for (const sg of segs) {
    let lo = 1e9;
    let hi = -1e9;
    let best = 1e9;
    let bestErr = 1e9;
    for (let k = 0; k <= 6; k++) {
      const s = (sg.len * k) / 6;
      const x: V3 = [sg.o[0] + sg.d[0] * s, sg.o[1] + sg.d[1] * s, sg.o[2] + sg.d[2] * s];
      const r: V3 = [p[0] - x[0], p[1] - x[1], p[2] - x[2]];
      const dist = Math.hypot(...r);
      const ang = (Math.acos(clamp(dotp(r, sg.d) / dist, -1, 1)) * 180) / Math.PI;
      lo = Math.min(lo, ang);
      hi = Math.max(hi, ang);
      const err = Math.abs(ang - THD);
      if (err < bestErr) {
        bestErr = err;
        best = s / C + (N_W * dist) / C;
      }
    }
    if (THD >= lo - 2 && THD <= hi + 2) {
      I += sg.w;
      tBest = Math.min(tBest, best);
    }
  }
  return { I, t: tBest };
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const rnd = mulberry32(42);

    const dMu: V3 = [1, 0, 0];
    const mu: Seg[] = [{ o: [VX, 0, 0], d: dMu, len: LTRK, w: 1 }];
    const el: Seg[] = Array.from({ length: 6 }, () => {
      const a = gaussian(rnd) * 0.35; // ~20 degrees
      const b = gaussian(rnd) * 0.35;
      return { o: [VX, 0, 0] as V3, d: norm([Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a)]), len: 0.3 + rnd() * 0.9, w: 0.3 + rnd() * 0.5 };
    });

    // PMT lattice (subsampled) in the standard unrolled layout
    const pmts: Pmt[] = [];
    const add = (p: V3, u: number, v: number, barrel: boolean) => {
      const m = light(p, mu);
      const e = light(p, el);
      const r: V3 = [p[0] - VX, p[1], p[2]];
      const dist = Math.hypot(...r);
      pmts.push({ p, u, v, barrel, Im: m.I, Ie: e.I, t: m.t, am: (Math.acos(dotp(r, dMu) / dist) * 180) / Math.PI, ae: 0 });
    };
    const nPhi = Math.round((2 * Math.PI * R) / PITCH);
    const nZ = Math.round((2 * H) / PITCH);
    for (let i = 0; i < nPhi; i++)
      for (let j = 0; j < nZ; j++) {
        const phi = -Math.PI + ((i + 0.5) / nPhi) * 2 * Math.PI;
        const z = -H + ((j + 0.5) / nZ) * 2 * H;
        add([R * Math.cos(phi), R * Math.sin(phi), z], R * phi, z, true);
      }
    for (const sgn of [1, -1])
      for (let x = -R; x <= R; x += PITCH)
        for (let y = -R; y <= R; y += PITCH)
          if (x * x + y * y < (R - 0.5) ** 2) add([x, y, sgn * H], x, sgn * (H + GAP + R) + (sgn > 0 ? -y : y), false);
    const nLit = pmts.filter((q) => q.Im > 0.5).length;
    const tEnd = Math.max(...pmts.filter((q) => q.Im > 0.5).map((q) => q.t)) + 4;
    const ringSigma = (key: 'Im' | 'Ie') => {
      let n = 0;
      let s = 0;
      for (const q of pmts) {
        if (!q.barrel || Math.abs(q.u) > 18 || Math.abs(q.v) > 14 || q[key] < 0.5) continue;
        const r: V3 = [q.p[0] - VX, q.p[1], q.p[2]];
        const ang = (Math.acos(dotp(r, dMu) / Math.hypot(...r)) * 180) / Math.PI;
        s += (ang - THD) ** 2;
        n++;
      }
      return Math.sqrt(s / Math.max(1, n));
    };
    const sigMu = ringSigma('Im');
    const sigEl = ringSigma('Ie');
    const nLitE = pmts.filter((q) => q.Ie > 0.15).length;

    // side-view rays: from 6 emission points, direction (cos, +-sin) in the x–z plane
    const emis = Array.from({ length: 6 }, (_, k) => (LTRK * k) / 5);
    const wallHit = (x0: number, c: number, s: number) => {
      let t = 1e9;
      if (c > 1e-9) t = Math.min(t, (R - x0) / c);
      if (c < -1e-9) t = Math.min(t, (-R - x0) / c);
      if (s > 1e-9) t = Math.min(t, H / s);
      if (s < -1e-9) t = Math.min(t, -H / s);
      return t;
    };
    const rays = emis.flatMap((s0) =>
      [1, -1].map((sg) => {
        const c = Math.cos(THETA);
        const sn = sg * Math.sin(THETA);
        const dist = wallHit(VX + s0, c, sn);
        return { s0, c, sn, dist, tArr: s0 / C + (N_W * dist) / C };
      }),
    );
    // boundary PMT dots for the side view
    const bdry: [number, number][] = [];
    for (let x = -R + PITCH / 2; x < R; x += PITCH) bdry.push([x, H], [x, -H]);
    for (let z = -H + PITCH / 2; z < H; z += PITCH) bdry.push([R, z], [-R, z]);

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { cone: 2.6, ring: 3, reconstruct: 3 },
      draw(g, s, lv, env) {
        const { w, h } = s;
        const wide = w > h * 1.05;
        const narrow = w < 520;
        const S = wide ? Math.min(h - 16, w * 0.46) : Math.min(w - 16, h * 0.46);
        const sx = 8;
        const sy = wide ? (h - S) / 2 : 8;
        const k = (S - 14) / (2 * H); // px per m (taller than wide)
        const cxs = sx + S / 2;
        const cys = sy + S / 2;
        const Ps = (x: number, z: number): [number, number] => [cxs + x * k, cys - z * k];
        const pa = wide ? { x: sx + S + 24, y: 10, w: w - (sx + S + 24) - 10, h: h - 20 } : { x: 8, y: sy + S + 10, w: w - 16, h: h - S - 20 };
        const tclock = env.ts >= 1e3 ? tEnd : Math.min(tEnd, (env.ts / 2.2) * tEnd);
        const ringClock = env.state === 'ring' || env.state === 'reconstruct' ? tclock : env.ts >= 1e3 ? tEnd : tclock;

        // ---------- side view ----------
        if (lv.side > 0.01) {
          const a = lv.side;
          g.save();
          g.globalAlpha = 0.08 * a;
          g.fillStyle = th.accent2;
          g.fillRect(cxs - R * k, cys - H * k, 2 * R * k, 2 * H * k);
          g.restore();
          const [x0, y0] = Ps(-R, H);
          const [x1, y1] = Ps(R, -H);
          line(g, x0, y0, x1, y0, th.fg, 1, 0.6 * a);
          line(g, x0, y1, x1, y1, th.fg, 1, 0.6 * a);
          line(g, x0, y0, x0, y1, th.fg, 1, 0.6 * a);
          line(g, x1, y0, x1, y1, th.fg, 1, 0.6 * a);
          // PMTs on the wall, lit where a ray arrives
          const litSide = new Set<number>();
          bdry.forEach(([bx, bz], i) => {
            const [px, py] = Ps(bx, bz);
            dot(g, px, py, 1.6, th.fg, 0.6 * a);
            void i;
          });
          rays.forEach((r) => {
            if (lv.rays < 0.01) return;
            const [ox, oy] = Ps(VX + r.s0, 0);
            const reach = Math.min(r.dist, Math.max(0, (ringClock - r.s0 / C) * (C / N_W)));
            const ex = ox + r.c * reach * k;
            const ey = oy - r.sn * reach * k;
            ray(g, ox, oy, ex, ey, th.accent2, 0.55 * a * lv.rays, 1);
            if (reach >= r.dist - 1e-6) {
              const hx = ox + r.c * r.dist * k;
              const hy = oy - r.sn * r.dist * k;
              dot(g, hx, hy, 2.8, th.accent2, a * lv.rays);
              litSide.add(Math.round(hx * 10 + hy));
            }
          });
          // neutrino in, muon out
          const [vx, vy] = Ps(VX, 0);
          if (lv.nu > 0.01) {
            const z0 = -(VX + R) * Math.tan((12 * Math.PI) / 180);
            const [nx, ny] = Ps(-R, z0);
            line(g, nx, ny, vx, vy, th.fg, 1, 0.6 * a * lv.nu, [5, 4]);
            txt(g, narrow ? 'ν' : L('nuLabel'), nx + 8, ny + 14, { color: th.fg, alpha: 0.9 * lv.nu * a });
            const [ex, ey] = Ps(VX + LTRK, 0);
            line(g, vx, vy, ex, ey, th.accent, 1.8, a * lv.nu);
            dot(g, vx, vy, 2.5, th.fg, a * lv.nu);
            txt(g, L('muon'), ex + 6, ey - 12, { color: th.accent, alpha: lv.nu * a });
            if (!narrow) txt(g, L('vertex'), vx - 6, vy - 14, { color: th.fg, align: 'right', alpha: 0.85 * lv.nu * a * (1 - lv.recon) });
          }
          if (lv.rays > 0.01) {
            // angle between the track and the upper ray at the vertex
            g.save();
            g.strokeStyle = th.fg;
            g.globalAlpha = 0.8 * lv.rays * a;
            g.lineWidth = 1;
            g.beginPath();
            g.arc(vx, vy, 32, -THETA, 0);
            g.stroke();
            g.restore();
            txt(g, `θ = ${f0(THD)}°`, vx + 36, vy - 16, { mono: true, color: th.fg, alpha: 0.95 * lv.rays * a });
          }
          if (lv.recon > 0.01) {
            const [ex, ey] = Ps(VX + 9, 0);
            arrow(g, vx, vy, ex, ey, th.accent, 1.8, lv.recon * a, 9);
            if (!narrow) txt(g, L('direction'), vx - 6, vy - 14, { color: th.accent, align: 'right', alpha: lv.recon * a });
          }
          txt(g, `${f0(NU.SUPERK_MASS_KT.value as number)} kt`, cxs - R * k + 6, cys - H * k + 14, { mono: true, color: th.fg, alpha: 0.8 * a });
        }

        // ---------- info panel (tank stats, cone formula) ----------
        const info = (lines: string[], alpha: number, mono: boolean[]) => {
          lines.forEach((t, i) => txt(g, t, pa.x + 4, pa.y + 28 + i * 24, { color: th.fg, mono: mono[i], alpha: 0.9 * alpha }));
        };
        const tankAlpha = lv.side * (1 - lv.rays) * (1 - lv.nu);
        if (tankAlpha > 0.02)
          info([`${f0(NU.SUPERK_MASS_KT.value as number)} kt  ${L('water')}`, `${f0(NU.SUPERK_PMT_COUNT.value as number)}  ${L('pmts')}`, `${f1(NU.SUPERK_DEPTH_KM.value as number)} km  ${L('rock')}`], tankAlpha, [false, false, false]);
        const coneAlpha = lv.rays * (1 - lv.unroll);
        if (coneAlpha > 0.02) {
          txt(g, L('slower'), pa.x + 4, pa.y + 28, { color: th.fg, alpha: 0.95 * coneAlpha });
          txt(g, 'cos θ = 1 / (n β)', pa.x + 4, pa.y + 56, { mono: true, color: th.fg, alpha: coneAlpha });
          txt(g, `n = ${ctx.formatNumber(N_W, { minimumFractionDigits: 2 })},  β → 1`, pa.x + 4, pa.y + 78, { mono: true, color: th.fg, alpha: 0.85 * coneAlpha });
          txt(g, `θ = ${f1(THD)}°`, pa.x + 4, pa.y + 100, { mono: true, color: th.accent, alpha: coneAlpha });
        }

        // ---------- unrolled wall ----------
        if (lv.unroll > 0.01) {
          const a = lv.unroll;
          const Usz = Math.min(pa.w, pa.h - (narrow ? 96 : 104));
          const ux = pa.x + (pa.w - Usz) / 2;
          const uy = pa.y;
          const ks = Usz / 108;
          const ox = ux + Usz / 2;
          const oy = uy + Usz / 2;
          const rr = Math.max(0.9, ks * 0.55);
          for (const q of pmts) {
            const px = ox + q.u * ks;
            const py = oy - q.v * ks;
            const on = q.Im > 0.5 && q.t <= ringClock;
            dot(g, px, py, rr, on ? th.accent2 : th.fg, a * (on ? 1 : 0.16));
          }
          // outline of the layout: barrel rectangle and the two cap discs
          const bw = Math.PI * R * ks;
          g.save();
          g.strokeStyle = th.fg;
          g.globalAlpha = 0.3 * a;
          g.lineWidth = 1;
          g.strokeRect(ox - bw, oy - H * ks, 2 * bw, 2 * H * ks);
          for (const sg of [1, -1]) {
            g.beginPath();
            g.arc(ox, oy - sg * (H + GAP + R) * ks, R * ks, 0, Math.PI * 2);
            g.stroke();
          }
          g.restore();
          txt(g, `t = ${f0(ringClock)} ns`, ux + Usz, uy + 8, { mono: true, color: th.fg, align: 'right', alpha: 0.85 * a });
          if (!narrow) txt(g, L('unrolled'), ux + 2, uy + 8, { color: th.fg, alpha: 0.85 * a });
          txt(g, L('barrel'), ox - bw + 4, oy + H * ks - 8, { color: th.fg, alpha: 0.6 * a });
          txt(g, L('capTop'), ox, oy - (H + GAP + R) * ks, { color: th.fg, align: 'center', alpha: 0.6 * a });
          if (lv.recon > 0.01) {
            const b = lv.recon;
            const cx = ox;
            const cy = oy;
            line(g, cx - 7, cy, cx + 7, cy, th.accent, 1.5, b);
            line(g, cx, cy - 7, cx, cy + 7, th.accent, 1.5, b);
            if (!narrow) txt(g, L('centre'), cx, cy - 14 * ks, { color: th.accent, align: 'center', alpha: b });
            // readouts
            const ry = uy + Usz + 16;
            txt(g, L('dirRow'), pa.x + 4, ry, { color: th.fg, alpha: 0.9 * b });
            txt(g, L('energyRow'), pa.x + 4, ry + 24, { color: th.fg, alpha: 0.9 * b });
            txt(g, L('idRow'), pa.x + 4, ry + 48, { color: th.fg, alpha: 0.9 * b });
            const x1 = pa.x + (narrow ? 96 : 150);
            txt(g, narrow ? L('dirValS') : L('dirVal'), x1, ry, { color: th.accent, alpha: b });
            const bw2 = Math.min(150, pa.w - (x1 - pa.x) - 90);
            g.save();
            g.globalAlpha = b * 0.9;
            g.strokeStyle = th.accent;
            g.strokeRect(x1, ry + 17, bw2, 10);
            g.fillStyle = th.accent;
            g.fillRect(x1, ry + 17, (bw2 * Math.min(1, nLit / 150)), 10);
            g.restore();
            txt(g, `${f0(nLit)} PMT`, x1 + bw2 + 8, ry + 24, { mono: true, color: th.fg, alpha: b });
            txt(g, narrow ? L('sharpS') : `${L('sharp')}  (σ = ${f1(sigMu)}°)`, x1, ry + 48, { color: th.accent, alpha: b });
          }
        }

        // ---------- ring sharpness ----------
        if (lv.sharp > 0.01) {
          const a = lv.sharp;
          const pw = (w - 28) / 2;
          const ph = Math.min(pw * (28 / 36), h - 100);
          const kp = Math.min((pw - 14) / 36, ph / 28);
          [0, 1].forEach((i) => {
            const key = i === 0 ? 'Im' : 'Ie';
            const cx = 10 + pw / 2 + i * (pw + 8);
            const cy = 12 + ph / 2 + 36;
            const rr = Math.max(1, kp * 0.62);
            for (const q of pmts) {
              if (!q.barrel || Math.abs(q.u) > 18 || Math.abs(q.v) > 14) continue;
              const px = cx + q.u * kp;
              const py = cy - q.v * kp;
              const I = clamp(q[key]);
              const on = key === 'Im' ? I > 0.5 : I > 0.12;
              dot(g, px, py, rr, on ? th.accent2 : th.fg, a * (on ? 0.35 + 0.65 * I : 0.16));
            }
            const x0 = cx - 18 * kp;
            g.save();
            g.strokeStyle = th.fg;
            g.globalAlpha = 0.3 * a;
            g.strokeRect(x0, cy - 14 * kp, 36 * kp, 28 * kp);
            g.restore();
            // icon of the particle: one straight line, or a short bush
            const ix = x0 + 8;
            const iy = 22;
            if (i === 0) line(g, ix, iy, ix + 22, iy, th.accent, 1.8, a);
            else
              el.forEach((sg) => {
                line(g, ix, iy, ix + sg.d[0] * sg.len * 18, iy - sg.d[2] * sg.len * 18 + sg.d[1] * 0, th.accent, 1.2, a * 0.9);
              });
            txt(g, i === 0 ? L('muonLike') : L('electronLike'), ix + 32, iy, { color: th.fg, alpha: 0.95 * a });
            txt(g, i === 0 ? L('sharpRing') : L('fuzzyRing'), x0 + 36 * kp, cy + 14 * kp + 16, { color: th.accent, align: 'right', alpha: a });
            txt(g, `σ = ${f1(i === 0 ? sigMu : sigEl)}°`, x0, cy + 14 * kp + 16, { mono: true, color: th.fg, alpha: 0.9 * a });
          });
          void nLitE;
          void ring;
          void poly;
          void smooth;
        }
      },
    });
  },
};
export default mod;

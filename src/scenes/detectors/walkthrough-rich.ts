/**
 * det.walkthrough-rich — P9 Detection Walkthrough: a ring-imaging Cherenkov counter (LHCb-RICH-like).
 * Side view: the track runs along z through a gas radiator (n = 1.0014, C4F10-like); Cherenkov rays at theta_c leave every emission point; a
 * spherical mirror (radius of curvature 2f) reflects them onto a photon-detector plane at its focal surface, tilted off to the side of the beam.
 * The side view is a real 2D ray trace (ray / circle intersection, mirror reflection, intersection with the detector plane); only the angle is
 * exaggerated (x2.5) so the rays are visible. Front view and plots use the true numbers: f = 1.8 m, cos(theta_c) = 1/(n beta), r = f * theta_c,
 * p = 20 GeV/c for pi and K. Photon smearing 1.5 mrad per photon (illustrative), seeded.
 * Simplifications: paraxial focusing is exact only for a ring centred on the mirror axis; dispersion, aerogel scattering and the second mirror omitted.
 */
import { interpolateViridis } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, mulberry32, gaussian, clamp } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, dot, line, rect, ring, txt } from '../common/_draw';
import { makeClock, stepLevels, type Lv } from './_d2-common';

const STATES = ['goal', 'cone', 'ring', 'radius', 'focus'] as const;
type St = (typeof STATES)[number];
const N_GAS = 1.0014;
const N_AERO = 1.03;
const M = { pi: 0.13957, K: 0.49368, p: 0.93827 };
const P_TRACK = 20; // GeV/c
const F_M = 1.8; // m, focal length (mirror radius of curvature 3.6 m)
const theta = (p: number, m: number, n: number) => {
  const b = p / Math.hypot(p, m);
  const c = 1 / (n * b);
  return c < 1 ? Math.acos(c) : 0;
};
const thr = (m: number, n: number) => m / Math.sqrt(n * n - 1);

// ---- side-view geometry (world units, z right, y up) ----
const TH = 0.13; // exaggerated Cherenkov angle for the drawing, rad
const ALPHA = (18 * Math.PI) / 180;
const RM = 1.25;
const PM: [number, number] = [1.05, 0];
const CM: [number, number] = [PM[0] - RM * Math.cos(ALPHA), PM[1] + RM * Math.sin(ALPHA)];
const FOC: [number, number] = [PM[0] - (RM / 2) * Math.cos(2 * ALPHA), PM[1] + (RM / 2) * Math.sin(2 * ALPHA)];
const TAN: [number, number] = [Math.sin(2 * ALPHA), Math.cos(2 * ALPHA)]; // along the detector plane

/** Trace a ray from E (on the axis) with direction angle a up to the mirror, then to the detector plane. */
function trace(ze: number, a: number) {
  const d: [number, number] = [Math.cos(a), Math.sin(a)];
  const E: [number, number] = [ze, 0];
  // |E + s d - C| = RM, positive root
  const ox = E[0] - CM[0];
  const oy = E[1] - CM[1];
  const b = ox * d[0] + oy * d[1];
  const cc = ox * ox + oy * oy - RM * RM;
  const s = -b + Math.sqrt(b * b - cc);
  const Q: [number, number] = [E[0] + s * d[0], E[1] + s * d[1]];
  const n: [number, number] = [(CM[0] - Q[0]) / RM, (CM[1] - Q[1]) / RM];
  const dn = d[0] * n[0] + d[1] * n[1];
  const r: [number, number] = [d[0] - 2 * dn * n[0], d[1] - 2 * dn * n[1]];
  // intersection with the plane through FOC along TAN: (Q + t r - FOC) . normal = 0, normal = (cos2a... ) perpendicular to TAN
  const nrm: [number, number] = [-TAN[1], TAN[0]];
  const t = ((FOC[0] - Q[0]) * nrm[0] + (FOC[1] - Q[1]) * nrm[1]) / (r[0] * nrm[0] + r[1] * nrm[1]);
  const H: [number, number] = [Q[0] + t * r[0], Q[1] + t * r[1]];
  return { E, Q, H, u: (H[0] - FOC[0]) * TAN[0] + (H[1] - FOC[1]) * TAN[1] };
}

const TARGET: Record<St, Lv> = {
  goal: { sv: 1, rays: 0, refl: 0, fv: 0, plot: 0, aero: 0, two: 1 },
  cone: { sv: 1, rays: 1, refl: 0, fv: 0, plot: 0, aero: 0, two: 0 },
  ring: { sv: 1, rays: 1, refl: 1, fv: 1, plot: 0, aero: 0, two: 0 },
  radius: { sv: 0.3, rays: 0, refl: 0, fv: 1, plot: 1, aero: 0, two: 0 },
  focus: { sv: 0.9, rays: 0, refl: 0, fv: 0, plot: 1, aero: 1, two: 0 },
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number, d = 1) => ctx.formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d });
    const clk = makeClock(ctx);
    const rnd = mulberry32(77);
    const lv: Lv = { ...TARGET.goal };
    let tgt: Lv = { ...TARGET.goal };
    let state: St = 'goal';
    const EMIT = [0.25, 0.5, 0.75];
    const thPi = theta(P_TRACK, M.pi, N_GAS);
    const thK = theta(P_TRACK, M.K, N_GAS);
    const thP = theta(P_TRACK, M.p, N_GAS);
    const SIG = 0.0015; // rad per photon
    // photon hits on the detector plane: angle phi around the ring, radius f*(theta + smear)
    const hitsRing = (thc: number, n: number, seedOffset: number) => {
      const r = mulberry32(900 + seedOffset);
      return Array.from({ length: n }, (_, i) => ({ phi: (i / n) * Math.PI * 2 + 0.3 * r(), r: F_M * (thc + SIG * gaussian(r)), z: r() }));
    };
    const hPi = hitsRing(thPi, 28, 1);
    const hK = hitsRing(thK, 22, 2);
    void rnd;

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      stepLevels(lv, tgt, s.dt, 0.4);
      const wide = w >= 640 && w > h * 1.15;
      const narrow = w < 560;
      // regions
      const mainR = wide ? { x: 8, y: 8, w: w * 0.55, h: h - 16 } : { x: 8, y: 8, w: w - 16, h: h * 0.36 };
      const rest = wide ? { x: w * 0.55 + 24, y: 8, w: w * 0.45 - 36, h: h - 16 } : { x: 8, y: h * 0.36 + 18, w: w - 16, h: h * 0.64 - 26 };
      // side view scale
      const zlo = -0.05;
      const ks = Math.min(mainR.w / 1.2, mainR.h / 0.82);
      const ox = mainR.x + (mainR.w - 1.2 * ks) / 2 - zlo * ks;
      const oy = mainR.y + (mainR.h - 0.82 * ks) / 2 + 0.5 * ks; // y = 0 at this pixel row; y up
      const Z = (z: number) => ox + z * ks;
      const Y = (y: number) => oy - y * ks;
      const sv = lv.sv;

      if (sv > 0.02) {
        g.save();
        g.globalAlpha = 1;
        const A = sv;
        // gas vessel
        rect(g, Z(0.1), Y(0.2), 0.98 * ks, 0.4 * ks, th.fg, 1, 0.45 * A);
        if (!narrow) txt(g, L('radiator'), Z(0.12), Y(0.2) - 10, { color: th.fg, alpha: 0.8 * A });
        // aerogel slab upstream
        if (lv.aero > 0.02) {
          rect(g, Z(0.0), Y(0.16), 0.08 * ks, 0.32 * ks, th.accent2, 1.2, lv.aero, 0.18 * lv.aero);
          if (!narrow) txt(g, L('aerogel'), Z(0.0), Y(-0.2) + 32, { color: th.accent2, alpha: lv.aero });
        }
        // mirror
        g.save();
        g.strokeStyle = th.fg;
        g.globalAlpha = 0.95 * A;
        g.lineWidth = 2.2;
        g.beginPath();
        const phi0 = Math.atan2(PM[1] - CM[1], PM[0] - CM[0]);
        for (let i = 0; i <= 40; i++) {
          const ph = phi0 - 0.17 + (0.34 * i) / 40;
          const x = CM[0] + RM * Math.cos(ph);
          const y = CM[1] + RM * Math.sin(ph);
          i ? g.lineTo(Z(x), Y(y)) : g.moveTo(Z(x), Y(y));
        }
        g.stroke();
        g.restore();
        if (!narrow) txt(g, L('mirror'), Z(1.08), Y(-0.2) + 16, { color: th.fg, align: 'right', alpha: 0.8 * A });
        // photon detector plane
        const dp0 = [FOC[0] - TAN[0] * 0.15, FOC[1] - TAN[1] * 0.15];
        const dp1 = [FOC[0] + TAN[0] * 0.15, FOC[1] + TAN[1] * 0.15];
        line(g, Z(dp0[0]), Y(dp0[1]), Z(dp1[0]), Y(dp1[1]), th.accent2, 3, A);
        if (!narrow) txt(g, L('detector'), Z(dp1[0]) + 10, Y(dp1[1]) + 2, { color: th.accent2, alpha: A });
        // beam axis and tracks
        const head = state === 'goal' ? 1 : 0.1 + 0.85 * clk.p(0.05, 1.3);
        const tracks: { y: number; col: string; name: string }[] =
          lv.two > 0.5 ? [{ y: 0.035, col: th.accent, name: 'π' }, { y: -0.035, col: th.accent2, name: 'K' }] : [{ y: 0, col: th.accent, name: '' }];
        tracks.forEach((tr) => {
          arrow(g, Z(-0.05), Y(tr.y), Z(lv.two > 0.5 ? 0.98 : Math.min(1.0, head + 0.05)), Y(tr.y), tr.col, 1.6, A, 7);
          if (tr.name) txt(g, tr.name, Z(-0.05) + 4, Y(tr.y) + (tr.y > 0 ? -10 : 12), { color: tr.col, alpha: A });
        });
        if (lv.two > 0.5) {
          txt(g, `p = ${P_TRACK} GeV/c`, Z(0.5), Y(0.035) - 14, { mono: true, color: th.fg, align: 'center', alpha: 0.85 * A });
          txt(g, L('same'), Z(0.5), Y(-0.035) + 16, { color: th.fg, align: 'center', alpha: 0.85 * A });
        }
        // Cherenkov rays (emission: additive)
        if (lv.rays > 0.02) {
          g.save();
          g.globalCompositeOperation = 'lighter';
          const emit = state === 'cone' ? Array.from({ length: 14 }, (_, i) => 0.14 + i * 0.055) : EMIT;
          emit.forEach((ze, ei) => {
            if (ze > head) return;
            [-1, 1].forEach((sg) => {
              const t = trace(ze, sg * TH);
              g.strokeStyle = th.accent;
              g.lineWidth = state === 'cone' ? 1 : 1.3;
              g.globalAlpha = (state === 'cone' ? 0.5 : 0.8) * lv.rays * A;
              g.beginPath();
              g.moveTo(Z(t.E[0]), Y(t.E[1]));
              g.lineTo(Z(t.Q[0]), Y(t.Q[1]));
              if (lv.refl > 0.02) {
                const q = clk.p(1.0 + ei * 0.25, 0.7);
                g.lineTo(Z(t.Q[0] + (t.H[0] - t.Q[0]) * q), Y(t.Q[1] + (t.H[1] - t.Q[1]) * q));
              }
              g.stroke();
            });
          });
          g.restore();
          if (state !== 'cone')
            EMIT.forEach((ze) => {
              if (ze <= head) dot(g, Z(ze), Y(0), 3, th.fg, 0.9);
            });
          // converged hits on the detector plane
          if (lv.refl > 0.02 && clk.p(1.9, 0.5) > 0.5)
            EMIT.forEach((ze) =>
              [-1, 1].forEach((sg) => {
                const t = trace(ze, sg * TH);
                dot(g, Z(t.H[0]), Y(t.H[1]), 3, interpolateViridis(0.15 + 0.7 * ((ze - 0.25) / 0.5)), lv.refl);
              })
            );
          // angle mark at the first emission point
          if (state === 'cone' || state === 'ring') {
            const ze = state === 'cone' ? 0.3 : EMIT[0];
            g.save();
            g.strokeStyle = th.fg;
            g.globalAlpha = 0.8 * A;
            g.lineWidth = 1;
            g.beginPath();
            g.arc(Z(ze), Y(0), 38, -TH, 0);
            g.stroke();
            g.restore();
            txt(g, 'θc', Z(ze) + 44, Y(0) - 12, { mono: true, color: th.fg, alpha: A });
          }
        }
        if (state === 'cone' && !narrow) {
          txt(g, `${L('gas')}  n − 1 ≈ ${ctx.formatNumber((N_GAS - 1) * 1000, { maximumFractionDigits: 1 })} × 10⁻³`, Z(0.12), Y(-0.2) + 16, { mono: true, color: th.fg, alpha: 0.85 });
          txt(g, L('exag'), Z(0.12), Y(-0.2) + 32, { color: th.fg, alpha: 0.55 });
        }
        if (state === 'ring' && !narrow) txt(g, L('exag'), Z(0.12), Y(-0.2) + 16, { color: th.fg, alpha: 0.55 });
        if (state === 'focus' && !narrow) {
          txt(g, `${L('gas')}  n − 1 ≈ ${ctx.formatNumber((N_GAS - 1) * 1000, { maximumFractionDigits: 1 })} × 10⁻³`, Z(0.12), Y(-0.2) + 16, { mono: true, color: th.fg, alpha: 0.85 });
        }
        g.restore();
      }

      // ---- right/lower column ----
      const colGap = 14;
      const fvSize = wide ? Math.min(rest.w, rest.h * (lv.plot > 0.5 ? 0.46 : 0.7), 340) : Math.min(rest.h - 8, rest.w * 0.42, 260);
      const fv = wide ? { x: rest.x + (rest.w - fvSize) / 2, y: rest.y + 30, s: fvSize } : { x: rest.x, y: rest.y + 26, s: fvSize };
      const RMAX = 12; // cm shown in the front view
      const kf = fv.s / 2 / RMAX;
      const FXc = fv.x + fv.s / 2;
      const FYc = fv.y + fv.s / 2;
      if (lv.fv > 0.02) {
        const a = lv.fv;
        txt(g, L('front'), fv.x, fv.y - 12, { color: th.fg, alpha: 0.8 * a });
        rect(g, fv.x, fv.y, fv.s, fv.s, th.fg, 1, 0.3 * a);
        line(g, FXc - 5, FYc, FXc + 5, FYc, th.fg, 1, 0.5 * a);
        line(g, FXc, FYc - 5, FXc, FYc + 5, th.fg, 1, 0.5 * a);
        const showHits = (hs: typeof hPi, col: (z: number) => string, k: number) => {
          g.save();
          g.globalCompositeOperation = 'lighter';
          hs.forEach((q, i) => {
            if (i / hs.length > k) return;
            g.globalAlpha = 0.9 * a;
            g.fillStyle = col(q.z);
            g.beginPath();
            g.arc(FXc + Math.cos(q.phi) * q.r * 100 * kf, FYc - Math.sin(q.phi) * q.r * 100 * kf, 2.2, 0, Math.PI * 2);
            g.fill();
          });
          g.restore();
        };
        const grow = clk.p(state === 'ring' ? 2.0 : 0.1, 1.0);
        if (state === 'ring') {
          showHits(hPi, (z) => interpolateViridis(0.15 + 0.7 * z), grow);
          ring(g, FXc, FYc, F_M * thPi * 100 * kf, th.accent, 1, 0.5 * a * grow, [3, 3]);
          txt(g, L('emissionDepth'), fv.x, fv.y + fv.s + 14, { color: th.fg, alpha: 0.75 * a });
          for (let i = 0; i < 30; i++) {
            g.fillStyle = interpolateViridis(0.15 + 0.7 * (i / 29));
            g.globalAlpha = a;
            g.fillRect(fv.x + fv.s - 90 + i * 3, fv.y + fv.s + 8, 3, 5);
          }
          g.globalAlpha = 1;
        } else if (state === 'radius') {
          showHits(hPi, () => th.accent, grow);
          showHits(hK, () => th.accent2, grow);
          ring(g, FXc, FYc, F_M * thPi * 100 * kf, th.accent, 1, 0.45 * a, [3, 3]);
          ring(g, FXc, FYc, F_M * thK * 100 * kf, th.accent2, 1, 0.45 * a, [3, 3]);
          txt(g, `π  r = ${f1(F_M * thPi * 100, 1)} cm`, fv.x + fv.s + (wide ? -fv.s : 8), fv.y + fv.s + 14, { mono: true, color: th.accent, alpha: a });
          txt(g, `K  r = ${f1(F_M * thK * 100, 1)} cm`, fv.x + fv.s + (wide ? -fv.s : 8), fv.y + fv.s + 30, { mono: true, color: th.accent2, alpha: a });
          txt(g, L('overlay'), fv.x + fv.s, fv.y - 12, { color: th.fg, align: 'right', alpha: 0.6 * a });
        }
      }

      // plot: theta_c versus p
      if (lv.plot > 0.02) {
        const a = lv.plot;
        const pr = wide
          ? { x: rest.x + 52, y: fv.y + fv.s + (state === 'radius' ? 62 : -2) , w: rest.w - 70, h: 0 }
          : { x: fv.x + fv.s + 70, y: rest.y + 28, w: Math.max(60, rest.x + rest.w - (fv.x + fv.s + 70) - 16), h: 0 };
        if (state === 'focus') {
          if (wide) {
            pr.y = rest.y + 40;
            pr.h = rest.h - 40 - 68;
          } else {
            pr.x = rest.x + 54;
            pr.w = rest.w - 70;
            pr.y = rest.y + 24;
            pr.h = rest.h - 24 - 72;
          }
        } else pr.h = wide ? Math.max(70, rest.y + rest.h - pr.y - 54) : Math.max(60, rest.h - 28 - 50);
        void colGap;
        if (pr.h > 40 && pr.w > 60) {
          g.save();
          g.globalAlpha = a;
          if (state === 'focus') {
            const ticks = [0.5, 1, 2, 5, 10, 20, 50, 100].map((v) => ({ v, label: String(v) }));
            const pl = plot(g, ctx, pr, { min: 0.5, max: 100, log: true, label: L('pAxis'), ticks }, { min: 0, max: 260, label: L('thAxis'), ticks: [0, 100, 200].map((v) => ({ v, label: String(v) })) });
            pl.axes();
            const fam: [number, string, boolean][] = [[N_AERO, 'aerogel', false], [N_GAS, 'gas', true]];
            fam.forEach(([n, nm, dash]) => {
              (['pi', 'K', 'p'] as const).forEach((sp) => {
                const col = sp === 'pi' ? th.accent : th.fg;
                const t0 = thr(M[sp], n);
                pl.curve((p) => (p > t0 ? theta(p, M[sp], n) * 1000 : NaN), { color: col, width: sp === 'p' ? 1.1 : 1.4, alpha: sp === 'K' ? 0.95 : sp === 'p' ? 0.6 : 1, dash: dash ? [5, 3] : [] }, 300);
                // threshold mark: tick on the axis, taller for the aerogel
                const hx = pl.X(t0);
                line(g, hx, pr.y + pr.h, hx, pr.y + pr.h - (dash ? 14 : 28), col, 1, 0.8);
                txt(g, sp === 'pi' ? 'π' : sp, hx, pr.y + pr.h - (dash ? 22 : 36), { color: col, align: 'center', alpha: 0.95 });
              });
            });
            if (!narrow) {
              pl.text(80, theta(100, M.pi, N_AERO) * 1000 - 12, L('aerogel'), { color: th.fg, align: 'right' });
              pl.text(80, theta(100, M.pi, N_GAS) * 1000 + 14, L('gasShort'), { color: th.fg, align: 'right' });
            }
            txt(g, L('thr1'), pr.x + pr.w, pr.y + pr.h + 46, { color: th.fg, align: 'right', alpha: 0.7 });
            txt(g, L('thr2'), pr.x + pr.w, pr.y + pr.h + 61, { color: th.fg, align: 'right', alpha: 0.7 });
          } else {
            const ticks = [1, 2, 5, 10, 20, 50, 100].map((v) => ({ v, label: String(v) }));
            const pl = plot(g, ctx, pr, { min: 1, max: 100, log: true, label: L('pAxis'), ticks }, { min: 0, max: 62, label: L('thAxis'), ticks: [0, 20, 40, 60].map((v) => ({ v, label: String(v) })) });
            pl.axes();
            (['pi', 'K', 'p'] as const).forEach((sp) => {
              const col = sp === 'pi' ? th.accent : th.fg;
              const t0 = thr(M[sp], N_GAS);
              pl.curve((p) => (p > t0 ? theta(p, M[sp], N_GAS) * 1000 : NaN), { color: col, width: 1.5, alpha: sp === 'p' ? 0.6 : 1, dash: sp === 'K' ? [] : sp === 'p' ? [2, 3] : [], progress: clk.p(0.2, 1) }, 300);
              // direct label where the curve reaches 30 mrad
              let pp = t0;
              while (pp < 100 && theta(pp, M[sp], N_GAS) * 1000 < 30) pp *= 1.02;
              pl.text(pp * 1.1, 30 - 4, sp === 'pi' ? 'π' : sp, { color: col, align: 'left' });
              dot(g, pl.X(P_TRACK), pl.Y(theta(P_TRACK, M[sp], N_GAS) * 1000), 3.5, col, 1);
            });
            pl.vline(P_TRACK, { dash: [3, 3], alpha: 0.5 });
            pl.text(P_TRACK * 1.06, 6, `${P_TRACK} GeV/c`, { mono: true, color: th.fg });
            pl.hline(theta(100, M.pi, N_GAS) * 1000 * 1.0, { dash: [2, 4], alpha: 0.35 });
            pl.text(1.1, 40, 'cos θc = 1 / (n β)', { mono: true, color: th.fg });
          }
          g.restore();
        }
      }
    });
    c.animate = true;
    void clamp;
    return {
      setState(st: string, o: SetStateOptions) {
        state = (STATES as readonly string[]).includes(st) ? (st as St) : 'goal';
        tgt = { ...TARGET[state] };
        clk.reset();
        if (o.immediate || ctx.reducedMotion) {
          Object.assign(lv, TARGET[state]);
          clk.finish();
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

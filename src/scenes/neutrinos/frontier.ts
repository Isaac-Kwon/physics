/**
 * nu.frontier — P2 scene, six open-question diagrams (all schematic, no data points).
 *   mass-ordering : levels at m^2 relative to the lightest: normal nu1, nu2 = +7.5e-5, nu3 = +2.5e-3 eV^2; inverted nu3 = 0,
 *                   nu1 = 2.5e-3, nu2 = 2.575e-3 (Delta m^2 gaps to scale on one axis). Bars = |U_li|^2 from sin^2 th12 = 0.31,
 *                   sin^2 th23 = 0.5, sin^2 th13 = 0.022, delta = 0 (rounded, qualitative).
 *   cp            : vacuum appearance probability to first order in alpha = dm21/dm31 (Cervera et al.):
 *                   P = 0.043 sin^2 D + alpha^2 c23^2 sin^2 2th12 D^2 -+ alpha Jt sin(delta) D sin^2 D, D = 1.27 dm31 L/E,
 *                   Jt = cos th13 sin 2th12 sin 2th13 sin 2th23 = 0.27, delta = -90 deg (illustrative), + for neutrinos.
 *   absolute-mass : log eV axis with the oscillation floor on the sum (0.06 eV), KATRIN limit (0.45 eV on m(nu_e)) and the
 *                   cosmological bound on the sum (~0.1 eV, model dependent).
 *   majorana      : Dirac (particle and antiparticle differ) vs Majorana (one particle, two helicities).
 *   cosmic        : Mollweide map in equatorial coordinates; Galactic plane from the standard rotation (alpha_NGP = 192.859,
 *                   delta_NGP = 27.128, l_NCP = 122.932); TXS 0506+056 (RA 77.36, Dec +5.69), NGC 1068 (RA 40.67, Dec 0.0).
 *   snews         : log time axis, 1 s to 1 day: neutrino burst (~10 s), alert (about a minute), light (hours later).
 */
import type { SceneModule } from '../shared/types';
import { clamp } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { NU } from '../../data/neutrinos';
import { createStage, arrow, dim, dot, flavourColor, line, poly, ring, txt } from './_n2-common';

const STATES = ['mass-ordering', 'cp', 'absolute-mass', 'majorana', 'cosmic', 'snews'] as const;
type P = { mo: number; cp: number; am: number; mj: number; co: number; sn: number };
const one = (k: keyof P): P => ({ mo: 0, cp: 0, am: 0, mj: 0, co: 0, sn: 0, [k]: 1 });
const TARGETS: Record<string, P> = { 'mass-ordering': one('mo'), cp: one('cp'), 'absolute-mass': one('am'), majorana: one('mj'), cosmic: one('co'), snews: one('sn') };

const S12 = 0.31;
const S23 = 0.5;
const S13 = 0.022;
const DM31 = NU.DM2_ATM_EV2.value as number;
const DM21 = NU.DM2_SOL_EV2.value as number;
// |U_li|^2, rows e, mu, tau; columns nu1, nu2, nu3
const U2 = (() => {
  const s12 = Math.sqrt(S12);
  const c12 = Math.sqrt(1 - S12);
  const s23 = Math.sqrt(S23);
  const c23 = s23;
  const s13 = Math.sqrt(S13);
  const c13 = Math.sqrt(1 - S13);
  const e = [c12 * c12 * c13 * c13, s12 * s12 * c13 * c13, s13 * s13];
  const mu = [(s12 * c23 + c12 * s23 * s13) ** 2, (c12 * c23 - s12 * s23 * s13) ** 2, c13 * c13 * s23 * s23];
  const ta = [1 - e[0] - mu[0], 1 - e[1] - mu[1], 1 - e[2] - mu[2]];
  return [e, mu, ta];
})();
const ALPHA = DM21 / DM31;
const JT = Math.sqrt(1 - S13) * 2 * Math.sqrt(S12 * (1 - S12)) * 2 * Math.sqrt(S13 * (1 - S13)) * 1;
const pApp = (x: number, sgn: 1 | -1) => {
  const D = 1.27 * DM31 * x;
  return 0.043 * Math.sin(D) ** 2 + ALPHA * ALPHA * 0.5 * (4 * S12 * (1 - S12)) * D * D + sgn * ALPHA * JT * D * Math.sin(D) ** 2;
};

// Mollweide
const mollweide = (raDeg: number, decDeg: number): [number, number] => {
  const lam = (-(raDeg - 180) * Math.PI) / 180;
  const phi = (decDeg * Math.PI) / 180;
  let t = phi;
  for (let i = 0; i < 12; i++) {
    const f = 2 * t + Math.sin(2 * t) - Math.PI * Math.sin(phi);
    const d = 2 + 2 * Math.cos(2 * t);
    if (Math.abs(d) < 1e-9) break;
    t -= f / d;
  }
  return [(2 * Math.SQRT2 / Math.PI) * lam * Math.cos(t), Math.SQRT2 * Math.sin(t)];
};
const galPlane = Array.from({ length: 181 }, (_, i) => {
  const l = (i / 180) * 2 * Math.PI;
  const lN = (122.932 * Math.PI) / 180;
  const dG = (27.128 * Math.PI) / 180;
  const sd = Math.cos(dG) * Math.cos(lN - l);
  const ra = (192.859 * Math.PI) / 180 + Math.atan2(Math.sin(lN - l), -Math.sin(dG) * Math.cos(lN - l));
  return [((((ra * 180) / Math.PI) % 360) + 360) % 360, (Math.asin(sd) * 180) / Math.PI] as [number, number];
});

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    void f1;

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: {},
      draw(g, s, lv) {
        const { w, h } = s;
        const narrow = w < 520;
        const tight = w < 720;

        // ------------------------------------------------ mass ordering
        if (lv.mo > 0.01) {
          const a = lv.mo;
          const H = Math.min(h - 150, 300);
          const base = 62 + H + 8; // y of m^2 = 0 (bottom)
          const MAXV = 2.6e-3;
          const Y = (v: number) => base - (v / MAXV) * H;
          const pw = (w - 40) / 2;
          const bw = Math.min(pw * 0.55, 200);
          const names = ['ν₁', 'ν₂', 'ν₃'];
          const panels = [
            { title: L('normal'), levels: [0, DM21, DM31] },
            { title: L('inverted'), levels: [DM31, DM31 + DM21, 0] },
          ];
          // legend
          ['e', 'mu', 'tau'].forEach((nm, i) => {
            const lx = 20 + i * (narrow ? 70 : 90);
            g.save();
            g.globalAlpha = a;
            g.fillStyle = flavourColor(i as 0 | 1 | 2);
            g.fillRect(lx, 16, 10, 10);
            g.restore();
            txt(g, ['νₑ', 'ν_μ', 'ν_τ'][i], lx + 15, 21, { color: th.fg, alpha: 0.9 * a });
            void nm;
          });
          panels.forEach((pn, pi) => {
            const x0 = 20 + pi * pw + (pw - bw) / 2;
            txt(g, pn.title, x0 + bw / 2, 44, { color: th.fg, align: 'center', alpha: a });
            pn.levels.forEach((lev, i) => {
              const y = Y(lev);
              let x = x0;
              [0, 1, 2].forEach((fl) => {
                const wd = bw * U2[fl][i];
                g.save();
                g.globalAlpha = a;
                g.fillStyle = flavourColor(fl as 0 | 1 | 2);
                g.fillRect(x, y - 2.5, wd, 5);
                g.restore();
                x += wd;
              });
              const right = (pi === 0 && i === 1) || (pi === 1 && i === 1) || (pi === 1 && i === 0 && false);
              txt(g, names[i], right ? x0 + bw + 8 : x0 - 8, y, { color: th.fg, align: right ? 'left' : 'right', alpha: 0.95 * a });
            });
            g.save();
            g.globalAlpha = a;
            const hi = pi === 0 ? DM31 : DM31;
            const lo = 0;
            dim(g, x0 - 38, Y(hi), x0 - 38, Y(lo), narrow ? '' : 'Δm²₃₁', th.fg, 0.55, true, 4);
            g.restore();
          });
          txt(g, L('gap31'), w / 2, base + 22, { mono: false, color: th.fg, align: 'center', alpha: 0.85 * a });
          txt(g, L('gap21'), w / 2, base + 40, { color: th.fg, align: 'center', alpha: 0.85 * a });
          txt(g, L('which'), narrow ? w - 14 : w / 2, narrow ? 21 : 44, { color: th.accent, align: narrow ? 'right' : 'center', alpha: a });
          if (!narrow) txt(g, L('mAxis'), 6, base - H - 12, { color: th.fg, alpha: 0.7 * a });
        }

        // ------------------------------------------------ CP
        if (lv.cp > 0.01) {
          const a = lv.cp;
          const R = { x: 56, y: 40, w: Math.max(100, w - 90), h: h - 110 };
          const p = plot(g, ctx, R, { min: 0, max: 1000, label: L('loe'), ticks: [0, 250, 500, 750, 1000].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 0.075, label: L('papp'), ticks: [0, 0.05].map((v) => ({ v, label: String(v) })) });
          g.save();
          g.globalAlpha = a;
          p.axes();
          p.band((x) => pApp(x, -1), (x) => pApp(x, 1), th.accent2, 0.28, 200);
          p.curve((x) => pApp(x, 1), { color: th.accent, width: 1.8 });
          p.curve((x) => pApp(x, -1), { color: th.fg, width: 1.5, dash: [5, 4] });
          p.text(470, pApp(470, 1) + 0.005, 'ν', { color: th.accent, align: 'right' });
          p.text(470, pApp(470, -1) - 0.006, 'ν̄', { align: 'right' });
          p.text(560, 0.068, L('cpq'), { color: th.accent2, align: 'left' });
          g.restore();
        }

        // ------------------------------------------------ absolute mass
        if (lv.am > 0.01) {
          const a = lv.am;
          const x0 = 30;
          const x1 = w - 30;
          const yA = h * 0.7;
          const X = (v: number) => x0 + ((Math.log10(v) - Math.log10(0.01)) / (Math.log10(10) - Math.log10(0.01))) * (x1 - x0);
          const kat = NU.M_NU_KATRIN_EV.value as number;
          const sumMin = (NU.M_SUM_MIN_EV.value as readonly number[])[0];
          g.save();
          g.globalAlpha = 0.16 * a;
          g.fillStyle = th.accent2;
          g.fillRect(X(sumMin), yA - h * 0.3, X(kat) - X(sumMin), h * 0.3);
          g.restore();
          line(g, x0, yA, x1, yA, th.fg, 1, 0.6 * a);
          [0.01, 0.1, 1, 10].forEach((v) => {
            line(g, X(v), yA, X(v), yA + 5, th.fg, 1, 0.6 * a);
            txt(g, `${ctx.formatNumber(v)} eV`, X(v), yA + 18, { mono: true, color: th.fg, align: 'center', alpha: 0.7 * a });
          });
          line(g, X(sumMin), yA, X(sumMin), yA - h * 0.46, th.accent2, 1.4, a);
          txt(g, tight ? L('oscS') : L('osc'), X(sumMin) - 8, yA - h * 0.46, { color: th.accent2, align: 'right', alpha: a });
          txt(g, `${ctx.formatNumber(sumMin)} eV`, X(sumMin) - 8, yA - h * 0.46 + 16, { mono: true, color: th.accent2, align: 'right', alpha: a });
          line(g, X(0.1), yA, X(0.1), yA - h * 0.58, th.fg, 1, 0.7 * a, [4, 4]);
          txt(g, tight ? L('cosmoS') : L('cosmo'), X(0.1) + 8, yA - h * 0.58, { color: th.fg, alpha: 0.9 * a });
          line(g, X(kat), yA, X(kat), yA - h * 0.34, th.accent, 1.6, a);
          txt(g, tight ? L('katrinS') : L('katrin'), X(kat) + 8, yA - h * 0.34, { color: th.accent, alpha: a });
          txt(g, `${ctx.formatNumber(kat)} eV`, X(kat) + 8, yA - h * 0.34 + 16, { mono: true, color: th.accent, alpha: a });
          txt(g, L('window'), (X(sumMin) + X(kat)) / 2, yA - 12, { color: th.fg, align: 'center', alpha: 0.9 * a });
          if (!tight) arrow(g, x1 - 50, yA - 34, x1 - 4, yA - 34, th.fg, 1, 0.7 * a, 6);
          txt(g, tight ? L('electronS') : L('electron'), tight ? x1 : x1 - 54, tight ? yA - 12 : yA - 34, { color: th.fg, align: 'right', alpha: 0.8 * a });
        }

        // ------------------------------------------------ Majorana
        if (lv.mj > 0.01) {
          const a = lv.mj;
          const pw = (w - 20) / 2;
          const kk = Math.max(0.55, Math.min(1.8, pw / 260));
          const particle = (cx: number, cy: number, right: boolean, c: string, label: string, sub: string) => {
            ring(g, cx, cy, 24 * kk, c, 1.5, a);
            g.save();
            g.globalAlpha = 0.18 * a;
            g.fillStyle = c;
            g.beginPath();
            g.arc(cx, cy, 24 * kk, 0, Math.PI * 2);
            g.fill();
            g.restore();
            arrow(g, cx + 28 * kk, cy, cx + 62 * kk, cy, th.fg, 1.2, 0.9 * a, 6); // momentum
            txt(g, 'p', cx + 66 * kk, cy - 10, { mono: true, color: th.fg, alpha: 0.8 * a });
            if (right) arrow(g, cx - 12 * kk, cy, cx + 12 * kk, cy, th.fg, 2.2, a, 8);
            else arrow(g, cx + 12 * kk, cy, cx - 12 * kk, cy, th.fg, 2.2, a, 8);
            txt(g, label, cx + 8, cy + 42 * kk, { color: c, align: 'center', alpha: a });
            txt(g, sub, cx + 8, cy + 60 * kk, { color: th.fg, align: 'center', alpha: 0.85 * a });
          };
          const cy = h * 0.42;
          const dx = Math.min(130 * kk, pw * (tight ? 0.22 : 0.3));
          // Dirac
          const c1 = 10 + pw / 2;
          txt(g, L('dirac'), c1, 22, { color: th.fg, align: 'center', alpha: a });
          particle(c1 - dx, cy, false, th.accent, 'ν', L('leftH'));
          particle(c1 + dx, cy, true, th.accent2, 'ν̄', L('rightH'));
          txt(g, '≠', c1, cy, { color: th.fg, align: 'center', alpha: a });
          txt(g, tight ? L('diracNoteS') : L('diracNote'), c1, cy + 110 * kk, { color: th.fg, align: 'center', alpha: 0.9 * a });
          if (!tight) txt(g, L('diracNote2'), c1, cy + 130 * kk, { color: th.fg, align: 'center', alpha: 0.7 * a });
          // Majorana
          const c2 = 10 + pw * 1.5;
          txt(g, L('majorana'), c2, 22, { color: th.fg, align: 'center', alpha: a });
          particle(c2 - dx, cy, false, th.accent, 'ν', L('leftH'));
          particle(c2 + dx, cy, true, th.accent, 'ν', L('rightH'));
          txt(g, '=', c2, cy, { color: th.fg, align: 'center', alpha: a });
          txt(g, tight ? L('majNoteS') : L('majNote'), c2, cy + 110 * kk, { color: th.fg, align: 'center', alpha: 0.9 * a });
          if (!tight) txt(g, L('majNote2'), c2, cy + 130 * kk, { color: th.fg, align: 'center', alpha: 0.7 * a });
          line(g, w / 2, 14, w / 2, h - 14, th.fg, 1, 0.15 * a);
        }

        // ------------------------------------------------ cosmic sky map
        if (lv.co > 0.01) {
          const a = lv.co;
          const Wm = Math.min(w - 40, 2 * (h - 110) * 1.0);
          const sc = Wm / (4 * Math.SQRT2);
          const cx = w / 2;
          const cy = h * 0.46;
          const M = (ra: number, dec: number): [number, number] => {
            const [x, y] = mollweide(ra, dec);
            return [cx + x * sc, cy - y * sc];
          };
          // outline
          g.save();
          g.strokeStyle = th.fg;
          g.globalAlpha = 0.55 * a;
          g.lineWidth = 1;
          g.beginPath();
          g.ellipse(cx, cy, 2 * Math.SQRT2 * sc, Math.SQRT2 * sc, 0, 0, Math.PI * 2);
          g.stroke();
          g.restore();
          // graticule
          [-60, -30, 0, 30, 60].forEach((d) => {
            const pts: [number, number][] = [];
            for (let r = 0; r <= 360; r += 6) pts.push(M(r, d));
            poly(g, pts, th.fg, 1, 0.12 * a);
          });
          [0, 60, 120, 180, 240, 300, 360].forEach((r) => {
            const pts: [number, number][] = [];
            for (let d = -90; d <= 90; d += 6) pts.push(M(r, d));
            poly(g, pts, th.fg, 1, 0.12 * a);
          });
          // Galactic plane (broken at the RA wrap)
          const sorted = [...galPlane].sort((u, v) => u[0] - v[0]);
          // draw as a thick faint band + a thin line
          const drawSeg = (pts: [number, number][]) => {
            poly(g, pts, th.accent2, 6, 0.18 * a);
            poly(g, pts, th.accent2, 1, 0.8 * a);
          };
          {
            let sg: [number, number][] = [];
            sorted.forEach(([ra, dec]) => {
              const q = M(ra, dec);
              if (sg.length && Math.abs(q[0] - sg[sg.length - 1][0]) > Wm * 0.2) {
                drawSeg(sg);
                sg = [];
              }
              sg.push(q);
            });
            drawSeg(sg);
          }
          const [gx, gy] = M(300, 40);
          void gx;
          void gy;
          txt(g, L('galPlane'), ...(() => { const q = M(190, -80); return [q[0], q[1]] as [number, number]; })(), { color: th.accent2, align: 'center', alpha: 0.9 * a });
          // sources
          const txs = M(77.36, 5.69);
          const ngc = M(40.67, -0.01);
          dot(g, txs[0], txs[1], 4, th.accent, a);
          dot(g, ngc[0], ngc[1], 4, th.accent, a);
          line(g, txs[0], txs[1], txs[0] - 18, txs[1] - 38, th.fg, 1, 0.6 * a);
          txt(g, 'TXS 0506+056', txs[0] - 22, txs[1] - 46, { color: th.fg, align: 'center', alpha: a });
          line(g, ngc[0], ngc[1], ngc[0] + 20, ngc[1] + 40, th.fg, 1, 0.6 * a);
          txt(g, 'NGC 1068', ngc[0] + 24, ngc[1] + 50, { color: th.fg, align: 'center', alpha: a });
          txt(g, L('km3'), 20, h - 28, { color: th.fg, alpha: 0.85 * a });
          if (!narrow) txt(g, L('equatorial'), w - 20, h - 28, { color: th.fg, align: 'right', alpha: 0.6 * a });
        }

        // ------------------------------------------------ SNEWS timeline
        if (lv.sn > 0.01) {
          const a = lv.sn;
          const x0 = 36;
          const x1 = w - 36;
          const yA = h * 0.62;
          const T0 = 1;
          const T1 = 1e5;
          const X = (t: number) => x0 + ((Math.log10(t) - Math.log10(T0)) / (Math.log10(T1) - Math.log10(T0))) * (x1 - x0);
          line(g, x0, yA, x1, yA, th.fg, 1, 0.6 * a);
          [[1, '1 s'], [10, '10 s'], [60, L('min')], [3600, L('hour')], [86400, L('day')]].forEach(([t, lab]) => {
            line(g, X(t as number), yA, X(t as number), yA + 5, th.fg, 1, 0.6 * a);
            txt(g, lab as string, X(t as number), yA + 18, { mono: true, color: th.fg, align: 'center', alpha: 0.75 * a });
          });
          txt(g, L('timeAxis'), x1, yA + 38, { color: th.fg, align: 'right', alpha: 0.8 * a });
          // neutrino burst
          g.save();
          g.globalAlpha = a;
          g.fillStyle = th.accent;
          g.fillRect(X(1), yA - 14, X(12) - X(1), 10);
          g.restore();
          txt(g, L('burst'), X(1), narrow ? yA + 58 : yA - 56, { color: th.accent, alpha: a });
          txt(g, L('burst2'), X(1), narrow ? yA + 76 : yA - 38, { color: th.fg, alpha: 0.8 * a });
          // alert
          line(g, X(60), yA, X(60), yA - 120, th.accent2, 1.4, a);
          txt(g, L('alert'), X(60) + 8, yA - 120, { color: th.accent2, alpha: a });
          txt(g, L('alert2'), X(60) + 8, yA - 102, { color: th.fg, alpha: 0.8 * a });
          // light
          g.save();
          g.globalAlpha = 0.9 * a;
          g.fillStyle = th.fg;
          g.fillRect(X(3600), yA - 14, X(43200) - X(3600), 10);
          g.restore();
          txt(g, L('light'), narrow ? x1 : X(3600), yA - 28, { color: th.fg, align: narrow ? 'right' : 'left', alpha: 0.95 * a });
          void clamp;
        }
      },
    });
  },
};
export default mod;

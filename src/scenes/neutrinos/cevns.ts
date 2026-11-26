/**
 * nu.cevns — P9 walkthrough of coherent elastic neutrino-nucleus scattering (COHERENT, CsI at the SNS).
 *   goal     : 1974 -> 2017 timeline (43 years).
 *   target   : 20 m from source to crystal (NU.COHERENT_BASELINE_M); SNS neutrino timing: prompt nu_mu (30 MeV, from pi+ decay,
 *              follows the 0.7 us proton pulse), delayed nu_mu-bar and nu_e (mu+ decay, tau = 2.2 us, up to 52.8 MeV). Pulses repeat at 60 Hz.
 *   coherent : nucleus of 133 nucleons (78 neutrons, 55 protons; Cs-133). Neutrino wavelength lambda = hc / E = 1240 MeV fm / 30 MeV = 41 fm
 *              vs a nuclear diameter of ~12 fm: ratio drawn to scale (3.4). Weak charge Q_W ~ N, so sigma ~ N^2.
 *   recoil   : T_max = 2 E^2 / M = 14.5 keV for 30 MeV on Cs (M = 123.8 GeV). Energies on a log axis. CsI(Na) light: about 1 photoelectron
 *              per keV of nuclear recoil, so a handful per event.
 *   rate     : schematic recoil spectrum: sum over the neutrino energy spectra of (1 - T M / 2E^2), times the Helm form factor
 *              F^2(q) = [3 j1(qR)/(qR)]^2, q = sqrt(2 M T), R = 5.9 fm; detected = times an efficiency that turns on at ~5 keV.
 *   fog      : same formula for 8B solar neutrinos on xenon (M = 122 GeV, E up to ~15 MeV, T_max ~ 3.7 keV) against an exponential
 *              light-WIMP-like recoil spectrum; both normalised to their own peak (shapes only).
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, clamp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { NU } from '../../data/neutrinos';
import { createStage, arrow, dim, dot, glow, line, poly, ring, txt, ray } from './_n2-common';

const STATES = ['goal', 'target', 'coherent', 'recoil', 'rate', 'fog'] as const;
type P = { goal: number; target: number; coh: number; rec: number; rate: number; fog: number };
const one = (k: keyof P): P => ({ goal: 0, target: 0, coh: 0, rec: 0, rate: 0, fog: 0, [k]: 1 });
const TARGETS: Record<string, P> = { goal: one('goal'), target: one('target'), coherent: one('coh'), recoil: one('rec'), rate: one('rate'), fog: one('fog') };

const M_CS = 123800; // MeV
const M_XE = 122300;
const R_FM = 5.9;
const HC = 197.327;
const j1 = (x: number) => (x < 1e-3 ? x / 3 : Math.sin(x) / (x * x) - Math.cos(x) / x);
const helm2 = (T: number, M: number) => {
  const q = Math.sqrt(2 * M * T) / HC; // fm^-1 (T in MeV)
  const x = q * R_FM;
  return x < 1e-3 ? 1 : (3 * j1(x) / x) ** 2;
};
/** SNS flux shapes in x = E / 52.8 MeV */
const michelNue = (x: number) => (x >= 0 && x <= 1 ? 12 * x * x * (1 - x) : 0);
const michelNuMuBar = (x: number) => (x >= 0 && x <= 1 ? 2 * x * x * (3 - 2 * x) : 0);
/** recoil spectrum for a neutrino energy distribution; T in keV */
function recoilSpec(Tk: number, M: number, flux: (E: number) => number, Emax: number) {
  const T = Tk / 1000;
  const Emin = Math.sqrt((T * M) / 2);
  if (Emin >= Emax) return 0;
  let s = 0;
  const n = 120;
  for (let i = 0; i < n; i++) {
    const E = Emin + ((Emax - Emin) * (i + 0.5)) / n;
    s += flux(E) * Math.max(0, 1 - (T * M) / (2 * E * E));
  }
  return (s * (Emax - Emin)) / n * helm2(T, M);
}
const sns = (Tk: number) => {
  const a = recoilSpec(Tk, M_CS, (E) => michelNue(E / 52.8), 52.8);
  const b = recoilSpec(Tk, M_CS, (E) => michelNuMuBar(E / 52.8), 52.8);
  const T = Tk / 1000;
  const E0 = 29.65;
  const c = E0 * E0 * 2 > T * M_CS ? (1 - (T * M_CS) / (2 * E0 * E0)) * 4 * helm2(T, M_CS) : 0; // prompt line, weight ~ one flux unit
  return a * 0.1 + b * 0.1 + c;
};
const B8 = (E: number) => (E < 15 ? Math.pow(E, 2.5) * Math.pow(1 - E / 15.5, 2.5) : 0);
const fogNu = (Tk: number) => recoilSpec(Tk, M_XE, B8, 15.5);
const fogDm = (Tk: number) => Math.exp(-Tk / 0.9) * helm2(Tk / 1000, M_XE);
const eff = (Tk: number) => smooth(3, 8, Tk);

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const rnd = mulberry32(133);
    const NN = 78;
    const NP = 55;
    const order = Array.from({ length: NN + NP }, (_, i) => i).sort(() => rnd() - 0.5);
    const isN = new Set(order.slice(0, NN));
    const nuc = Array.from({ length: NN + NP }, (_, i) => {
      const r = Math.sqrt((i + 0.5) / (NN + NP));
      const a = i * 2.39996;
      return { x: r * Math.cos(a), y: r * Math.sin(a), n: isN.has(i) };
    });
    const sNorm = Math.max(...Array.from({ length: 80 }, (_, i) => sns(0.5 + i * 0.6)));
    const fogNuMax = Math.max(...Array.from({ length: 200 }, (_, i) => fogNu(0.05 + i * 0.05)));
    const fogDmMax = Math.max(...Array.from({ length: 200 }, (_, i) => fogDm(0.05 + i * 0.05)));
    const photons = Array.from({ length: 6 }, () => [rnd() - 0.5, rnd() - 0.5, rnd()] as const);

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { goal: 2, target: 4, coherent: 1e9, recoil: 5, rate: 2, fog: 2 },
      draw(g, s, lv, env) {
        const { w, h } = s;
        const narrow = w < 520;
        const fin = env.ts >= 1e3;
        const ts = env.ts;

        // ------------------------------------------------ goal
        if (lv.goal > 0.01) {
          const a = lv.goal;
          const x0 = 40;
          const x1 = w - 40;
          const y = h * 0.5;
          const TX = (yr: number) => x0 + ((x1 - x0) * (yr - 1970)) / 50;
          const grow = fin ? 1 : smooth(0, 1.5, ts);
          line(g, x0, y, x0 + (x1 - x0) * grow, y, th.fg, 1, 0.6 * a);
          [1970, 1980, 1990, 2000, 2010, 2020].forEach((yr) => {
            line(g, TX(yr), y, TX(yr), y + 5, th.fg, 1, 0.6 * a);
            txt(g, String(yr), TX(yr), y + 18, { mono: true, color: th.fg, align: 'center', alpha: 0.7 * a });
          });
          const k1 = smooth(0.2, 0.6, fin ? 9 : ts / 1.5 * 1);
          const k2 = fin ? 1 : smooth(1.1, 1.5, ts);
          line(g, TX(1974), y, TX(1974), y - 60, th.accent2, 1.2, a * k1);
          dot(g, TX(1974), y, 4, th.accent2, a * k1);
          txt(g, '1974', TX(1974), y - 74, { mono: true, color: th.accent2, align: 'left', alpha: a * k1 });
          txt(g, L('predicted'), TX(1974), y - 92, { color: th.fg, align: 'left', alpha: a * k1 });
          line(g, TX(2017), y, TX(2017), y - 60, th.accent, 1.6, a * k2);
          dot(g, TX(2017), y, 4.5, th.accent, a * k2);
          txt(g, '2017', TX(2017), y - 74, { mono: true, color: th.accent, align: 'right', alpha: a * k2 });
          txt(g, L('observed'), TX(2017), y - 92, { color: th.fg, align: 'right', alpha: a * k2 });
          txt(g, L('sns'), TX(2017), y + (narrow ? 70 : 52), { color: th.fg, align: 'right', alpha: 0.85 * a * k2 });
          g.save();
          g.globalAlpha = a * k2;
          dim(g, TX(1974), y + 36, TX(2017), y + 36, `43 ${L('years')}`, th.fg, 0.7, true, -14);
          g.restore();
        }

        // ------------------------------------------------ target: source, crystal, timing
        if (lv.target > 0.01) {
          const a = lv.target;
          const y0 = 54;
          const sx = 50;
          const cxl = w - 90;
          // source
          g.save();
          g.globalAlpha = a;
          g.strokeStyle = th.fg;
          g.strokeRect(sx - 26, y0 - 14, 52, 38);
          g.strokeStyle = th.accent;
          g.strokeRect(cxl - 18, y0 - 12, 36, 34);
          g.restore();
          txt(g, L('source'), sx, y0 + 42, { color: th.fg, align: 'center', alpha: 0.9 * a });
          txt(g, L('crystal'), cxl, y0 + 42, { color: th.accent, align: 'center', alpha: a });
          for (let i = -2; i <= 2; i++) line(g, sx + 28, y0 + 5 + i * 5, cxl - 20, y0 + 5 + i * 3, th.fg, 1, 0.5 * a, [5, 4]);
          g.save();
          g.globalAlpha = a;
          dim(g, sx, y0 + 62, cxl, y0 + 62, `≈ ${f0(NU.COHERENT_BASELINE_M.value as number)} m`, th.fg, 0.8, true, 6);
          g.restore();
          // timing plot
          const R = { x: 52, y: y0 + 100, w: w - 82, h: Math.max(60, h - (y0 + 100) - (narrow ? 50 : 64)) };
          const p = plot(g, ctx, R, { min: 0, max: 12, label: L('timeAxis'), ticks: [0, 2, 4, 6, 8, 10, 12].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 1.15, label: L('flux'), ticks: [] });
          g.save();
          g.globalAlpha = a;
          p.axes();
          const T_P = 0.7;
          const tau = 2.2;
          const prompt = (t: number) => (t >= 0 && t <= T_P ? 1 : 0);
          const delayed = (t: number) => (t < 0 ? 0 : t < T_P ? (1 - Math.exp(-t / tau)) * 2.6 : (1 - Math.exp(-T_P / tau)) * Math.exp(-(t - T_P) / tau) * 2.6);
          const reveal = fin ? 12 : Math.min(12, (ts / 3) * 12);
          const pts = (f: (t: number) => number, lim: number) => Array.from({ length: 241 }, (_, i) => [(i / 240) * lim, f((i / 240) * lim)] as [number, number]);
          const lim = Math.max(0.01, reveal);
          p.path(pts(prompt, lim).map(([t, v]) => [t, v] as [number, number]), { color: th.accent, width: 1.8 });
          p.path(pts(delayed, lim), { color: th.accent2, width: 1.5 });
          p.text(1.2, 1.0, `${L('prompt')}`, { align: 'left', color: th.accent });
          p.text(3.2, 0.66, L('delayed'), { align: 'left', color: th.accent2 });
          g.restore();
          if (!narrow) txt(g, L('pulses'), R.x + R.w, R.y + R.h + 50, { color: th.fg, align: 'right', alpha: 0.85 * a });
        }

        // ------------------------------------------------ coherent
        if (lv.coh > 0.01) {
          const a = lv.coh;
          const D = Math.min(160, w * 0.2);
          const cx = w * 0.5;
          const cy = narrow ? h * 0.42 : h * 0.36;
          const ph = fin ? 0.6 : env.t * 2.2;
          const lam = 3.4 * D;
          const disp = 5 * Math.sin(ph * 2 - 0); // px, same for every nucleon (coherent)
          nuc.forEach((q) => {
            const x = cx + (q.x * D) / 2 + disp;
            const y = cy + (q.y * D) / 2;
            if (q.n) {
              dot(g, x, y, 3.4, th.accent2, a);
              arrow(g, x - 6, y, x + 6, y, th.fg, 1, 0.9 * a, 3);
            } else ring(g, x, y, 3.2, th.fg, 1, 0.6 * a);
          });
          ring(g, cx + disp, cy, D / 2 + 6, th.fg, 1, 0.25 * a, [3, 4]);
          // neutrino wave under the nucleus
          const wy = cy + D / 2 + 56;
          g.save();
          g.strokeStyle = th.fg;
          g.globalAlpha = 0.75 * a;
          g.lineWidth = 1;
          g.beginPath();
          for (let x = 20; x <= w - 20; x += 3) {
            const yy = wy - 16 * Math.sin(((2 * Math.PI) / lam) * (x - cx) - ph * 2);
            x === 20 ? g.moveTo(x, yy) : g.lineTo(x, yy);
          }
          g.stroke();
          g.restore();
          // wavelength bracket: one full wave from the nucleus centre
          g.save();
          g.globalAlpha = a;
          dim(g, cx - lam / 2, wy + 34, cx + lam / 2, wy + 34, `λ ≈ 41 fm`, th.fg, 0.9, true, 6);
          dim(g, cx - D / 2, cy + D / 2 + 20, cx + D / 2, cy + D / 2 + 20, narrow ? '12 fm' : 'nucleus ≈ 12 fm', th.fg, 0.9, true, 4);
          g.restore();
          txt(g, L('wave'), 24, wy - 28, { color: th.fg, alpha: 0.9 * a });
          // legend
          const lx = narrow ? 14 : w - 230;
          const ly = 16;
          dot(g, lx, ly, 3.4, th.accent2, a);
          txt(g, `${NN} ${L('neutrons')}`, lx + 10, ly, { color: th.fg, alpha: 0.9 * a });
          ring(g, lx, ly + 18, 3.2, th.fg, 1, 0.7 * a);
          txt(g, `${NP} ${L('protons')}`, lx + 10, ly + 18, { color: th.fg, alpha: 0.9 * a });
          txt(g, 'σ ∝ N²', narrow ? w - 14 : lx, narrow ? ly : ly + 44, { mono: true, color: th.accent, align: narrow ? 'right' : 'left', alpha: a });
        }

        // ------------------------------------------------ recoil
        if (lv.rec > 0.01) {
          const a = lv.rec;
          const wide = w > h * 1.05 && !narrow;
          const ax = 18;
          const ay = 26;
          const aw = wide ? w * 0.46 : w - 36;
          const ah = wide ? h - 60 : h * 0.44;
          const bx = ax + aw * 0.4;
          const by = wide ? h * 0.42 : ay + ah * 0.38;
          const bw2 = narrow ? 100 : 150;
          const bh2 = narrow ? 76 : 110;
          g.save();
          g.globalAlpha = 0.14 * a;
          g.fillStyle = th.accent2;
          g.fillRect(bx - bw2 / 2, by - bh2 / 2, bw2, bh2);
          g.restore();
          g.save();
          g.globalAlpha = a;
          g.strokeStyle = th.fg;
          g.strokeRect(bx - bw2 / 2, by - bh2 / 2, bw2, bh2);
          g.restore();
          txt(g, L('crystalLabel'), bx, by - bh2 / 2 - 12, { color: th.fg, align: 'center', alpha: 0.9 * a });
          const u = fin ? 1 : smooth(0.3, 1.2, ts);
          line(g, ax, by, bx - 6, by, th.fg, 1, 0.7 * a, [5, 4]);
          txt(g, 'ν', ax + 2, by - 12, { color: th.fg, alpha: 0.9 * a });
          dot(g, bx + 8 * u, by - 3 * u, 4, th.accent, a);
          ring(g, bx, by, 4, th.fg, 1, 0.5 * a, [2, 2]);
          arrow(g, bx + 5, by - 1, bx + 5 + 14 * u, by - 4 * u, th.accent, 1.2, a * u, 5);
          txt(g, L('recoilNote'), bx - bw2 / 2, by + bh2 / 2 + 16, { color: th.accent, alpha: a * u });
          // photons to the PMT
          const px = bx + bw2 / 2 + 36;
          g.save();
          g.globalAlpha = a;
          g.strokeStyle = th.fg;
          g.strokeRect(px, by - 22, 22, 44);
          g.restore();
          txt(g, 'PMT', px + 11, by + 38, { mono: true, color: th.fg, align: 'center', alpha: 0.9 * a });
          photons.forEach(([dx, dy, d], i) => {
            const t = fin ? 1 : clamp((ts - 1.0 - i * 0.15) / 1.2);
            if (t <= 0) return;
            const x = bx + 10 + (px - bx - 10) * t + dx * 6;
            const y = by + (dy * 20) * (1 - t) + dy * 20 * t;
            glow(g, x, y, 5, th.accent2, 0.9 * a);
            void d;
          });
          txt(g, L('photons'), bx - bw2 / 2, by + bh2 / 2 + 36, { color: th.accent2, alpha: a * (fin ? 1 : smooth(1.4, 2.2, ts)) });
          // log energy bars
          const cxs = wide ? ax + aw + 24 : ax + 8;
          const cys = wide ? by - 50 : ay + ah + (narrow ? 14 : 24);
          const cw = wide ? w - cxs - 56 : w - 72;
          const E0 = 1e-3;
          const E1 = 100; // MeV
          const EX = (e: number) => cxs + ((Math.log10(e) - Math.log10(E0)) / (Math.log10(E1) - Math.log10(E0))) * cw;
          const rowH = narrow ? 20 : 26;
          const gy = cys + (narrow ? 12 : 20);
          const k = fin ? 1 : smooth(1.5, 3, ts);
          [1e-3, 1e-2, 1e-1, 1, 10, 100].forEach((e, i) => {
            if (narrow && i % 2 === 1) return;
            line(g, EX(e), gy + 3 * rowH - 6, EX(e), gy + 3 * rowH - 2, th.fg, 1, 0.6 * a);
            txt(g, ['1 keV', '10 keV', '100 keV', '1 MeV', '10 MeV', '100 MeV'][i], EX(e), gy + 3 * rowH + 8, { mono: true, color: th.fg, align: 'center', alpha: 0.65 * a });
          });
          line(g, cxs, gy + 3 * rowH - 6, cxs + cw, gy + 3 * rowH - 6, th.fg, 1, 0.45 * a);
          const bar = (e0: number, e1: number, row: number, c: string, label: string) => {
            const xa = EX(e0);
            const xb = xa + (EX(e1) - xa) * k;
            g.save();
            g.globalAlpha = 0.85 * a;
            g.fillStyle = c;
            g.fillRect(xa, gy + row * rowH, Math.max(2, xb - xa), 10);
            g.restore();
            txt(g, label, xa, gy + row * rowH - 8, { color: th.fg, alpha: 0.95 * a });
          };
          bar(E0, 30, 0, th.fg, L('nuEnergy'));
          bar(1e-3, 1e-2, 1.8, th.accent, L('recoilEnergy'));
          txt(g, L('ratio'), cxs + cw, gy - 18, { color: th.fg, align: 'right', alpha: 0.8 * a * k });
        }

        // ------------------------------------------------ rate
        if (lv.rate > 0.01) {
          const a = lv.rate;
          const R = { x: 52, y: 30, w: Math.max(100, w - 80), h: h - 100 };
          const p = plot(g, ctx, R, { min: 0, max: 40, label: L('tAxis'), ticks: [0, 10, 20, 30, 40].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 1.1, label: L('events'), ticks: [] });
          g.save();
          g.globalAlpha = a;
          p.axes();
          p.curve((x) => sns(Math.max(0.3, x)) / sNorm, { color: th.fg, dash: [4, 4], width: 1, alpha: 0.55 }, 160);
          const bw = 2;
          const grow = fin ? 1 : smooth(0, 1.5, ts);
          for (let e = 0; e < 40; e += bw) {
            const v = ((sns(e + bw / 2) * eff(e + bw / 2)) / sNorm) * grow;
            const x0 = p.X(e) + 1;
            const x1 = p.X(e + bw) - 1;
            g.save();
            g.globalAlpha = 0.6 * a;
            g.fillStyle = th.accent;
            g.fillRect(x0, p.Y(v), x1 - x0, p.Y(0) - p.Y(v));
            g.restore();
          }
          p.vline(5, { color: th.fg, dash: [3, 3], alpha: 0.7 });
          p.text(5.6, 1.02, L('threshold'), { align: 'left' });
          p.text(13, 0.5, L('theory'), { align: 'left', alpha: 0.8 });
          p.text(13, 0.38, L('detected'), { align: 'left', color: th.accent });
          g.restore();
        }

        // ------------------------------------------------ fog
        if (lv.fog > 0.01) {
          const a = lv.fog;
          const R = { x: 52, y: 40, w: Math.max(100, w - 80), h: h - 120 };
          const p = plot(g, ctx, R, { min: 0.1, max: 10, log: true, label: L('tAxisLog'), ticks: [0.1, 1, 10].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 1.15, label: L('rateRel'), ticks: [] });
          g.save();
          g.globalAlpha = a;
          p.axes();
          const nu = (x: number) => fogNu(x) / fogNuMax;
          const dm = (x: number) => fogDm(x) / fogDmMax;
          p.band(() => 0, (x) => Math.min(nu(x), dm(x)), th.accent2, 0.22, 700);
          p.curve(nu, { color: th.accent, width: 1.8 }, 200);
          p.curve(dm, { color: th.fg, width: 1.5, dash: [5, 4] }, 200);
          p.text(1.3, 1.05, L('solarNu'), { align: 'left', color: th.accent });
          p.text(1.3, 0.92, narrow ? L('dmLikeS') : L('dmLike'), { align: 'left' });
          p.text(0.14, 0.3, L('fog'), { align: 'left', color: th.accent2 });
          g.restore();
          void poly;
          void ray;
        }
      },
    });
  },
};
export default mod;

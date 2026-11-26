/**
 * dm.exclusion — P8 schematic exclusion plot: WIMP mass (GeV, log) against spin-independent cross-section (cm^2, log).
 * No real limits. Each curve is the sketch  sigma(m) = s_min * (1 + m / 40 GeV) / 2 * (1 + (m_th / m)^4):
 *   - at high mass the number density falls as 1/m, so the limit rises in proportion to m (slope +1 on the log-log plot),
 *   - at low mass the recoil energy drops below the threshold, so the limit rises steeply (m_th = lowest mass that still gives a
 *     detectable recoil; it moves down with better thresholds),
 *   - the minimum sits near 30-50 GeV, where the WIMP mass matches the xenon nucleus (~120 GeV) well enough.
 * Generations: s_min = 1e-38, 1e-41, 1e-44, 3e-47 cm^2, and a dashed "next" curve at 5e-49 (projected).
 * Neutrino fog: top edge F(m) = 10^-48.6 (1 + 300 / (1 + (m/2)^3)) (1 + m/80) cm^2 (solar 8B neutrinos at low mass,
 * atmospheric neutrinos at high mass): a shape for orientation, not a calculation.
 *   axes : one sample curve, excluded above, allowed below.  early : one high curve.  improving : curves step down in turn.
 *   neutrino-fog : the lowest curve meets the fog floor.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, clamp } from '../shared/canvas2d';
import { plot, plotRect, FONT_SANS } from '../shared/plot';
import { txt } from '../common/_draw';

const STATES = ['axes', 'early', 'improving', 'neutrino-fog'] as const;
type St = (typeof STATES)[number];
const sup = (n: number) => String(n).replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);

const M0 = 0.1;
const M1 = 1e4;
const S0 = 1e-50;
const S1 = 1e-34;
const GENS = [
  { smin: 1e-38, mth: 25, key: 'g1', dash: false },
  { smin: 1e-41, mth: 12, key: 'g2', dash: false },
  { smin: 1e-44, mth: 6, key: 'g3', dash: false },
  { smin: 3e-47, mth: 3.5, key: 'g4', dash: false },
  { smin: 6e-49, mth: 1.5, key: 'g5', dash: true },
];
const sigma = (k: number, m: number) => GENS[k].smin * ((1 + m / 40) / 2) * (1 + Math.pow(GENS[k].mth / m, 4));
const fog = (m: number) => 10 ** -48.6 * (1 + 300 / (1 + Math.pow(m / 2, 3))) * (1 + m / 80);
const lg = Math.log10;

const TARGET: Record<St, { v: number[]; fog: number; delay: number }> = {
  axes: { v: [0, 1, 0, 0, 0], fog: 0, delay: 0 },
  early: { v: [1, 0, 0, 0, 0], fog: 0, delay: 0 },
  improving: { v: [1, 1, 1, 1, 0], fog: 0, delay: 0.9 },
  'neutrino-fog': { v: [1, 1, 1, 1, 1], fog: 1, delay: 0 },
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const vis = [0, 0, 0, 0, 0];
    const prog = [0, 0, 0, 0, 0];
    let fogL = 0;
    let state: St = 'axes';
    let t0 = 0;
    let now = 0;

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      now = s.t;
      const ts = now - t0;
      const T = TARGET[state];
      const firstVisit = state === 'improving' && !ctx.reducedMotion;
      for (let k = 0; k < 5; k++) {
        // curves appear one after another in "improving" (the first one is already there)
        const on = T.v[k] === 1 && (!firstVisit || ts >= k * T.delay - (k === 0 ? 99 : 0) || vis[k] > 0.5) ? 1 : 0;
        vis[k] = approach(vis[k], on, s.dt, 0.5);
        prog[k] = approach(prog[k], on, s.dt, 0.7);
      }
      fogL = approach(fogL, T.fog, s.dt, 0.6);

      const portrait = w / h < 1;
      const r = plotRect(w, h, { l: portrait ? 62 : 80, r: 22, t: 30, b: 52 });
      const pl = plot(
        g,
        ctx,
        r,
        { min: M0, max: M1, log: true, label: L('xlabel'), ticks: [0.1, 1, 10, 100, 1000, 1e4].map((v) => ({ v, label: v >= 1000 ? `10${sup(Math.round(lg(v)))}` : ctx.formatNumber(v) })) },
        { min: S0, max: S1, log: true, ticks: [-38, -42, -46, -50].map((e) => ({ v: 10 ** e, label: `10${sup(e)}` })) },
      );
      pl.axes();
      // y axis title: rotated, with the sense of the axis
      g.save();
      g.translate(14, r.y + r.h / 2);
      g.rotate(-Math.PI / 2);
      g.font = FONT_SANS;
      g.fillStyle = th.fg;
      g.globalAlpha = 0.85;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${L('weaker')}   ←   ${L('ylabel')}   →   ${L('stronger')}`, 0, 0);
      g.restore();

      const NS = 180;
      const mAt = (i: number) => M0 * (M1 / M0) ** (i / NS);
      // excluded region: above the envelope of the visible curves
      const topLog = lg(S1);
      const env = (m: number) => {
        let e = topLog;
        for (let k = 0; k < 5; k++) if (vis[k] > 0.01) e = Math.min(e, topLog + (lg(sigma(k, m)) - topLog) * vis[k]);
        return e;
      };
      const anyVis = vis.some((v) => v > 0.01);
      if (anyVis) {
        g.save();
        g.globalAlpha = 0.16;
        g.fillStyle = th.accent;
        g.beginPath();
        let started = false;
        for (let i = 0; i <= NS; i++) {
          const m = mAt(i);
          const y = Math.max(r.y, Math.min(r.y + r.h, pl.Y(10 ** env(m))));
          if (!started) {
            g.moveTo(pl.X(m), y);
            started = true;
          } else g.lineTo(pl.X(m), y);
        }
        g.lineTo(r.x + r.w, r.y);
        g.lineTo(r.x, r.y);
        g.closePath();
        g.fill();
        g.restore();
      }
      // neutrino fog floor
      if (fogL > 0.01) {
        g.save();
        g.globalAlpha = 0.2 * fogL;
        g.fillStyle = th.fg;
        g.beginPath();
        g.moveTo(r.x, r.y + r.h);
        for (let i = 0; i <= NS; i++) {
          const m = mAt(i);
          g.lineTo(pl.X(m), Math.max(r.y, pl.Y(fog(m))));
        }
        g.lineTo(r.x + r.w, r.y + r.h);
        g.closePath();
        g.fill();
        g.restore();
        g.save();
        g.globalAlpha = 0.6 * fogL;
        g.strokeStyle = th.fg;
        g.lineWidth = 1;
        g.setLineDash([4, 3]);
        g.beginPath();
        for (let i = 0; i <= NS; i++) {
          const m = mAt(i);
          const y = Math.max(r.y, pl.Y(fog(m)));
          i ? g.lineTo(pl.X(m), y) : g.moveTo(pl.X(m), y);
        }
        g.stroke();
        g.restore();
        txt(g, L('fogSolar'), pl.X(0.13), pl.Y(10 ** -47.6), { color: th.fg, alpha: 0.9 * fogL });
        txt(g, L('fogAtm'), pl.X(2500), pl.Y(10 ** -49.7), { color: th.fg, align: 'center', alpha: 0.9 * fogL });
        txt(g, L('fog'), pl.X(0.13), pl.Y(10 ** -47.6) + 16, { color: th.fg, alpha: 0.6 * fogL });
      }
      // curves
      for (let k = 0; k < 5; k++) {
        if (vis[k] < 0.02) continue;
        g.save();
        g.strokeStyle = th.accent;
        g.lineWidth = 1.5;
        g.globalAlpha = Math.min(1, vis[k] * 1.4) * (GENS[k].dash ? 0.85 : 1);
        g.setLineDash(GENS[k].dash ? [5, 4] : []);
        g.beginPath();
        let pen = false;
        const lim = clamp(prog[k]) * NS;
        for (let i = 0; i <= NS && i <= lim; i++) {
          const m = mAt(i);
          const sg = sigma(k, m);
          if (sg > S1 || sg < S0) {
            pen = false;
            continue;
          }
          if (!pen) {
            g.moveTo(pl.X(m), pl.Y(sg));
            pen = true;
          } else g.lineTo(pl.X(m), pl.Y(sg));
        }
        g.stroke();
        g.restore();
        // direct label under the minimum
        if (state !== 'axes' && state !== 'early') txt(g, L(GENS[k].key), pl.X(30), pl.Y(sigma(k, 30)) + 14, { color: th.accent, align: 'center', alpha: vis[k] });
      }
      if (state === 'early') txt(g, L('g1'), pl.X(30), pl.Y(sigma(0, 30)) + 14, { color: th.accent, align: 'center', alpha: vis[0] });
      if (state === 'axes') txt(g, L('sample'), pl.X(30), pl.Y(sigma(1, 30)) + 14, { color: th.accent, align: 'center', alpha: vis[1] });
      // region labels
      const best = anyVis ? env(300) : lg(sigma(1, 300));
      const exA = Math.max(...vis);
      txt(g, L('excluded'), pl.X(600), Math.max(r.y + 12, pl.Y(10 ** (best + 1.6))), { color: th.accent, align: 'center', alpha: exA });
      txt(g, L('excluded2'), pl.X(600), Math.max(r.y + 28, pl.Y(10 ** (best + 1.6)) + 16), { color: th.accent, align: 'center', alpha: 0.75 * exA });
      if (state === 'axes') {
        txt(g, L('allowed'), pl.X(300), pl.Y(10 ** (best - 3)), { color: th.fg, align: 'center', alpha: 0.85 * exA });
        txt(g, L('allowed2'), pl.X(300), pl.Y(10 ** (best - 3)) + 16, { color: th.fg, align: 'center', alpha: 0.6 * exA });
      }
      if (state === 'early') txt(g, L('minNote'), pl.X(40), pl.Y(sigma(0, 40)) - 28, { color: th.fg, align: 'center', alpha: 0.8 * vis[0] });
    });
    c.animate = true;

    return {
      setState(st: string, o: SetStateOptions) {
        if (!(STATES as readonly string[]).includes(st)) return;
        state = st as St;
        t0 = now;
        if (o.immediate || ctx.reducedMotion) {
          const T = TARGET[state];
          for (let k = 0; k < 5; k++) {
            vis[k] = T.v[k];
            prog[k] = T.v[k];
          }
          fogL = T.fog;
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

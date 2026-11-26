/**
 * dm.technique-cards — P2: one small principle diagram per detection technique (cross-faded as the state changes).
 *   bolometer      : crystal on a thermometer; recoil -> phonons -> dT ~ 1 uK pulse; charge (or light) yield vs recoil energy.
 *                    NR yield from a Lindhard-like power law y = 0.16 E^0.18 (E in keV), ER yield = 1. Sketch, not a fit.
 *   ccd            : charge packet shuttled over a sense node; N readings of noise 3 e- each; the mean of N readings has noise
 *                    3/sqrt(N) e-, so the histogram sharpens into peaks at 0, 1, 2, 3 electrons (N = 1 ... 400). Populations exaggerated.
 *   bubble         : superheated liquid; a nuclear recoil packs its energy inside the critical radius, an electron recoil spreads it.
 *   nai-modulation : Earth's orbit seen from above; net speed 230 + 15 cos(2 pi (t - t0)/yr) km/s, t0 = 2 June (day 153); the same
 *                    phase drives the rate curve (amplitude exaggerated, a few percent in reality).
 *   argon-psd      : I(t) = f/tau_s exp(-t/tau_s) + (1-f)/tau_t exp(-t/tau_t), tau_s = 7 ns, tau_t = 1.6 us, f = 0.7 (NR), 0.3 (ER);
 *                    plotted as t I(t) (light per logarithmic time); F_prompt = light in the first 90 ns.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32, gaussian, clamp, smooth } from '../shared/canvas2d';
import { plot, FONT_SANS } from '../shared/plot';
import { arrow, dot, line, ring, txt, rect } from '../common/_draw';
import { glow, loopPhase, PALE, gauss, wrap } from './_dm2-common';

const STATES = ['bolometer', 'ccd', 'bubble', 'nai-modulation', 'argon-psd'] as const;
type St = (typeof STATES)[number];
interface R {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TAU_S = 7;
const TAU_T = 1600;
const T_WIN = 90;
const frac = (f: number) => f * (1 - Math.exp(-T_WIN / TAU_S)) + (1 - f) * (1 - Math.exp(-T_WIN / TAU_T));
const F_NR = 0.7;
const F_ER = 0.3;
const SIG1 = 3; // e-, noise of a single non-destructive reading
const NMAX = 400;
const T0_DAY = 153; // 2 June
const V_SUN = 230;
const V_ORB = 15; // km/s, projection of the orbital velocity on the Sun's motion
const MONTHS = ['Jan', 'Apr', 'Jul', 'Oct'];

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const rnd = mulberry32(17);
    const reads = Array.from({ length: NMAX }, () => 2 + SIG1 * gaussian(rnd));
    const cum: number[] = [];
    reads.reduce((a, v, i) => ((cum[i] = a + v), a + v), 0);
    const phon = Array.from({ length: 6 }, (_, i) => i);
    const lv: Record<string, number> = { bolometer: 1, ccd: 0, bubble: 0, 'nai-modulation': 0, 'argon-psd': 0 };
    let state: St = 'bolometer';
    let t0 = 0;
    let now = 0;
    let reveal = 0;

    const rects3 = (a: R, w: number, h: number): { r1: R; r2: R; r3: R; portrait: boolean } => {
      const portrait = w / h < 1.0;
      if (portrait) {
        const hh = a.h - 24;
        return {
          portrait,
          r1: { x: a.x, y: a.y, w: a.w, h: hh * 0.32 },
          r2: { x: a.x, y: a.y + hh * 0.32 + 12, w: a.w, h: hh * 0.27 },
          r3: { x: a.x, y: a.y + hh * 0.59 + 24, w: a.w, h: hh * 0.41 },
        };
      }
      const lw = (a.w - 24) * 0.5;
      return {
        portrait,
        r1: { x: a.x, y: a.y, w: lw, h: (a.h - 12) * 0.55 },
        r2: { x: a.x, y: a.y + (a.h - 12) * 0.55 + 12, w: lw, h: (a.h - 12) * 0.45 },
        r3: { x: a.x + lw + 24, y: a.y, w: a.w - lw - 24, h: a.h },
      };
    };

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      now = s.t;
      for (const k of STATES) lv[k] = approach(lv[k], k === state ? 1 : 0, s.dt, 0.35);
      reveal = approach(reveal, 1, s.dt, 1.2);
      const ts = now - t0;
      const area: R = { x: 16, y: 58, w: w - 32, h: h - 70 };

      const title = (key: string, sub: string, a: number) => {
        txt(g, L(key), 16, 20, { color: th.fg, alpha: 0.95 * a });
        txt(g, L(sub), 16 + 0, 36, { color: th.fg, alpha: 0.6 * a });
      };

      // ============ bolometer ============
      if (lv.bolometer > 0.02) {
        const A = lv.bolometer;
        title('t.bolo', 't.bolo.sub', A);
        const { r1, r2, r3, portrait } = rects3(area, w, h);
        const p = loopPhase(ts, 3.2, 1.6, ctx.reducedMotion);
        // crystal
        const cw = Math.min(r1.w * 0.38, 120);
        const ch = Math.min(r1.h * 0.6, 90);
        const cxx = r1.x + (portrait ? r1.w * 0.38 : r1.w * 0.4);
        const cyy = r1.y + r1.h * 0.52;
        rect(g, cxx - cw / 2, cyy - ch / 2, cw, ch, th.fg, 1.2, 0.8 * A, 0.07 * A);
        // thermometer on top, cold bath below
        rect(g, cxx - 10, cyy - ch / 2 - 8, 20, 8, th.accent, 1.2, 0.95 * A, 0.25 * A);
        line(g, cxx + 10, cyy - ch / 2 - 4, cxx + cw / 2 + 24, cyy - ch / 2 - 4, th.accent, 1, 0.7 * A);
        txt(g, L('t.thermo'), cxx + cw / 2 + 28, cyy - ch / 2 - 4, { color: th.accent, alpha: 0.9 * A });
        line(g, cxx, cyy + ch / 2, cxx, cyy + ch / 2 + 12, th.fg, 1, 0.6 * A, [2, 2]);
        rect(g, cxx - cw / 2 - 8, cyy + ch / 2 + 12, cw + 16, 6, th.fg, 1, 0.6 * A, 0.12 * A);
        txt(g, L('t.bath'), cxx + cw / 2 + 14, cyy + ch / 2 + 15, { color: th.fg, alpha: 0.75 * A });
        txt(g, L('t.crystal'), cxx - cw / 2 - 8, cyy, { color: th.fg, align: 'right', alpha: 0.8 * A });
        // light detector plate beside the crystal
        rect(g, cxx - cw / 2, cyy - ch / 2 - 22, cw, 5, th.fg, 1, 0.6 * A, 0.1 * A);
        txt(g, L('t.light'), cxx - cw / 2 - 8, cyy - ch / 2 - 19, { color: th.fg, align: 'right', alpha: 0.75 * A });
        // the recoil and its phonons
        const ex = cxx - cw * 0.1;
        const ey = cyy + ch * 0.1;
        const hit = smooth(0, 0.12, p);
        dot(g, ex, ey, 2.6, th.accent, hit * A);
        g.save();
        g.beginPath();
        g.rect(cxx - cw / 2, cyy - ch / 2, cw, ch);
        g.clip();
        for (const i of phon) {
          const q = clamp((p - 0.1 - i * 0.05) / 0.6);
          if (q > 0 && q < 1) ring(g, ex, ey, q * cw * 1.1, th.accent, 1, 0.55 * (1 - q) * A, [3, 3]);
        }
        g.restore();
        // photons upward (light channel)
        const lq = clamp((p - 0.1) / 0.3);
        if (lq > 0 && lq < 1) glow(g, ex + (cxx - ex) * 0.2, ey + (cyy - ch / 2 - 19 - ey) * lq, 7, 0.5 * (1 - lq) * A);
        // the temperature pulse (linear dT axis; baseline 10 mK)
        const pl2 = plot(g, ctx, { x: r2.x + 44, y: r2.y + 20, w: r2.w - 70, h: r2.h - 52 }, { min: 0, max: 20, label: L('t.ms'), ticks: [0, 10, 20].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 1.15, label: L('t.dT'), ticks: [] });
        g.save();
        g.globalAlpha = A;
        pl2.axes();
        const pulse = (t: number) => (Math.exp(-t / 5) - Math.exp(-t / 0.5)) / 0.78;
        pl2.curve(pulse, { color: th.accent, width: 1.5, progress: clamp(p / 0.8) });
        pl2.text(8, 0.8, L('t.pulse'), { alpha: 0.85 });
        g.restore();
        // yield plot
        const pl3 = plot(g, ctx, { x: r3.x + 44, y: r3.y + 26, w: r3.w - 66, h: r3.h - 74 }, { min: 1, max: 100, log: true, label: L('t.keV'), ticks: [1, 10, 100].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 1.3, label: L('t.yield'), ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }] });
        g.save();
        g.globalAlpha = A;
        pl3.axes();
        const nr = (e: number) => 0.16 * Math.pow(e, 0.18);
        const band = (fn: (e: number) => number, col: string, al: number, d: number) => {
          g.save();
          g.globalAlpha = al;
          g.fillStyle = col;
          g.beginPath();
          for (let i = 0; i <= 50; i++) {
            const e = 10 ** (i / 25);
            const x = pl3.X(e);
            const y = pl3.Y(fn(e) + d);
            i ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          for (let i = 50; i >= 0; i--) {
            const e = 10 ** (i / 25);
            g.lineTo(pl3.X(e), pl3.Y(fn(e) - d));
          }
          g.closePath();
          g.fill();
          g.restore();
        };
        band(() => 1, th.fg, 0.14, 0.09);
        band(nr, th.accent, 0.22, 0.05);
        pl3.curve(() => 1, { color: th.fg, width: 1, alpha: 0.6 });
        pl3.curve(nr, { color: th.accent, width: 1.2 });
        g.restore();
        txt(g, L('t.er'), pl3.X(1.3), pl3.Y(1) - 14, { color: th.fg, alpha: 0.9 * A });
        txt(g, L('t.nr'), pl3.X(1.3), pl3.Y(nr(1.3)) + 20, { color: th.accent, alpha: A });
        const mark = smooth(0.1, 0.4, p) * A;
        ring(g, pl3.X(10), pl3.Y(nr(10)), 5, th.accent, 1.4, mark);
        txt(g, L('t.event'), pl3.X(10) + 9, pl3.Y(nr(10)) + 12, { color: th.accent, alpha: mark });
      }

      // ============ skipper CCD ============
      if (lv.ccd > 0.02) {
        const A = lv.ccd;
        title('t.ccd', 't.ccd.sub', A);
        const { r1, r2, r3, portrait } = rects3(area, w, h);
        const dur = 7;
        const p = ctx.reducedMotion ? 1 : clamp((ts % (dur + 2.5)) / dur);
        const N = Math.max(1, Math.round(NMAX ** clamp(p / 0.95)));
        const sigN = SIG1 / Math.sqrt(N);
        // pixel row + sense node
        const cols = 7;
        const pw = Math.min(34, (r1.w - 110) / cols);
        const px0 = r1.x + 14;
        const py0 = r1.y + 16;
        const rows = portrait ? 2 : 3;
        for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) rect(g, px0 + cc * pw, py0 + rr * pw, pw - 2, pw - 2, th.fg, 1, 0.45 * A, 0.04 * A);
        const regY = py0 + rows * pw + 6;
        for (let cc = 0; cc < cols; cc++) rect(g, px0 + cc * pw, regY, pw - 2, pw * 0.6, th.fg, 1, 0.6 * A, 0.1 * A);
        const nodeX = px0 + cols * pw + 22;
        rect(g, nodeX, regY, 20, pw * 0.6, th.accent, 1.2, 0.95 * A, 0.3 * A);
        txt(g, L('t.sense'), nodeX + 10, regY + pw * 0.6 + 12, { color: th.accent, align: 'center', alpha: 0.9 * A });
        txt(g, L('t.pixels'), px0, py0 - 8, { color: th.fg, alpha: 0.75 * A });
        // the packet with 2 electrons shuttles between the last register cell and the sense node
        const cyc = ctx.reducedMotion ? 0.5 : (ts * 1.3) % 1;
        const sh = 0.5 - 0.5 * Math.cos(cyc * Math.PI * 2);
        const lastX = px0 + (cols - 1) * pw + pw / 2;
        const sx = lastX + (nodeX + 10 - lastX) * sh;
        for (let k = 0; k < 2; k++) dot(g, sx + (k - 0.5) * 5, regY + pw * 0.3, 2.2, th.accent, A);
        // event pixel highlight
        rect(g, px0 + 2 * pw, py0 + (rows - 1) * pw, pw - 2, pw - 2, th.accent, 1.2, 0.9 * A, 0.18 * A);
        for (let k = 0; k < 2; k++) dot(g, px0 + 2 * pw + pw * (0.35 + 0.3 * k), py0 + (rows - 1) * pw + pw * 0.5, 2, th.accent, A);
        txt(g, L('t.shuttle'), px0, regY + pw * 0.6 + 26, { color: th.fg, alpha: 0.7 * A });
        // readings
        const pr = { x: r2.x + 42, y: r2.y + 14, w: r2.w - 58, h: r2.h - 40 };
        const pl = plot(g, ctx, pr, { min: 0, max: NMAX, label: L('t.reading'), ticks: [0, 100, 200, 300, 400].map((v) => ({ v, label: String(v) })) }, { min: -4, max: 8, label: L('t.e'), ticks: [0, 2, 4, 6].map((v) => ({ v, label: String(v) })) });
        g.save();
        g.globalAlpha = A;
        pl.axes();
        for (const v of [0, 1, 2, 3]) pl.hline(v, { alpha: 0.18, dash: [2, 3] });
        g.restore();
        for (let i = 0; i < N; i++) dot(g, pl.X(i + 1), pl.Y(reads[i]), 1.3, th.fg, 0.5 * A);
        pl.path(
          Array.from({ length: Math.min(N, 200) }, (_, i) => {
            const n = Math.max(1, Math.round(((i + 1) / Math.min(N, 200)) * N));
            return [n, cum[n - 1] / n] as [number, number];
          }),
          { color: th.accent, width: 1.5, alpha: A },
        );
        txt(g, L('t.mean'), pl.X(Math.max(N, 60)) + 6, pl.Y(cum[N - 1] / N) - 10, { color: th.accent, alpha: A });
        // histogram of the measured charge for many pixels
        const hp = { x: r3.x + 30, y: r3.y + (portrait ? 18 : 40), w: r3.w - 48, h: r3.h - (portrait ? 56 : 100) };
        const pops = [0.72, 0.18, 0.07, 0.03];
        const bw = 0.2;
        const hx = plot(g, ctx, hp, { min: -1.5, max: 4.5, label: L('t.charge'), ticks: [0, 1, 2, 3, 4].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 0.5, label: L('t.frac'), ticks: [] });
        g.save();
        g.globalAlpha = A;
        hx.axes();
        g.restore();
        g.save();
        g.globalAlpha = 0.9 * A;
        g.strokeStyle = th.accent;
        g.lineWidth = 1.5;
        g.fillStyle = th.accent;
        g.beginPath();
        const m = 220;
        const pdf = (x: number) => pops.reduce((a, pk, k) => a + (pk * bw * Math.exp(-0.5 * ((x - k) / sigN) ** 2)) / (sigN * Math.sqrt(2 * Math.PI)), 0);
        for (let i = 0; i <= m; i++) {
          const x = -1.5 + (6 * i) / m;
          const y = hx.Y(Math.min(0.5, pdf(x)));
          i ? g.lineTo(hx.X(x), y) : g.moveTo(hx.X(x), y);
        }
        g.stroke();
        g.lineTo(hx.X(4.5), hx.Y(0));
        g.lineTo(hx.X(-1.5), hx.Y(0));
        g.closePath();
        g.globalAlpha = 0.18 * A;
        g.fill();
        g.restore();
        txt(g, `N = ${ctx.formatNumber(N)}`, hp.x + hp.w, hp.y - 14, { color: th.fg, align: 'right', mono: true, alpha: 0.9 * A });
        txt(g, `σ = ${ctx.formatNumber(sigN, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} e⁻`, hp.x + hp.w, hp.y + 4, { color: th.fg, align: 'right', mono: true, alpha: 0.9 * A });
        txt(g, L('t.single'), hp.x + 6, hp.y + hp.h + 34, { color: th.accent, alpha: A * smooth(0.6, 1, p) });
      }

      // ============ bubble chamber ============
      if (lv.bubble > 0.02) {
        const A = lv.bubble;
        title('t.bub', 't.bub.sub', A);
        const portrait = w / h < 1;
        const pw2 = portrait ? area.w : (area.w - 24) / 2;
        const ph2 = portrait ? (area.h - 14) / 2 : area.h;
        const p = loopPhase(ts, 3.4, 1.8, ctx.reducedMotion);
        for (let side = 0; side < 2; side++) {
          const nrSide = side === 0;
          const jx = area.x + (portrait ? 0 : side * (pw2 + 24));
          const jy = area.y + (portrait ? side * (ph2 + 14) : 0);
          const jw = Math.min(pw2 * 0.62, 220);
          const jh = Math.min(ph2 - 70, 300);
          const bx = jx + pw2 / 2 - jw / 2;
          const by = jy + 28;
          // jar
          g.save();
          g.globalAlpha = 0.8 * A;
          g.strokeStyle = th.fg;
          g.lineWidth = 1.2;
          g.beginPath();
          g.roundRect(bx, by, jw, jh, [4, 4, 22, 22]);
          g.stroke();
          g.globalAlpha = 0.1 * A;
          g.fillStyle = th.accent2;
          g.fill();
          g.restore();
          txt(g, L(nrSide ? 't.nrCase' : 't.erCase'), jx + pw2 / 2, jy + 10, { color: nrSide ? th.accent : th.fg, align: 'center', alpha: 0.95 * A });
          const ex = bx + jw * 0.5;
          const ey = by + jh * 0.58;
          const rc = Math.min(jw, jh) * 0.12;
          ring(g, ex, ey, rc, th.fg, 1, 0.55 * A, [3, 3]);
          const hit = smooth(0, 0.15, p);
          if (nrSide) {
            // short heavy track inside the critical radius
            line(g, ex - rc * 0.4, ey + rc * 0.3, ex + rc * 0.3, ey - rc * 0.2, th.accent, 3, 0.95 * hit * A);
            const q = smooth(0.25, 1, p);
            const rad = rc + (Math.min(jw, jh) * 0.34 - rc) * Math.sqrt(q);
            if (q > 0) {
              g.save();
              g.globalAlpha = 0.18 * A;
              g.fillStyle = th.fg;
              g.beginPath();
              g.arc(ex, ey, rad, 0, Math.PI * 2);
              g.fill();
              g.restore();
              ring(g, ex, ey, rad, th.fg, 1.2, 0.9 * A);
              g.save();
              g.globalAlpha = 0.5 * A;
              g.strokeStyle = th.fg;
              g.beginPath();
              g.arc(ex - rad * 0.3, ey - rad * 0.3, rad * 0.35, Math.PI * 1.1, Math.PI * 1.6);
              g.stroke();
              g.restore();
            }
            txt(g, L('t.bubble'), ex, by + jh + 16, { color: th.accent, align: 'center', alpha: A * smooth(0.5, 0.9, p) });
          } else {
            // long sparse track: ionization dots well apart
            const ang = -0.5;
            const len = jh * 0.8;
            const sx = ex - Math.cos(ang) * len * 0.5;
            const sy = ey - Math.sin(ang) * len * 0.5;
            const q = clamp(p / 0.35);
            line(g, sx, sy, sx + Math.cos(ang) * len * q, sy + Math.sin(ang) * len * q, th.fg, 1, 0.6 * A);
            for (let k = 0; k < 14; k++) {
              const u = k / 13;
              if (u <= q) dot(g, sx + Math.cos(ang) * len * u, sy + Math.sin(ang) * len * u, 1.5, th.fg, 0.8 * A);
            }
            txt(g, L('t.noBubble'), ex, by + jh + 16, { color: th.fg, align: 'center', alpha: A * smooth(0.5, 0.9, p) });
          }
          txt(g, L(nrSide ? 't.nrDense' : 't.erSparse'), jx + pw2 / 2, by + jh + 32, { color: th.fg, align: 'center', alpha: 0.7 * A });
        }
        if (!portrait) txt(g, L('t.crit'), area.x + pw2 + 12, area.y + 4, { color: th.fg, align: 'center', alpha: 0 });
        txt(g, L('t.super'), area.x + area.w, 20, { color: th.fg, align: 'right', alpha: 0.6 * A });
      }

      // ============ NaI annual modulation ============
      if (lv['nai-modulation'] > 0.02) {
        const A = lv['nai-modulation'];
        title('t.nai', 't.nai.sub', A);
        const pa = { ...area, h: area.h - 38 };
        const portrait = w / h < 1;
        const left: R = portrait ? { x: pa.x, y: pa.y, w: pa.w, h: pa.h * 0.5 } : { x: pa.x, y: pa.y, w: pa.w * 0.46, h: pa.h };
        const right: R = portrait ? { x: pa.x, y: pa.y + pa.h * 0.5 + 8, w: pa.w, h: pa.h * 0.5 - 8 } : { x: pa.x + pa.w * 0.5, y: pa.y, w: pa.w * 0.5, h: pa.h };
        const yearT = 12; // s per year in the animation
        const day = ctx.reducedMotion ? T0_DAY : (T0_DAY + (ts / yearT) * 365) % 365;
        const phi = (2 * Math.PI * (day - T0_DAY)) / 365;
        // orbit
        const R0 = Math.min(left.w * 0.3, left.h * 0.34);
        const ox = left.x + left.w * 0.5 - 6;
        const oy = left.y + left.h * 0.5;
        ring(g, ox, oy, R0, th.fg, 1, 0.5 * A);
        dot(g, ox, oy, 4, th.fg, 0.9 * A);
        txt(g, L('t.sun'), ox + 8, oy - 10, { color: th.fg, alpha: 0.85 * A });
        const th0 = -Math.PI / 2 + phi;
        const ex = ox + R0 * Math.cos(th0);
        const ey = oy - R0 * Math.sin(th0);
        dot(g, ex, ey, 3.4, th.accent, A);
        // Sun's galactic velocity
        const vl = Math.min(80, left.w * 0.22);
        arrow(g, ox - vl * 0.5, oy - R0 - 24, ox + vl * 0.5, oy - R0 - 24, th.fg, 1.2, 0.85 * A, 6);
        txt(g, L('t.vsun'), ox, oy - R0 - 36, { color: th.fg, align: 'center', alpha: 0.85 * A });
        // Earth's orbital velocity (30 km/s: 0.13 of the Sun's speed)
        const vo = (30 / V_SUN) * vl * 2;
        const dirx = -Math.sin(th0);
        const diry = -Math.cos(th0);
        arrow(g, ex, ey, ex + dirx * vo, ey + diry * vo, th.accent, 1.2, 0.95 * A, 5);
        // season labels
        const lab: [number, string][] = [[0, 't.jun'], [Math.PI / 2, 't.sep'], [Math.PI, 't.dec'], [(3 * Math.PI) / 2, 't.mar']];
        for (const [a, k] of lab) {
          const t2 = -Math.PI / 2 + a;
          const lx = ox + (R0 + 16) * Math.cos(t2);
          const ly = oy - (R0 + 16) * Math.sin(t2);
          line(g, ox + (R0 - 3) * Math.cos(t2), oy - (R0 - 3) * Math.sin(t2), ox + (R0 + 3) * Math.cos(t2), oy - (R0 + 3) * Math.sin(t2), th.fg, 1, 0.6 * A);
          txt(g, L(k), lx, ly + (Math.abs(Math.sin(t2)) > 0.9 ? Math.sign(-Math.sin(t2)) * -4 : 0), { color: th.fg, align: Math.cos(t2) > 0.5 ? 'left' : Math.cos(t2) < -0.5 ? 'right' : 'center', alpha: 0.75 * A });
        }
        const vnet = V_SUN + V_ORB * Math.cos(phi);
        txt(g, `v = ${ctx.formatNumber(vnet, { maximumFractionDigits: 0 })} km/s`, left.x + 4, left.y + left.h - 4, { color: th.accent, mono: true, alpha: A });
        // rate curve
        const pr = { x: right.x + 30, y: right.y + 28, w: right.w - 46, h: right.h - 80 };
        const rate = (d: number) => 1 + 0.1 * Math.cos((2 * Math.PI * (d - T0_DAY)) / 365);
        const pl = plot(g, ctx, pr, { min: 0, max: 365, label: L('t.date'), ticks: MONTHS.map((m, i) => ({ v: i * 91.25, label: m })) }, { min: 0.8, max: 1.2, label: L('t.rate'), ticks: [] });
        g.save();
        g.globalAlpha = A;
        pl.axes();
        pl.hline(1, { alpha: 0.3, dash: [3, 3] });
        pl.curve(rate, { color: th.accent, width: 1.5 });
        g.restore();
        pl.vline(T0_DAY, { alpha: 0.35 * A, dash: [2, 3] });
        pl.text(T0_DAY + 8, 1.17, L('t.peak'), { alpha: 0.85 * A });
        pl.text(T0_DAY + 182, 0.83, L('t.trough'), { alpha: 0.7 * A, align: 'center' });
        dot(g, pl.X(day), pl.Y(rate(day)), 3.6, th.accent, A);
        txt(g, L('t.exag'), pr.x + pr.w, pr.y - 14, { color: th.fg, align: 'right', alpha: 0.55 * A });
        wrap(g, L('t.claim'), area.x, area.y + area.h - 30, area.w, th.fg, 0.8 * A);
      }

      // ============ liquid argon pulse shape ============
      if (lv['argon-psd'] > 0.02) {
        const A = lv['argon-psd'];
        title('t.ar', 't.ar.sub', A);
        const portrait = w / h < 1;
        const ra: R = portrait ? { x: area.x, y: area.y, w: area.w, h: area.h * 0.5 - 6 } : { x: area.x, y: area.y, w: (area.w - 24) * 0.55, h: area.h };
        const rb: R = portrait ? { x: area.x, y: area.y + area.h * 0.5 + 10, w: area.w, h: area.h * 0.5 - 10 } : { x: area.x + ra.w + 24, y: area.y, w: area.w - ra.w - 24, h: area.h };
        const rv = clamp(reveal) * (ctx.reducedMotion ? 1 : 1);
        const pl = plot(g, ctx, { x: ra.x + 40, y: ra.y + 30, w: ra.w - 60, h: ra.h - 84 }, { min: 1, max: 10000, log: true, label: L('t.time'), ticks: [1, 10, 100, 1000, 10000].map((v) => ({ v, label: ctx.formatNumber(v) })) }, { min: 0, max: 0.34, label: L('t.light2'), ticks: [] });
        g.save();
        g.globalAlpha = A;
        pl.axes();
        g.restore();
        const tI = (f: number) => (t: number) => f * (t / TAU_S) * Math.exp(-t / TAU_S) + (1 - f) * (t / TAU_T) * Math.exp(-t / TAU_T);
        g.save();
        g.globalAlpha = 0.14 * A;
        g.fillStyle = th.fg;
        g.fillRect(pl.X(1), pl.rect.y, pl.X(T_WIN) - pl.X(1), pl.rect.h);
        g.restore();
        pl.vline(T_WIN, { alpha: 0.5 * A, dash: [3, 3] });
        txt(g, L('t.window'), pl.X(T_WIN) + 6, pl.rect.y + 8, { color: th.fg, alpha: 0.8 * A });
        pl.curve(tI(F_ER), { color: th.fg, width: 1.5, alpha: A, progress: rv });
        pl.curve(tI(F_NR), { color: th.accent, width: 1.5, alpha: A, progress: rv });
        txt(g, L('t.nrPulse'), pl.X(TAU_S * 1.3) + 8, pl.Y(F_NR * 0.37) - 4, { color: th.accent, alpha: A * smooth(0.5, 1, rv) });
        txt(g, L('t.erPulse'), pl.X(TAU_T) + 6, pl.Y((1 - F_ER) * 0.37) - 14, { color: th.fg, alpha: A * smooth(0.5, 1, rv) });
        txt(g, L('t.fast'), pl.X(TAU_S), pl.Y(0) + 38, { color: th.fg, align: 'center', alpha: 0.0 });
        // F_prompt distributions
        const hp = { x: rb.x + 36, y: rb.y + 30, w: rb.w - 56, h: rb.h - 84 };
        const hx = plot(g, ctx, hp, { min: 0, max: 1, label: L('t.fprompt'), ticks: [0, 0.5, 1].map((v) => ({ v, label: ctx.formatNumber(v, { minimumFractionDigits: 1 }) })) }, { min: 0, max: 1.15, label: L('t.events'), ticks: [] });
        g.save();
        g.globalAlpha = A;
        hx.axes();
        g.restore();
        const fN = frac(F_NR);
        const fE = frac(F_ER);
        const dist = (mu: number, sg: number, col: string, fillA: number) => {
          g.save();
          g.beginPath();
          const m = 120;
          for (let i = 0; i <= m; i++) {
            const x = i / m;
            const y = hx.Y(gauss(x, mu, sg));
            i ? g.lineTo(hx.X(x), y) : g.moveTo(hx.X(x), y);
          }
          g.strokeStyle = col;
          g.lineWidth = 1.5;
          g.globalAlpha = A;
          g.stroke();
          g.lineTo(hx.X(1), hx.Y(0));
          g.lineTo(hx.X(0), hx.Y(0));
          g.closePath();
          g.fillStyle = col;
          g.globalAlpha = fillA * A;
          g.fill();
          g.restore();
        };
        dist(fE, 0.06, th.fg, 0.14);
        dist(fN, 0.07, th.accent, 0.2);
        const cut = (fE + fN) / 2;
        hx.vline(cut, { alpha: 0.55 * A, dash: [3, 3] });
        txt(g, L('t.erF'), hx.X(fE) - 8, hx.Y(1) - 2, { color: th.fg, align: 'right', alpha: 0.9 * A });
        txt(g, L('t.nrF'), hx.X(fN) + 8, hx.Y(1) - 2, { color: th.accent, alpha: A });
        txt(g, L('t.cut'), hx.X(cut), hx.rect.y + hx.rect.h + 36, { color: th.fg, align: 'center', alpha: 0 });
        wrap(g, L('t.reject'), hx.X(cut), hx.Y(0.55), 84, th.fg, 0.75 * A, 14, 'center');
      }
      g.font = FONT_SANS;
    });
    c.animate = true;

    return {
      setState(st: string, o: SetStateOptions) {
        if (!(STATES as readonly string[]).includes(st)) return;
        state = st as St;
        t0 = now;
        reveal = o.immediate || ctx.reducedMotion ? 1 : 0;
        if (o.immediate || ctx.reducedMotion) for (const k of STATES) lv[k] = k === state ? 1 : 0;
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

/**
 * dm.backgrounds — P2: why dark-matter detectors sit underground and why the quiet centre of the detector is the signal region.
 *   muons         : mountain cross-section; each muon track is drawn through the whole rock with an opacity that follows the
 *                   LOG of the surviving flux, so the line fades as the flux falls. Right: flux against depth in metres of water
 *                   equivalent, interpolated (log-linear) through order-of-magnitude values: sea level 1.7e-2 cm-2 s-1 (about
 *                   1 per cm2 per minute), 2.1 km w.e. ~ 2e-7, 3.4 km w.e. (Gran Sasso) ~ 2.5e-8, 6 km w.e. ~ 3e-10.
 *                   The one muon that reaches the cavern is an illustrative survivor, tagged by the water tank (Cherenkov light).
 *   radioactivity : gamma rays from the walls (U, Th, K) are absorbed exponentially, with perpendicular depth ~ Exp(lambda),
 *                   lambda = 5 cm in liquid xenon (order of magnitude), in a 130 cm wide detector. The outer 20 cm are cut away
 *                   (fiducial volume). Counters come from the drawn sample (seeded), the plot shows exp(-d / lambda).
 *                   Radon and krypton are inside the xenon: they are not shielded and are separated by the S2/S1 trick instead.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D, approach, mulberry32, clamp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { DM } from '../../data/dark-matter';
import { arrow, dot, line, ring, txt, rect } from '../common/_draw';
import { glow, wrap, loopPhase } from './_dm2-common';

const STATES = ['muons', 'radioactivity'] as const;
type St = (typeof STATES)[number];
const sup = (n: number) => String(n).replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);

// depth in km w.e. -> log10 flux (cm-2 s-1)
const TAB: [number, number][] = [
  [0, -1.77],
  [0.5, -4.0],
  [1, -5.0],
  [2.1, -6.7],
  [3.4, -7.6],
  [4.3, -8.3],
  [6, -9.5],
];
const logFlux = (kmwe: number) => {
  const x = clamp(kmwe, 0, 6);
  for (let i = 1; i < TAB.length; i++) {
    if (x <= TAB[i][0]) {
      const [a, la] = TAB[i - 1];
      const [b, lb] = TAB[i];
      return la + ((lb - la) * (x - a)) / (b - a);
    }
  }
  return TAB[TAB.length - 1][1];
};
const D_LAB = 3.4; // km w.e. (Gran Sasso, DM.LNGS_ROCK_KM ~ 1.4 km of rock)
const D_MAX = 6;
const HALF_CM = 65; // half-width of the xenon volume
const LAMBDA_CM = 5;
const CUT_CM = 20;

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const rnd = mulberry32(23);
    const NM = Math.round(46 * Math.max(0.5, ctx.quality));
    const muons = Array.from({ length: NM }, (_, i) => ({ u: (i + rnd() * 0.9) / NM, ang: (rnd() - 0.5) * 0.36, ph: rnd(), speed: 0.7 + 0.5 * rnd() }));
    const NG = 400;
    const gam = Array.from({ length: NG }, () => {
      const side = Math.floor(rnd() * 4); // 0 top,1 right,2 bottom,3 left
      const pos = rnd() * 2 - 1; // -1..1 along the wall
      const d = -LAMBDA_CM * Math.log(1 - rnd() * 0.999);
      const lat = (rnd() - 0.5) * 1.1 * d;
      return { side, pos, d, lat };
    });
    const NB = 16;
    const bulk = Array.from({ length: NB }, () => ({ x: (rnd() * 2 - 1) * 0.92, y: (rnd() * 2 - 1) * 0.92 }));
    const lv: Record<string, number> = { muons: 1, radioactivity: 0 };
    let state: St = 'muons';
    let t0 = 0;
    let now = 0;

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      now = s.t;
      for (const k of STATES) lv[k] = approach(lv[k], k === state ? 1 : 0, s.dt, 0.35);
      const portrait = w / h < 1.0;
      const pad = 14;
      const Lp = portrait ? { x: pad, y: pad, w: w - 2 * pad, h: (h - 2 * pad) * 0.6 } : { x: pad, y: pad, w: (w - 2 * pad) * 0.6, h: h - 2 * pad };
      const Rp = portrait ? { x: pad, y: pad + Lp.h + 8, w: w - 2 * pad, h: h - 2 * pad - Lp.h - 8 } : { x: pad + Lp.w + 20, y: pad, w: w - 2 * pad - Lp.w - 20, h: h - 2 * pad };
      const ts = now - t0;

      // ============ muons ============
      if (lv.muons > 0.02) {
        const A = lv.muons;
        const axX = Lp.x + 46;
        const xl = axX + 10;
        const xr = Lp.x + Lp.w;
        const y0 = Lp.y + 52;
        const yb = Lp.y + Lp.h - 4;
        const Y = (d: number) => y0 + (d / D_MAX) * (yb - y0);
        const Wm = xr - xl;
        const slope = Wm * 0.12;
        // rock
        g.save();
        g.globalAlpha = 0.12 * A;
        g.fillStyle = th.fg;
        g.beginPath();
        g.moveTo(xl, yb);
        g.lineTo(xl + slope, y0);
        g.lineTo(xr - slope, y0);
        g.lineTo(xr, yb);
        g.closePath();
        g.fill();
        g.globalAlpha = 0.6 * A;
        g.strokeStyle = th.fg;
        g.lineWidth = 1;
        g.stroke();
        g.restore();
        txt(g, L('rock'), xl + slope * 2.2, Y(5200), { color: th.fg, alpha: 0.75 * A });
        txt(g, L('sky'), (xl + xr) / 2, Lp.y + 6, { color: th.fg, align: 'center', alpha: 0.75 * A });
        // depth axis
        line(g, axX, y0, axX, yb, th.fg, 1, 0.5 * A);
        for (const d of [0, 2, 4, 6]) {
          line(g, axX - 4, Y(d), axX, Y(d), th.fg, 1, 0.5 * A);
          txt(g, ctx.formatNumber(d * 1000), axX - 7, Y(d), { color: th.fg, align: 'right', mono: true, alpha: 0.65 * A });
        }
        txt(g, L('depth'), Lp.x, Lp.y + 12, { color: th.fg, alpha: 0.8 * A });
        // cavern with water tank and detector
        const cxL = xl + Wm * 0.52;
        const cyL = Y(D_LAB);
        const tw = Math.max(56, Math.min(96, Wm * 0.2));
        const th2 = tw * 0.9;
        rect(g, cxL - tw / 2 - 8, cyL - th2 / 2 - 8, tw + 16, th2 + 16, th.fg, 1, 0.5 * A, 0);
        g.save();
        g.globalAlpha = 0.3 * A;
        g.fillStyle = th.bg;
        g.fillRect(cxL - tw / 2 - 7, cyL - th2 / 2 - 7, tw + 14, th2 + 14);
        g.restore();
        rect(g, cxL - tw / 2, cyL - th2 / 2, tw, th2, th.accent, 1, 0.9 * A, 0.22 * A);
        rect(g, cxL - tw * 0.2, cyL - th2 * 0.28, tw * 0.4, th2 * 0.56, th.fg, 1.2, 0.9 * A, 0.18 * A);
        txt(g, L('tank'), cxL + tw / 2 + 14, cyL - 10, { color: th.accent, alpha: 0.9 * A });
        txt(g, L('tank2'), cxL + tw / 2 + 14, cyL + 5, { color: th.accent, alpha: 0.75 * A });
        txt(g, L('lab'), cxL + tw / 2 + 14, cyL + 22, { color: th.fg, alpha: 0.7 * A });
        // muons
        const x0m = xl + slope + 14;
        const x1m = xr - slope - 14;
        const alphaAt = (d: number) => Math.pow(clamp((logFlux(d) - logFlux(D_MAX)) / (logFlux(0) - logFlux(D_MAX))), 2.5);
        const tEff = ctx.reducedMotion ? 0 : ts;
        g.save();
        g.beginPath();
        g.moveTo(xl, yb);
        g.lineTo(xl + slope, y0);
        g.lineTo(xl + slope - 40, y0 - 60);
        g.lineTo(xr - slope + 40, y0 - 60);
        g.lineTo(xr - slope, y0);
        g.lineTo(xr, yb);
        g.closePath();
        g.clip();
        for (const m of muons) {
          const xTop = x0m + m.u * (x1m - x0m);
          const dy = (yb - y0) / 1.0;
          const dx = Math.tan(m.ang) * dy;
          // track from the sky to the bottom
          const nseg = 28;
          for (let i = 0; i < nseg; i++) {
            const a = i / nseg;
            const b = (i + 1) / nseg;
            const dd = a * D_MAX;
            line(g, xTop + dx * a, y0 + dy * a, xTop + dx * b, y0 + dy * b, th.fg, 1, 0.5 * alphaAt(dd) * A);
          }
          line(g, xTop - dx * 0.2, y0 - 40, xTop, y0, th.fg, 1, 0.45 * A);
          // the moving head
          const q = ctx.reducedMotion ? m.ph : (m.ph + (tEff * 0.22 * m.speed) / 1) % 1;
          const yy = y0 - 40 + q * (dy + 40);
          const d = clamp((yy - y0) / dy) * D_MAX;
          if (yy > y0 - 40) dot(g, xTop + (yy < y0 ? -dx * 0.2 * (1 - (yy - (y0 - 40)) / 40) : dx * ((yy - y0) / dy)), yy, 1.8, th.fg, (yy < y0 ? 0.8 : 0.9 * alphaAt(d)) * A);
        }
        g.restore();
        // the survivor
        {
          const sx = cxL - tw * 0.05;
          const sTop = sx - 18;
          line(g, sTop, y0 - 30, sx, cyL + th2 / 2 + 10, th.fg, 1, 0.5 * A, [2, 3]);
          // Cherenkov light in the water
          const inY0 = cyL - th2 / 2;
          const inY1 = cyL + th2 / 2;
          const k = smooth(0, 1, clamp((loopPhase(ts, 3.5, 1.5, ctx.reducedMotion) - 0.3) / 0.5));
          line(g, sx - 18 * ((cyL - y0) / (cyL + th2 / 2 + 10 - (y0 - 30))) + 0, inY0, sx, inY1, th.fg, 1.2, 0.9 * A);
          for (let i = 0; i < 4; i++) {
            const yy = inY0 + ((inY1 - inY0) * (i + 0.5)) / 4;
            glow(g, sx + 4, yy, 12, 0.55 * k * A);
          }
          txt(g, L('survivor'), sx - 10, cyL + th2 / 2 + 24, { color: th.fg, align: 'center', alpha: 0.8 * A });
        }
        // flux plot
        const pr = portrait ? { x: Rp.x + 52, y: Rp.y + 16, w: Rp.w - 80, h: Rp.h - 56 } : { x: Rp.x + 56, y: Rp.y + 52, w: Rp.w - 70, h: Rp.h * 0.7 };
        const pl = plot(
          g,
          ctx,
          pr,
          { min: 0, max: D_MAX, label: L('depthAxis'), ticks: [0, 2, 4, 6].map((v) => ({ v, label: ctx.formatNumber(v) })) },
          { min: 1e-10, max: 1e-1, log: true, label: L('fluxAxis'), ticks: [1e-10, 1e-8, 1e-6, 1e-4, 1e-2].map((v) => ({ v, label: `10${sup(Math.round(Math.log10(v)))}` })) },
        );
        g.save();
        g.globalAlpha = A;
        pl.axes();
        pl.curve((x) => 10 ** logFlux(x), { color: th.accent, width: 1.5, alpha: A });
        g.restore();
        const f0 = 10 ** logFlux(0);
        const f1 = 10 ** logFlux(D_LAB);
        pl.vline(D_LAB, { alpha: 0.35 * A, dash: [2, 3] });
        dot(g, pl.X(0), pl.Y(f0), 3, th.accent, A);
        dot(g, pl.X(D_LAB), pl.Y(f1), 3, th.accent, A);
        txt(g, L('seaLevel'), pl.X(0) + 8, pl.Y(f0) + 14, { color: th.fg, alpha: 0.85 * A });
        txt(g, L('thisLab'), pl.X(D_LAB) - 8, pl.Y(f1) + 16, { color: th.fg, align: 'right', alpha: 0.85 * A });
        arrow(g, pl.X(D_LAB) + 12, pl.Y(f0) + 4, pl.X(D_LAB) + 12, pl.Y(f1) - 4, th.fg, 1, 0.6 * A, 5);
        txt(g, L('drop'), pl.X(D_LAB) + 20, (pl.Y(f0) + pl.Y(f1)) / 2, { color: th.fg, align: 'left', alpha: 0.9 * A });
        void DM;
      }

      // ============ radioactivity ============
      if (lv.radioactivity > 0.02) {
        const A = lv.radioactivity;
        const S = Math.min(Lp.w - 20, Lp.h - 100);
        const bx = Lp.x + (Lp.w - S) / 2;
        const by = Lp.y + 64;
        const half = S / 2;
        const cx = bx + half;
        const cy = by + half;
        const pxPerCm = half / HALF_CM;
        // wall (steel, glass) and xenon
        g.save();
        g.globalAlpha = 0.28 * A;
        g.fillStyle = th.accent2;
        g.fillRect(bx, by, S, S);
        g.restore();
        rect(g, bx - 5, by - 5, S + 10, S + 10, th.fg, 3, 0.6 * A, 0);
        txt(g, L('wall'), bx, by - 16, { color: th.fg, alpha: 0.8 * A });
        txt(g, L('xenon'), bx + 8, by + S - 12, { color: th.fg, alpha: 0.75 * A });
        // fiducial volume
        const fh = half - CUT_CM * pxPerCm;
        g.save();
        g.globalAlpha = 0.75 * A;
        g.strokeStyle = th.fg;
        g.setLineDash([5, 4]);
        g.lineWidth = 1;
        g.strokeRect(cx - fh, cy - fh, 2 * fh, 2 * fh);
        g.restore();
        txt(g, L('fiducial'), cx, cy - 10, { color: th.fg, align: 'center', alpha: 0.85 * A });
        // scale: 130 cm
        line(g, bx, by + S + 14, bx + S, by + S + 14, th.fg, 1, 0.5 * A);
        txt(g, `${ctx.formatNumber(2 * HALF_CM)} cm`, cx, by + S + 26, { color: th.fg, align: 'center', mono: true, alpha: 0.6 * A });
        // events appear one after another
        const nShow = ctx.reducedMotion ? NG : Math.min(NG, Math.floor(clamp(ts / 5) * NG));
        const nShowB = ctx.reducedMotion ? NB : Math.min(NB, Math.floor(clamp((ts - 1) / 5) * NB));
        let nIn = 0;
        for (let i = 0; i < nShow; i++) {
          const e = gam[i];
          const inwardX = e.side === 1 ? -1 : e.side === 3 ? 1 : 0;
          const inwardY = e.side === 2 ? -1 : e.side === 0 ? 1 : 0;
          // wall point
          const wxp = e.side === 0 || e.side === 2 ? cx + e.pos * half : e.side === 1 ? cx + half : cx - half;
          const wyp = e.side === 1 || e.side === 3 ? cy + e.pos * half : e.side === 2 ? cy + half : cy - half;
          const dpx = e.d * pxPerCm;
          const lpx = e.lat * pxPerCm;
          const vx = wxp + inwardX * dpx + inwardY * lpx;
          const vy = wyp + inwardY * dpx + inwardX * lpx;
          const inside = Math.abs(vx - cx) < fh && Math.abs(vy - cy) < fh;
          if (inside) nIn++;
          if (vx < bx || vx > bx + S || vy < by || vy > by + S) continue;
          line(g, wxp, wyp, vx, vy, th.fg, 1, 0.12 * A);
          dot(g, vx, vy, inside ? 2.6 : 1.5, inside ? th.accent : th.fg, (inside ? 1 : 0.6) * A);
        }
        for (let i = 0; i < nShowB; i++) {
          const b = bulk[i];
          ring(g, cx + b.x * half, cy + b.y * half, 3.2, th.fg, 1.2, 0.9 * A);
        }
        txt(g, `${L('fromWalls')} ${ctx.formatNumber(nShow)}`, Lp.x + 4, Lp.y + 12, { color: th.fg, mono: true, alpha: 0.9 * A });
        txt(g, `${L('inFid')} ${ctx.formatNumber(nIn)}`, Lp.x + 4, Lp.y + 28, { color: th.accent, mono: true, alpha: A });
        txt(g, L('bulk'), bx + S - 4, by + S - 12, { color: th.fg, align: 'right', alpha: 0.75 * A });
        // plot: rate against depth into the xenon
        const pr = portrait ? { x: Rp.x + 52, y: Rp.y + 20, w: Rp.w - 80, h: Rp.h - 60 } : { x: Rp.x + 52, y: Rp.y + 56, w: Rp.w - 66, h: Rp.h * 0.5 };
        const pl = plot(
          g,
          ctx,
          pr,
          { min: 0, max: HALF_CM, label: L('distAxis'), ticks: [0, 20, 40, 60].map((v) => ({ v, label: String(v) })) },
          { min: 1e-6, max: 1, log: true, label: L('rateAxis'), ticks: [1e-6, 1e-4, 1e-2, 1].map((v) => ({ v, label: v === 1 ? '1' : `10${sup(Math.round(Math.log10(v)))}` })) },
        );
        g.save();
        g.globalAlpha = A;
        pl.axes();
        g.globalAlpha = 0.14 * A;
        g.fillStyle = th.fg;
        g.fillRect(pl.X(0), pr.y, pl.X(CUT_CM) - pl.X(0), pr.h);
        g.restore();
        pl.curve((x) => Math.exp(-x / LAMBDA_CM), { color: th.accent, width: 1.5, alpha: A });
        pl.vline(CUT_CM, { alpha: 0.6 * A, dash: [3, 3] });
        txt(g, L('removed'), pl.X(CUT_CM / 2), pr.y + 10, { color: th.fg, align: 'center', alpha: 0.8 * A });
        txt(g, L('kept'), pl.X(CUT_CM) + 8, pl.Y(1e-5), { color: th.fg, alpha: 0.8 * A });
        txt(g, L('selfShield'), pl.X(CUT_CM) + 8, pl.Y(Math.exp(-CUT_CM / LAMBDA_CM)) - 14, { color: th.accent, alpha: A });
        if (!portrait) wrap(g, L('radonNote'), Rp.x + 4, pr.y + pr.h + 52, Rp.w - 8, th.fg, 0.75 * A);
      }
    });
    c.animate = true;

    return {
      setState(st: string, o: SetStateOptions) {
        if (!(STATES as readonly string[]).includes(st)) return;
        state = st as St;
        t0 = now;
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

/**
 * sc.testbeam — beam telescope with the device under test (DUT) in the middle.
 * Simulation (seeded, same defaults as the TestbeamResiduals widget): 6 reference planes 30 mm apart (z = ±30, ±60, ±90 mm),
 * DUT at z = 0, σ_tel = 3 µm per plane (≈ 18 µm pitch / √12 with charge sharing), σ_DUT = 8 µm, p = 5 GeV/c, 50 µm of silicon per
 * plane (Highland, X₀ = 93.7 mm), 99 % DUT efficiency. Track = least-squares straight line through the six hits,
 * residual = x_DUT,measured − x_predicted, σ_res² = σ_DUT² + σ_pred². All numbers in the figure are computed from this simulation.
 * The transverse direction is magnified by ~3 px/µm (planes are ~10 mm wide in reality): labelled in the figure.
 */
import type { SceneModule } from '../shared/types';
import { gaussian, mulberry32 } from '../shared/canvas2d';
import { plot, type Rect } from '../shared/plot';
import { dot, dim, fadeStage, ln, poly, rect, ring, txt, tw, clamp, type Fr, type G, wideOf } from './_sc3-common';

const STATES = ['telescope', 'track', 'residual'] as const;
const PLANES = [-90, -60, -30, 30, 60, 90];
const SIG_TEL = 3;
const SIG_DUT = 8;
const PITCH = 18.4; // µm
const P_BEAM = 5; // GeV/c
const X0_MM = 93.7;
const TH0 = (0.0136 / P_BEAM) * Math.sqrt(0.05 / X0_MM) * (1 + 0.038 * Math.log(0.05 / X0_MM)); // rad per plane
const NEV = 400;
const NRES = 2000;

interface Ev {
  off: number;
  hits: number[];
  a: number;
  b: number;
  pred: number;
  dut: number;
  hit: boolean;
  res: number;
}

/** Seeded simulation of the telescope + DUT (units: µm transverse, mm along the beam). */
function simulate(n: number, seed: number): Ev[] {
  const rnd = mulberry32(seed);
  const zs = [...PLANES, 0].sort((p, q) => p - q);
  const out: Ev[] = [];
  for (let e = 0; e < n; e++) {
    const off = (rnd() - 0.5) * PITCH;
    let x = off;
    let s = 0;
    let zc = zs[0];
    const at = new Map<number, number>();
    for (const z of zs) {
      x += s * (z - zc);
      zc = z;
      at.set(z, x);
      s += TH0 * 1000 * gaussian(rnd);
    }
    const hits = PLANES.map((z) => at.get(z)! + SIG_TEL * gaussian(rnd));
    const N = PLANES.length;
    const zb = PLANES.reduce((p, q) => p + q, 0) / N;
    const xb = hits.reduce((p, q) => p + q, 0) / N;
    let sxx = 0;
    let sxy = 0;
    PLANES.forEach((z, i) => {
      sxx += (z - zb) ** 2;
      sxy += (z - zb) * (hits[i] - xb);
    });
    const b = sxy / sxx;
    const a = xb - b * zb;
    const dut = at.get(0)! + SIG_DUT * gaussian(rnd);
    out.push({ off, hits, a, b, pred: a, dut, hit: e === 11 || e === 26 ? false : rnd() < 0.99, res: dut - a });
  }
  return out;
}
const std = (v: number[]) => {
  const m = v.reduce((p, q) => p + q, 0) / v.length;
  return Math.sqrt(v.reduce((p, q) => p + (q - m) ** 2, 0) / (v.length - 1));
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const evs = simulate(NRES, 4433);
    // telescope-only pointing error at the DUT: re-simulate with σ_DUT removed from the residual (res = dut − pred; pred − truth)
    const pointing = (() => {
      const r = mulberry32(7);
      const zs = [...PLANES, 0].sort((p, q) => p - q);
      const d: number[] = [];
      for (let e = 0; e < 6000; e++) {
        let x = 0;
        let s = 0;
        let zc = zs[0];
        const at = new Map<number, number>();
        for (const z of zs) {
          x += s * (z - zc);
          zc = z;
          at.set(z, x);
          s += TH0 * 1000 * gaussian(r);
        }
        const hits = PLANES.map((z) => at.get(z)! + SIG_TEL * gaussian(r));
        const zb = PLANES.reduce((p, q) => p + q, 0) / 6;
        const xb = hits.reduce((p, q) => p + q, 0) / 6;
        let sxx = 0;
        let sxy = 0;
        PLANES.forEach((z, i) => {
          sxx += (z - zb) ** 2;
          sxy += (z - zb) * (hits[i] - xb);
        });
        d.push(xb - (sxy / sxx) * zb - at.get(0)!);
      }
      return std(d);
    })();
    const sigRes = std(evs.map((e) => e.res));
    const sigDeduced = Math.sqrt(Math.max(0, sigRes * sigRes - pointing * pointing));

    const hitsOK = evs.map((e) => e.hit);

    /** Longitudinal mapping + common geometry for the telescope drawings. */
    const geo = (R: Rect) => {
      const x0 = R.x + 20;
      const x1 = R.x + R.w - 20;
      const Z = (z: number) => x0 + ((z + 112) / 224) * (x1 - x0);
      return { Z, yc: R.y + R.h / 2 };
    };

    // --- 1. telescope: planes + one particle
    const drawTelescope = (g: G, f: Fr) => {
      const R: Rect = { x: 0, y: 0, w: f.w, h: f.h };
      const { Z, yc } = geo(R);
      const narrow = !wideOf(f);
      const H = Math.min(f.h * 0.5, 230);
      const ev = evs[3];
      const ytr = yc - H * 0.12;
      // beam
      ln(g, Z(-112), ytr, Z(112), ytr, { alpha: 0.12, dash: [2, 5] });
      const u = f.reduced ? 1 : clamp((f.ts % 4.2) / 2.8);
      const u2 = f.ts > 1e2 ? 1 : u;
      const zp = -112 + 224 * u2;
      // planes
      const plane = (z: number, isDut: boolean) => {
        const x = Z(z);
        const h = isDut ? H * 1.12 : H;
        const col = isDut ? accent : fg;
        rect(g, x - 2, yc - h / 2, 4, h, { fill: col, fillAlpha: isDut ? 0.55 : 0.22, stroke: col, alpha: isDut ? 0.9 : 0.5 });
        for (let k = 1; k < 18; k++) ln(g, x - 7, yc - h / 2 + (k * h) / 18, x - 3, yc - h / 2 + (k * h) / 18, { color: col, alpha: 0.3 });
      };
      PLANES.forEach((z) => plane(z, false));
      plane(0, true);
      // track + hits
      ln(g, Z(-112), ytr, Z(Math.min(112, zp)), ytr, { color: accent2, alpha: 0.9, width: 1.5 });
      [...PLANES, 0].forEach((z) => {
        if (zp >= z) dot(g, Z(z), ytr, z === 0 ? 3.5 : 2.5, z === 0 ? accent : accent2);
      });
      dot(g, Z(zp), ytr, 3, accent2);
      // beam label
      txt(g, L('beam'), Z(-112), ytr - 14, { alpha: 0.75 });
      // labels: reference planes (brackets above), DUT below
      const top = yc - H * 0.56 - 8;
      const bracket = (za: number, zb: number, label: string) => {
        const xa = Z(za) - 6;
        const xb = Z(zb) + 6;
        poly(g, [[xa, top + 5], [xa, top], [xb, top], [xb, top + 5]], { alpha: 0.45 });
        txt(g, label, (xa + xb) / 2, top - 11, { align: 'center', alpha: 0.85 });
      };
      bracket(-90, -30, narrow ? L('refShort') : L('refUp'));
      bracket(30, 90, narrow ? L('refShort') : L('refDown'));
      txt(g, L('dut'), Z(0), yc + H * 0.56 + 20, { align: 'center', color: accent, alpha: 1 });
      txt(g, L('dutSub'), Z(0), yc + H * 0.56 + 38, { align: 'center', alpha: 0.65 });
      if (!narrow) {
        dim(g, Z(-90), yc + H * 0.56 + 20, Z(-60), yc + H * 0.56 + 20, '30 mm', { alpha: 0.5 });
      }
      txt(g, L('pixels'), 14, f.h - 14, { alpha: 0.55 });
      void ev;
    };

    // --- event drawing used by `track` (full) and `residual` (mini)
    const drawEvent = (g: G, R: Rect, e: Ev, o: { sy: number; cells: boolean; shown: number; labels: boolean; narrow: boolean }) => {
      const { Z, yc } = geo(R);
      const Y = (x: number) => yc - x * o.sy;
      const half = o.cells ? 2.5 * PITCH : 40;
      // planes
      [...PLANES, 0].forEach((z) => {
        const isD = z === 0;
        const x = Z(z);
        if (o.cells) {
          for (let k = -2; k <= 2; k++) {
            const c0 = Math.round(e.off / PITCH);
            const lo = (c0 + k) * PITCH - PITCH / 2;
            const hitCell = !isD && Math.abs(Math.round((e.hits[PLANES.indexOf(z)] - 0) / PITCH) - (c0 + k)) === 0;
            const dutCell = isD && e.hit && Math.round(e.dut / PITCH) === c0 + k;
            const col = isD ? accent : fg;
            rect(g, x - 9, Y(lo + PITCH), 18, PITCH * o.sy, { fill: hitCell || dutCell ? (isD ? accent : accent2) : col, fillAlpha: hitCell || dutCell ? 0.38 : 0.05, stroke: col, alpha: isD ? 0.55 : 0.32 });
          }
        } else {
          ln(g, x, yc - half * o.sy, x, yc + half * o.sy, { color: isD ? accent : fg, alpha: isD ? 0.9 : 0.4, width: isD ? 2 : 1.25 });
        }
      });
      const nShown = o.shown;
      // fit line (solid through the telescope, dashed extrapolation across the DUT gap)
      const yAt = (z: number) => Y(e.a + e.b * z);
      ln(g, Z(-90), yAt(-90), Z(-30), yAt(-30), { color: fg, alpha: 0.55, width: 1.25 });
      ln(g, Z(30), yAt(30), Z(90), yAt(90), { color: fg, alpha: 0.55, width: 1.25 });
      ln(g, Z(-30), yAt(-30), Z(30), yAt(30), { color: fg, alpha: 0.55, width: 1.25, dash: [4, 4] });
      // hits
      PLANES.forEach((z, i) => {
        if (i < nShown) dot(g, Z(z), Y(e.hits[i]), 3, accent2);
      });
      // predicted point and DUT hit
      ring(g, Z(0), Y(e.pred), 5, fg, 0.9);
      if (e.hit) dot(g, Z(0), Y(e.dut), 3.5, accent);
      return { Z, Y, yc };
    };

    // --- 2. track + efficiency counter
    const drawTrack = (g: G, f: Fr) => {
      const narrow = !wideOf(f);
      const R: Rect = { x: 0, y: 24, w: f.w, h: f.h - 24 };
      const ev = evs[f.ts > 1e2 ? 14 : Math.floor(f.ts / 0.7) % 40];
      const n = f.ts > 1e2 ? NEV : Math.min(NEV, Math.floor(f.ts * 30) + 1);
      const m = hitsOK.slice(0, n).filter(Boolean).length;
      const sy = narrow ? 2.4 : 3.2;
      const { Z, Y, yc } = drawEvent(g, R, ev, { sy, cells: true, shown: 6, labels: true, narrow });
      // labels
      txt(g, L('hitsLabel'), Z(-60), yc - 2.5 * PITCH * sy - 22, { align: 'center', color: accent2, alpha: 0.95 });
      txt(g, L('fitLabel'), Z(60), yc + 2.5 * PITCH * sy + 20, { align: 'center', alpha: 0.85 });
      const yb = yc - 2.5 * PITCH * sy - 22;
      txt(g, L('predicted'), Z(0), yb - 14, { align: 'center', alpha: 0.9 });
      ring(g, Z(0) - tw(g, L('predicted')) / 2 - 12, yb - 14, 4, fg, 0.9);
      txt(g, ev.hit ? L('dutHit') : L('dutMiss'), Z(0), yc + 2.5 * PITCH * sy + 20, { align: 'center', color: ev.hit ? accent : fg, alpha: ev.hit ? 1 : 0.8 });
      // counter
      const eff = m / n;
      const cx = 14;
      txt(g, `${L('tracks')} ${ctx.formatNumber(n)}   ${L('matched')} ${ctx.formatNumber(m)}`, cx, 14, { mono: true, alpha: 0.85 });
      txt(g, `ε = ${ctx.formatNumber(m)} / ${ctx.formatNumber(n)} = ${ctx.formatNumber(eff * 100, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`, cx, 34, { mono: true, color: accent, alpha: 1 });
      txt(g, L('magnified'), 14, f.h - 12, { alpha: 0.55 });
      // pixel pitch
      const px = Z(90) + 22;
      if (!narrow && px + 80 < f.w) {
        dim(g, px, Y(PITCH / 2), px, Y(-PITCH / 2), '', { alpha: 0.6 });
        txt(g, `${ctx.formatNumber(PITCH)} µm`, px + 8, yc, { mono: true, alpha: 0.7 });
        txt(g, L('pitch'), px + 8, yc + 16, { alpha: 0.6 });
      }
    };

    // --- 3. residual histogram
    const drawResidual = (g: G, f: Fr) => {
      const wide = wideOf(f);
      const mini: Rect = wide ? { x: 0, y: 40, w: f.w * 0.42, h: f.h - 100 } : { x: 0, y: 8, w: f.w, h: f.h * 0.3 };
      const plotR: Rect = wide ? { x: f.w * 0.42 + 56, y: 44, w: f.w * 0.58 - 56 - 24, h: f.h - 44 - 70 } : { x: 54, y: f.h * 0.3 + 48, w: f.w - 54 - 24, h: f.h * 0.7 - 48 - 50 };
      const ev = evs[14];
      const nn = f.ts > 1e2 ? NRES : Math.min(NRES, Math.floor(f.ts * 450));
      // mini telescope: sy bigger on the DUT to show the residual
      const { Z, Y } = drawEvent(g, mini, ev, { sy: wide ? 3.4 : 2.0, cells: false, shown: 6, labels: false, narrow: !wide });
      // residual arrow at the DUT
      if (ev.hit) {
        const x = Z(0) + 12;
        ln(g, x - 5, Y(ev.pred), x + 5, Y(ev.pred), { alpha: 0.7 });
        ln(g, x, Y(ev.pred), x, Y(ev.dut), { color: accent, alpha: 0.95, width: 1.5 });
        txt(g, L('residual'), x + 10, (Y(ev.pred) + Y(ev.dut)) / 2, { color: accent, alpha: 1 });
      }
      txt(g, L('dutShort'), Z(0), mini.y + mini.h / 2 - 40 * (wide ? 3.4 : 2.0) - 10, { align: 'center', color: accent, alpha: 0.9 });
      txt(g, L('telTrack'), 14, wide ? 20 : f.h * 0.3 + 4, { alpha: 0.7 });

      // histogram
      const lim = 30;
      const nb = 40;
      const bw = (2 * lim) / nb;
      const counts = new Array(nb).fill(0);
      let used = 0;
      for (let i = 0; i < nn; i++) {
        if (!evs[i].hit) continue;
        used++;
        const b = Math.floor((evs[i].res + lim) / bw);
        if (b >= 0 && b < nb) counts[b]++;
      }
      const ymax = Math.max(12, Math.ceil((NRES * 0.99 * bw) / (sigRes * Math.sqrt(2 * Math.PI)) * 1.25));
      const pl = plot(
        g,
        ctx,
        plotR,
        { min: -lim, max: lim, label: L('resAxis'), ticks: [-20, -10, 0, 10, 20].map((v) => ({ v, label: String(v) })) },
        { min: 0, max: ymax, label: L('events'), ticks: [{ v: 0, label: '0' }] },
      );
      pl.axes();
      g.save();
      g.fillStyle = accent;
      g.globalAlpha = 0.45;
      counts.forEach((c, i) => {
        if (c <= 0) return;
        const x0 = pl.X(-lim + i * bw);
        const x1 = pl.X(-lim + (i + 1) * bw);
        g.fillRect(x0 + 0.5, pl.Y(c), x1 - x0 - 1, pl.Y(0) - pl.Y(c));
      });
      g.restore();
      // Gaussian with the sample σ, scaled to the number of entries
      const A = (used * bw) / (sigRes * Math.sqrt(2 * Math.PI));
      if (used > 30) pl.curve((x) => A * Math.exp(-(x * x) / (2 * sigRes * sigRes)), { color: accent2, width: 1.5, alpha: 0.95 });
      // numbers
      const tx = plotR.x + plotR.w - 4;
      const ty = plotR.y + 10;
      const done = nn >= NRES;
      txt(g, `${L('entries')} ${ctx.formatNumber(used)}`, tx, ty, { align: 'right', mono: true, alpha: 0.8 });
      if (done || used > 200) {
        txt(g, `σ_res = ${ctx.formatNumber(sigRes, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} µm`, tx, ty + 18, { align: 'right', mono: true, color: accent2, alpha: 1 });
        txt(g, `σ_pred = ${ctx.formatNumber(pointing, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} µm`, tx, ty + 36, { align: 'right', mono: true, alpha: 0.85 });
        txt(g, `σ_DUT = √(σ_res² − σ_pred²) = ${ctx.formatNumber(sigDeduced, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} µm`, tx, ty + 54, { align: 'right', mono: true, color: accent, alpha: 1 });
      }
      void fg;
    };

    return fadeStage(ctx, { states: STATES, draws: { telescope: drawTelescope, track: drawTrack, residual: drawResidual }, loop: ['telescope', 'track'], anim: 5 });
  },
};
export default mod;

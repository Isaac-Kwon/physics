/**
 * sc.signal-induction — Shockley–Ramo in a pixel sensor (300 µm thick, 50 µm pitch, 40 µm electrodes, side view).
 *   weighting-field: φ_w (numerical Laplace solution: 1 on the central pixel, 0 on its neighbours and on the backplane);
 *                    colour = |E_w| (viridis, logarithmic), lines = field lines of E_w. Concentrated within ~1 pitch of the pixel.
 *   moving-charge:   one electron drifts from z = 270 µm to the pixel; instantaneous current i = q v·E_w (bar at the electron,
 *                    and the i(t) trace); the last ~50 µm give most of the signal.
 *   pulse:           the 60 pair-markers of a MIP track (represents 2.4×10⁴ pairs) move as in sc.drift;
 *                    i_e(t), i_h(t) and their sum; area = Q = N·e exactly (∫ i dt = q Δφ_w, electron + hole = 1).
 * Drift model identical to sc.drift (V = 150 V, μE/(1+μE/v_sat)).
 */
import { interpolateViridis } from 'd3-scale-chromatic';
import type { SceneModule } from '../shared/types';
import { clamp, lerp, smooth } from '../shared/canvas2d';
import { plot, type Rect } from '../shared/plot';
import { PH, wrapText, createStage, driftPath, electronDot, holeRing, line, sci, txt, withAlpha, type G } from './_sc1-common';
import { GEO, X_HALF, ewAt, phiAt, pulseModel, weightingPotential } from './_sc1-induction';

const STATES = ['weighting-field', 'moving-charge', 'pulse'] as const;
type P = { field: number; one: number; pulse: number };
const TARGETS: Record<string, P> = {
  'weighting-field': { field: 1, one: 0, pulse: 0 },
  'moving-charge': { field: 0.55, one: 1, pulse: 0 },
  pulse: { field: 0.25, one: 0, pulse: 1 },
};

const NX = Math.round((GEO.pitch * GEO.nPix) / GEO.dx);
const NY = Math.round(GEO.d / GEO.dx);
const Z_START = 270;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const D = GEO.d;

    // |E_w| colour map, pre-rendered once on the solver grid
    let img: HTMLCanvasElement | null = null;
    const field = () => {
      if (img) return img;
      weightingPotential();
      img = document.createElement('canvas');
      img.width = NX + 1;
      img.height = NY + 1;
      const c = img.getContext('2d')!;
      const data = c.createImageData(NX + 1, NY + 1);
      for (let j = 0; j <= NY; j++)
        for (let i = 0; i <= NX; i++) {
          const x = -X_HALF + i * GEO.dx;
          const z = j * GEO.dx;
          const [ex, ez] = ewAt(x, z);
          const m = Math.hypot(ex, ez) * D;
          const t = clamp((Math.log10(Math.max(m, 1e-3)) + 1) / 2.2);
          const col = interpolateViridis(0.08 + 0.9 * t);
          const rgb = col.startsWith('#') ? [1, 3, 5].map((o) => parseInt(col.slice(o, o + 2), 16)) : (col.match(/\d+/g) ?? ['0', '0', '0']).map(Number);
          const k = (j * (NX + 1) + i) * 4;
          data.data[k] = rgb[0];
          data.data[k + 1] = rgb[1];
          data.data[k + 2] = rgb[2];
          data.data[k + 3] = 255;
        }
      c.putImageData(data, 0, 0);
      return img;
    };

    // field lines of E_w, from the central pixel; seeds at equal flux (quantiles of |E_z| across the electrode)
    let lines: [number, number][][] | null = null;
    const fieldLines = () => {
      if (lines) return lines;
      const N = 13;
      const xs: number[] = [];
      const cum: number[] = [0];
      const n = 160;
      for (let k = 0; k <= n; k++) {
        const x = -GEO.elec / 2 + (GEO.elec * k) / n;
        xs.push(x);
        cum.push(cum[k] + Math.abs(ewAt(x, 1.5)[1]));
      }
      lines = [];
      for (let q = 0; q < N; q++) {
        const target = (cum[n] * (q + 0.5)) / N;
        let k = 0;
        while (k < n && cum[k + 1] < target) k++;
        let x = xs[Math.min(k, n)];
        let z = 1.5;
        const pts: [number, number][] = [[x, 0]];
        for (let st = 0; st < 600; st++) {
          let [ex, ez] = ewAt(x, z);
          let m = Math.hypot(ex, ez) || 1;
          const hs = 1.5;
          const mx = x + (ex / m) * hs * 0.5;
          const mz = z + (ez / m) * hs * 0.5;
          [ex, ez] = ewAt(mx, mz);
          m = Math.hypot(ex, ez) || 1;
          x += (ex / m) * hs;
          z += (ez / m) * hs;
          pts.push([x, z]);
          if (z >= D - 0.5 || z <= 0.5 || Math.abs(x) >= X_HALF - 1) break;
        }
        lines.push(pts);
      }
      return lines;
    };

    const pulse = pulseModel();
    const Mmk = 30;
    const marks = Array.from({ length: Mmk }, (_, k) => {
      const z0 = ((k + 0.5) / Mmk) * D;
      return { z0, e: driftPath(z0, 'e', PH.VBIAS, D, pulse.dt), h: driftPath(z0, 'h', PH.VBIAS, D, pulse.dt) };
    });
    const one = driftPath(Z_START, 'e', PH.VBIAS, D, pulse.dt);
    const iOne = (t: number) => {
      // single electron: i = q v |E_w| = d(φ_w)/dt (in e⁻/ns)
      const a = phiAt(0, one.at(t));
      const b = phiAt(0, one.at(t + pulse.dt));
      return Math.abs(b - a) / pulse.dt;
    };
    let iOneMax = 0;
    for (let t = 0; t < one.arrival; t += 0.05) iOneMax = Math.max(iOneMax, iOne(t));

    const draw = (g: G, s: { w: number; h: number }, p: P, env: { state: string; ts: number; reduced: boolean }) => {
      const { w, h } = s;
      const small = w < 620;
      const narrow = small && h >= 560; // stacked layout only on tall narrow panels
      const fr = small ? 0.4 : 0.44;
      const S = narrow ? Math.min((h * 0.5 - 30) / D, (w - 70) / (2 * X_HALF)) : Math.min((h - 100) / D, (w * fr - (small ? 24 : 50)) / (2 * X_HALF));
      const sw = 2 * X_HALF * S;
      const sh = D * S;
      const sx0 = narrow ? (w - sw) / 2 : small ? 44 + (w * fr - 44 - sw) / 2 : 36 + (w * 0.44 - 36 - sw) / 2 + 10;
      const sy0 = narrow ? 52 : (h - sh) / 2 + 10;
      const X = (x: number) => sx0 + (x + X_HALF) * S;
      const Z = (z: number) => sy0 + z * S;
      const cx = X(0);

      // time
      const st = env.state;
      const full = env.ts >= 1e3;
      const tOne = st === 'moving-charge' ? (full ? one.arrival * 0.93 : Math.min(one.arrival + 0.0, env.ts * 2.2)) : 0;
      const tPulse = st === 'pulse' ? (full ? 20 : Math.min(20, env.ts * 5)) : 0;

      // |E_w| map + field lines
      g.save();
      g.globalAlpha = 0.9 * p.field;
      g.imageSmoothingEnabled = true;
      g.drawImage(field(), sx0, sy0, sw, sh);
      g.restore();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 0.9;
      g.globalAlpha = 0.55 * p.field;
      for (const ln of fieldLines()) {
        g.beginPath();
        ln.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = fg;
      g.globalAlpha = 0.5;
      g.lineWidth = 1;
      g.strokeRect(sx0, sy0, sw, sh);
      g.globalAlpha = 1;
      // electrodes: central pixel, neighbours, backplane
      for (let k = -2; k <= 2; k++) {
        const c = X(k * GEO.pitch);
        line(g, c - (GEO.elec / 2) * S, sy0 - 2, c + (GEO.elec / 2) * S, sy0 - 2, accent2, k === 0 ? 1 : 0.5, k === 0 ? 4 : 3);
      }
      line(g, sx0, sy0 + sh + 2, sx0 + sw, sy0 + sh + 2, accent2, 0.5, 3);
      txt(g, L('pixel'), cx, sy0 - 16, { align: 'center', color: accent2, alpha: 0.95 });
      txt(g, L('backplane'), sx0 + sw / 2, sy0 + sh + 16, { align: 'center', alpha: 0.7 });
      // scale
      txt(g, `${D} µm`, sx0 - 8, sy0 + sh / 2, { align: 'right', mono: true, alpha: 0.7 });
      if (sw > 200) txt(g, `${GEO.pitch} µm`, X(GEO.pitch), sy0 - 16, { align: 'center', mono: true, alpha: 0.6 * (1 - p.pulse) });

      // right-hand / lower panel rectangle
      const pr: Rect = narrow
        ? { x: 58, y: sy0 + sh + 56, w: w - 58 - 24, h: Math.max(60, h - (sy0 + sh + 56) - 50) }
        : small
          ? { x: w * fr + 46, y: 48, w: w * (1 - fr) - 46 - 14, h: h - 48 - 56 }
          : { x: w * 0.44 + 56, y: 56, w: w * 0.56 - 56 - 28, h: h - 56 - 64 };

      // weighting-field legend
      if (p.field > 0.7) {
        const a = (p.field - 0.7) / 0.3;
        const lx = narrow ? pr.x : pr.x;
        const ly = narrow ? pr.y + 6 : pr.y + 4;
        let yy = wrapText(g, L('ewTitle'), lx, ly, pr.w, 16, { alpha: 0.95 * a });
        yy = wrapText(g, L('ewDef'), lx, yy + 4, pr.w, 15, { mono: true, alpha: 0.8 * a });
        const bw = Math.min(220, pr.w);
        for (let k = 0; k < bw; k++) {
          g.fillStyle = interpolateViridis(0.08 + 0.9 * (k / bw));
          g.globalAlpha = a;
          g.fillRect(lx + k, yy + 6, 1.5, 9);
        }
        g.globalAlpha = 1;
        txt(g, L('weak'), lx, yy + 26, { alpha: 0.75 * a });
        txt(g, L('strong'), lx + bw, yy + 26, { align: 'right', alpha: 0.75 * a });
        yy = wrapText(g, L('lines'), lx, yy + 48, pr.w, 15, { alpha: 0.75 * a });
        wrapText(g, L('smallPixel'), lx, yy + 12, pr.w, 16, { alpha: 0.9 * a, color: accent });
      }

      // one electron
      if (p.one > 0.02) {
        const a = p.one;
        const z = one.at(tOne);
        const ph = phiAt(0, z);
        const cur = tOne >= one.arrival ? 0 : iOne(tOne);
        electronDot(g, cx, Z(z), accent, 4.2, a);
        g.strokeStyle = '#ffffff';
        g.globalAlpha = 0.5 * a;
        g.lineWidth = 1;
        g.setLineDash([2, 3]);
        g.beginPath();
        g.moveTo(cx, Z(Z_START));
        g.lineTo(cx, Z(z));
        g.stroke();
        g.setLineDash([]);
        g.globalAlpha = 1;
        electronDot(g, cx, Z(Z_START), accent, 2, 0.5 * a);
        // instantaneous current bar beside the electron
        const barMax = Math.min(70, sw * 0.4 - 8);
        const bl = (cur / iOneMax) * barMax;
        g.fillStyle = accent;
        g.globalAlpha = 0.9 * a;
        g.fillRect(cx + 10, Z(z) - 3, Math.max(0, bl), 6);
        g.globalAlpha = 1;
        txt(g, 'i', cx + 14 + Math.max(0, bl), Z(z), { mono: true, color: accent, alpha: a });
        txt(g, `φ_w = ${ctx.formatNumber(ph, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, cx - 10, Z(z), { align: 'right', mono: true, color: '#ffffff', alpha: 0.9 * a });

        // i(t) trace of this electron
        const tl = Math.ceil(one.arrival);
        const pl = plot(
          g,
          ctx,
          pr,
          { min: 0, max: tl + 1, label: L('timeNs'), ticks: Array.from({ length: Math.floor((tl + 1) / 2) + 1 }, (_, k) => ({ v: 2 * k, label: String(2 * k) })) },
          { min: 0, max: iOneMax * 1.15, label: L('iOne'), ticks: [{ v: 0, label: '0' }] },
        );
        g.save();
        g.globalAlpha = a;
        pl.axes();
        g.restore();
        g.save();
        g.globalAlpha = a;
        g.strokeStyle = accent;
        g.lineWidth = 1.75;
        g.beginPath();
        const tEnd = Math.min(tOne, one.arrival);
        const n = 160;
        for (let k = 0; k <= n; k++) {
          const t = (k / n) * tEnd;
          const X0 = pl.X(t);
          const Y0 = pl.Y(iOne(Math.min(t, one.arrival - pulse.dt)));
          k ? g.lineTo(X0, Y0) : g.moveTo(X0, Y0);
        }
        g.stroke();
        g.restore();
        if (tOne > 0) pl.dot(tEnd, iOne(Math.min(tEnd, one.arrival - pulse.dt)), 3, accent);
        g.save();
        g.globalAlpha = a;
        pl.text(tl + 1, iOneMax * 0.5, L('lastStretch'), { alpha: 0.8, align: 'right' });
        g.restore();
      }

      // pulse: pairs + i(t) curves
      if (p.pulse > 0.02) {
        const a = p.pulse;
        for (const m of marks) {
          const ze = m.e.at(tPulse);
          const zh = m.h.at(tPulse);
          if (tPulse < m.e.arrival) electronDot(g, cx - 2.5, Z(ze), accent, 1.8, 0.9 * a);
          if (tPulse < m.h.arrival) holeRing(g, cx + 2.5, Z(zh), accent2, 1.9, 0.9 * a, 1);
        }
        const tMax = 20;
        const iMax = 6000;
        const pl = plot(
          g,
          ctx,
          pr,
          { min: 0, max: tMax, label: L('timeNs'), ticks: [0, 5, 10, 15, 20].map((v) => ({ v, label: String(v) })) },
          { min: 0, max: iMax, label: L('iUnit'), ticks: [0, 2000, 4000, 6000].map((v) => ({ v, label: String(v / 1000) })) },
        );
        g.save();
        g.globalAlpha = a;
        pl.axes();
        const sample = (arr: Float64Array) => (t: number) => arr[Math.min(pulse.n - 1, Math.round(t / pulse.dt))];
        const upto = (f: (t: number) => number, color: string, width: number, alpha = 1, fill = false) => {
          const n = 240;
          g.strokeStyle = color;
          g.lineWidth = width;
          g.globalAlpha = alpha * a;
          g.beginPath();
          const tEnd = Math.min(tPulse, tMax);
          for (let k = 0; k <= n; k++) {
            const t = (k / n) * tEnd;
            const x = pl.X(t);
            const y = pl.Y(Math.min(iMax, f(t)));
            k ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          if (fill) {
            const save = g.globalAlpha;
            g.stroke();
            g.lineTo(pl.X(tEnd), pl.Y(0));
            g.lineTo(pl.X(0), pl.Y(0));
            g.closePath();
            g.fillStyle = color;
            g.globalAlpha = 0.1 * a;
            g.fill();
            g.globalAlpha = save;
          } else g.stroke();
        };
        upto(sample(pulse.i), fg, 1.75, 0.95, true);
        upto(sample(pulse.ie), accent, 1.5);
        upto(sample(pulse.ih), accent2, 1.5);
        g.restore();
        if (tPulse > 1.5) {
          pl.text(tPulse > 3 ? 3.0 : 2, sample(pulse.i)(3) + 520, L('sum'), { alpha: a * 0.9 });
          pl.text(1.0, sample(pulse.ie)(1) - 700, L('electrons'), { color: accent, alpha: a });
        }
        if (tPulse > 8) pl.text(9.4, sample(pulse.ih)(9.4) + 480, L('holes'), { color: accent2, alpha: a });
        if (tPulse >= 19.9) {
          pl.text(tMax, iMax * 0.78, `${L('area')} = Q = ${sci(Math.round(pulse.Qint / 100) * 100, 2)} e⁻`, { alpha: a, align: 'right' });
        }
      }
      void lerp;
      void smooth;
      void withAlpha;
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, anim: { 'moving-charge': 5, pulse: 4.5 }, draw });
  },
};
export default mod;

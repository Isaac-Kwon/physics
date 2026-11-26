/**
 * hi.stopping — Canvas2D. Top: a snapshot of a central collision (beam axis horizontal) at the moment the nuclei have
 * overlapped; bottom: the net-baryon rapidity distribution dN_B/dy, the quantity that tells transparent from stopped.
 *
 * transparent (√s_NN ≈ 5 TeV, γ ≈ 2700): the pancakes (blue dots = net baryons, drawn from Woods–Saxon positions) keep going at ±c;
 *   the hot central matter (dot colour = temperature, inferno) carries almost no net baryon number. dN_B/dy has two peaks
 *   at large |y| and a valley at y = 0.
 * stopped (√s_NN ≈ 4.5 GeV, γ ≈ 2.4): thick nuclei decelerate and pile up in the centre; the matter is cooler and baryon-rich.
 *   dN_B/dy is a single peak at y = 0.
 * Both distributions are drawn with equal area (net baryon number is conserved). Schematic shapes (Gaussians), no data.
 */
import { interpolateInferno } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, gaussian, lerp, mulberry32 } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, label } from './_s2-draw';
import { sampleNucleus } from './_s2-nuclei';

const STATES = ['transparent', 'stopped'] as const;
const BARYON = '#6fa8ff';
const tColor = (tt: number) => interpolateInferno(0.45 + 0.52 * Math.pow(clamp((tt - 0.7) / 2.7), 0.7));

const gauss = (y: number, mu: number, s: number) => Math.exp(-0.5 * ((y - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const lab = ctx.label;
    const rnd = mulberry32(31);

    const nA = sampleNucleus(11);
    const nB = sampleNucleus(29);
    const baryons = [...nA.map((n) => ({ n, side: -1 })), ...nB.map((n) => ({ n, side: 1 }))].map(({ n, side }) => ({
      x: n.x,
      zJit: (rnd() - 0.5) * 0.35,
      side,
      zStop: gaussian(rnd) * 2.4,
      xStop: n.x * 0.62,
    }));
    const nM = Math.round(520 * ctx.quality);
    const matter = Array.from({ length: nM }, () => {
      const rho = Math.sqrt(rnd());
      const ph = 2 * Math.PI * rnd();
      return { rz: rho * Math.cos(ph), rx: rho * Math.sin(ph), rho };
    });

    let m = 0;
    let mT = 0;
    const c = createCanvas2D(ctx, draw);

    function draw(g: CanvasRenderingContext2D, s: { w: number; h: number; dt: number }) {
      const { w, h } = s;
      m = approach(m, mT, s.dt, 0.55);
      c.animate = Math.abs(m - mT) > 0.002;
      if (!c.animate) m = mT;
      const e = m * m * (3 - 2 * m);

      const compact = h < 340;
      const picH = h * (compact ? 0.5 : 0.56);
      const cy = picH / 2 + 22;
      const cx = w / 2;
      const sc = Math.min((w - 40) / 38, (picH - 60) / 16.5);

      // beam axis
      g.strokeStyle = th.fg;
      g.globalAlpha = 0.18;
      g.setLineDash([4, 5]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(10, cy);
      g.lineTo(w - 10, cy);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;

      // central matter: colour = temperature (T/Tc ≈ 2.4 when transparent, 1.0 when stopped)
      const Tm = lerp(2.4, 1.0, e);
      const az = lerp(7.5, 4.2, e) * sc;
      const ax = lerp(5.2, 4.6, e) * sc;
      const dr = clamp(0.13 * sc, 1.1, 1.6);
      for (const p of matter) {
        g.fillStyle = tColor(Tm * (1.2 - 0.2 * p.rho * p.rho));
        g.globalAlpha = 0.85;
        g.beginPath();
        g.arc(cx + p.rz * az, cy - p.rx * ax, dr, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      // baryons: pancakes at ±12 fm (transparent) → piled up in the centre (stopped)
      const dB = clamp(0.2 * sc, 1.3, 2.2);
      g.fillStyle = BARYON;
      g.globalAlpha = 0.9;
      g.beginPath();
      for (const b of baryons) {
        const zT = b.side * 12 + b.zJit;
        const z = lerp(zT, b.zStop, e);
        const x = lerp(b.x, b.xStop, e);
        const px = cx + z * sc;
        const py = cy - x * sc;
        g.moveTo(px + dB, py);
        g.arc(px, py, dB, 0, Math.PI * 2);
      }
      g.fill();
      g.globalAlpha = 1;

      // velocity arrows: the baryons keep going when transparent
      if (!compact) arrow(g, cx - 12 * sc - 10, cy - 8.4 * sc, cx - 12 * sc - 38, cy - 8.4 * sc, th.fg, 1.2, 1 - e);
      if (!compact) arrow(g, cx + 12 * sc + 10, cy - 8.4 * sc, cx + 12 * sc + 38, cy - 8.4 * sc, th.fg, 1.2, 1 - e);

      // labels
      const a0 = 1 - e;
      const a1 = e;
      label(g, lab('t.baryons'), compact ? cx : cx - 12 * sc, cy + 8.3 * sc + (compact ? 14 : 26), BARYON, { align: 'center', alpha: a0 * 0.95 });
      if (!compact) label(g, lab('t.baryons'), cx + 12 * sc, cy + 8.3 * sc + 26, BARYON, { align: 'center', alpha: a0 * 0.95 });
      label(g, lab('t.matter'), cx, cy - 5.2 * sc - 8, th.fg, { align: 'center', alpha: a0 * 0.9 });
      label(g, lab('s.baryons'), cx, cy + 6.2 * sc + 16, BARYON, { align: 'center', alpha: a1 * 0.95 });
      label(g, lab('s.matter'), cx, cy - 4.8 * sc - 8, th.fg, { align: 'center', alpha: a1 * 0.9 });
      label(g, lab('t.title'), 16, 24, th.fg, { alpha: a0 * 0.95 });
      label(g, lab('s.title'), 16, 24, th.fg, { alpha: a1 * 0.95 });
      label(g, lab('t.energy'), w - 16, 24, th.fg, { mono: true, align: 'right', alpha: a0 * 0.9 });
      label(g, lab('s.energy'), w - 16, 24, th.fg, { mono: true, align: 'right', alpha: a1 * 0.9 });
      if (!compact) label(g, lab('t.thick'), w - 16, 40, th.fg, { mono: true, align: 'right', alpha: a0 * 0.6 });
      if (!compact) label(g, lab('s.thick'), w - 16, 40, th.fg, { mono: true, align: 'right', alpha: a1 * 0.6 });
      // keys
      if (!compact) {
      g.fillStyle = BARYON;
      g.beginPath();
      g.arc(20, 44, 3, 0, Math.PI * 2);
      g.fill();
      label(g, lab('keyBaryon'), 30, 48, th.fg, { alpha: 0.75 });
      g.fillStyle = tColor(2);
      g.beginPath();
      g.arc(20, 60, 3, 0, Math.PI * 2);
      g.fill();
      label(g, lab('keyNew'), 30, 64, th.fg, { alpha: 0.75 });
      }

      // ---- net-baryon rapidity distribution ----
      const py0 = picH + 40;
      const ph = Math.max(50, h - py0 - 40);
      const pl = plot(g, ctx, { x: 56, y: py0, w: Math.max(80, w - 56 - 24), h: ph }, {
        min: -1,
        max: 1,
        label: lab('xlabel'),
        ticks: [
          { v: -1, label: '−y_b' },
          { v: 0, label: '0' },
          { v: 1, label: '+y_b' },
        ],
      }, {
        min: 0,
        max: 1.45,
        label: lab('ylabel'),
        ticks: [{ v: 0, label: '0' }],
      });
      pl.axes();
      const dens = (y: number) => (1 - e) * (0.5 * gauss(y, -0.72, 0.2) + 0.5 * gauss(y, 0.72, 0.2)) + e * gauss(y, 0, 0.32);
      // area under curve is the same in both states: fill lightly to show it
      pl.band(() => 0, dens, BARYON, 0.18);
      pl.curve(dens, { color: BARYON, width: 1.8 }, 240);
      if (!compact) pl.text(1, 1.3, lab('area'), { align: 'right', alpha: 0.7 });
    }

    return {
      setState(state: string, opts: SetStateOptions) {
        mT = state === 'stopped' ? 1 : 0;
        if (opts.immediate || ctx.reducedMotion) m = mT;
        c.animate = true;
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

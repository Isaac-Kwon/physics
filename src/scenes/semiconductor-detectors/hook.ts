/**
 * sc.hook — scrub scene, a zoom-out of scale with a (vertical, never foreshortened) scale bar.
 * One continuous timeline u = stateIndex + progress; orthographic camera that yaws about the vertical axis.
 *   wafer  0–1: 300 mm wafer, 9 × 15 mm … dies of 15 × 30 mm on it (ALPIDE size, ITS2), rocking slowly; one faint specular band.
 *   chips  1–2: dies separate and lift; the camera dollies in on the central die; inset: pixel grid, 29 × 27 µm pitch, 512 × 1024 pixels.
 *   staves 2–3: the 9 dies of the central row (they fit in a 300 mm wafer: 9 × 30 = 270 mm) close up into one stave on a flex cable.
 *   barrel 3–4: the stave is replicated into the 7 ALICE ITS2 layers (radii 22.4, 30.1, 37.8, 194.4, 247.0, 350.2, 405.2 mm;
 *               12, 16, 20, 24, 30, 42, 48 staves; lengths 290 (drawn as the 9-chip row, 273 mm), 290, 290, 843, 843, 1475, 1475 mm; TDR values) around a beam pipe
 *               (radius 19.8 mm); the camera swings to the end view, then to an oblique view.
 * Marks: every polygon is a real object at the stated size; stave width in the outer layers is drawn as the azimuthal pitch
 * (schematic coverage); the glint on the wafer is the only light effect.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, lerp, smooth } from '../shared/canvas2d';
import { FONT_MONO, line, scaleBar, txt, type G } from './_sc1-common';

const STATES = ['wafer', 'chips', 'staves', 'barrel'] as const;

const R_WAFER = 150; // mm
const DIE_X = 30;
const DIE_Y = 15;
const R_EDGE = 147;
const LAYERS = [
  { R: 22.4, n: 12, L: 273.2 },
  { R: 30.1, n: 16, L: 273.2 },
  { R: 37.8, n: 20, L: 273.2 },
  { R: 194.4, n: 24, L: 843 },
  { R: 247.0, n: 30, L: 843 },
  { R: 350.2, n: 42, L: 1475 },
  { R: 405.2, n: 48, L: 1475 },
] as const;
const R_PIPE = 19.8;
const PIX_X = 29.2; // µm
const PIX_Y = 26.9; // µm

const rad = (d: number) => (d * Math.PI) / 180;
const win = (u: number, a: number, b: number, c: number, d: number) => smooth(a, b, u) * (1 - smooth(c, d, u));

/** Piecewise-linear interpolation through [u, value] knots, smoothed. */
const knots = (u: number, ks: [number, number][]) => {
  if (u <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (u <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], smooth(ks[i - 1][0], ks[i][0], u));
  }
  return ks[ks.length - 1][1];
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;

    // dies fully inside the usable wafer area; the central row j = 0 is the 9-chip stave
    const dies: { i: number; j: number }[] = [];
    for (let i = -5; i <= 5; i++)
      for (let j = -9; j <= 9; j++) {
        const x = i * DIE_X;
        const y = j * DIE_Y;
        const far = Math.hypot(Math.abs(x) + DIE_X / 2, Math.abs(y) + DIE_Y / 2);
        if (far <= R_EDGE) dies.push({ i, j });
      }

    let u = 0;
    let uD = 0;
    let idx = 0;

    const c = createCanvas2D(ctx, (g, s) => {
      uD = approach(uD, u, s.dt, 0.12);
      if (Math.abs(uD - u) < 0.002) uD = u;
      c.animate = uD !== u || uD < 1.6;
      draw(g, s.w, s.h, uD, ctx.reducedMotion ? 0 : s.t);
    });

    interface Poly {
      pts: [number, number][];
      depth: number;
      fill?: string;
      fillA?: number;
      stroke?: string;
      strokeA?: number;
      lw?: number;
    }

    function draw(g: G, W: number, H: number, uu: number, t: number) {
      const narrow = W < 560;
      const m = Math.min(W, H);
      // ---- camera: yaw ψ, scale S (px/mm)
      const rock = (1 - smooth(0.7, 1.4, uu)) * 8 * Math.sin(0.55 * t);
      const psi = rad(
        knots(uu, [
          [0, 38],
          [1, 24],
          [1.5, 14],
          [2, 0],
          [3, 0],
          [3.5, 90],
          [4, 62],
        ]) + rock,
      );
      const Sw = Math.min((0.74 * H) / (2 * R_WAFER), (0.9 * W) / (2 * R_WAFER * Math.cos(rad(42))));
      const Sc = Math.min((narrow ? 0.5 * W : 0.27 * W) / DIE_X, (0.3 * H) / DIE_Y);
      const Ss = (0.84 * W) / 273.2;
      const Sa = (0.4 * m) / (LAYERS[6].R * 1.02);
      const Sb = Math.min((0.46 * W) / (737 * Math.cos(rad(62)) + 405 * Math.sin(rad(62))), (0.4 * H) / 405) * (narrow ? 1 : 1);
      const logS = knots(uu, [
        [0, Math.log(Sw)],
        [1, Math.log(Sw * 1.05)],
        [2, Math.log(Sc)],
        [3, Math.log(Ss)],
        [3.5, Math.log(Sa)],
        [4, Math.log(Sb)],
      ]);
      const S = Math.exp(logS);
      const cx = W / 2;
      const cy = H / 2 + (narrow ? 10 : 0);
      const cosP = Math.cos(psi);
      const sinP = Math.sin(psi);
      const pj = (x: number, y: number, z: number): [number, number, number] => {
        const xc = x * cosP + z * sinP;
        const zc = -x * sinP + z * cosP;
        return [cx + xc * S, cy - y * S, zc];
      };
      const path = (pts: [number, number][]) => {
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
      };

      // ---- wafer + dies (u < 3)
      const waferA = 1 - smooth(1.0, 2.3, uu);
      if (uu < 3.05) {
        const gap = knots(uu, [
          [0, 0.4],
          [1, 0.4],
          [1.7, 5],
          [2, 5],
          [2.6, 0.4],
        ]);
        const lift = 9 * smooth(1, 1.7, uu) * (1 - smooth(2, 2.6, uu));
        const dieA = (j: number) => (j === 0 ? 1 : 1 - smooth(2.0, 2.7, uu));
        // wafer disc
        if (waferA > 0.02) {
          const disc: [number, number][] = [];
          for (let k = 0; k < 120; k++) {
            const a = (k / 120) * Math.PI * 2;
            const [X, Y] = pj(R_WAFER * Math.cos(a), R_WAFER * Math.sin(a), 0);
            disc.push([X, Y]);
          }
          g.save();
          g.fillStyle = fg;
          g.globalAlpha = 0.1 * waferA;
          path(disc);
          g.fill();
          g.globalAlpha = 0.55 * waferA;
          g.strokeStyle = fg;
          g.lineWidth = 1.25;
          g.stroke();
          g.restore();
        }
        // dies
        for (const d of dies) {
          const x = d.i * (DIE_X + gap);
          const y = d.j * (DIE_Y + gap);
          const a = dieA(d.j) * (d.j === 0 ? 1 : lerp(1, 0.9, 0));
          if (a < 0.02) continue;
          const hx = DIE_X / 2;
          const hy = DIE_Y / 2;
          const q = [pj(x - hx, y - hy, lift), pj(x + hx, y - hy, lift), pj(x + hx, y + hy, lift), pj(x - hx, y + hy, lift)].map(([X, Y]) => [X, Y] as [number, number]);
          const central = d.j === 0 && d.i === 0;
          const rowHi = d.j === 0 ? smooth(1.2, 2.4, uu) : 0;
          g.save();
          path(q);
          g.fillStyle = central || rowHi > 0 ? accent : fg;
          g.globalAlpha = a * (central ? 0.3 : rowHi > 0 ? 0.08 + 0.2 * rowHi : 0.09);
          g.fill();
          g.strokeStyle = central ? accent : rowHi > 0.3 ? accent : fg;
          g.globalAlpha = a * (central ? 0.95 : rowHi > 0.3 ? 0.4 + 0.5 * rowHi : 0.38);
          g.lineWidth = central ? 1.5 : 1;
          g.stroke();
          g.restore();
        }
        // flex cable (copper) under the central row
        const flex = smooth(2.2, 2.8, uu) * (1 - smooth(3.0, 3.2, uu));
        if (flex > 0.02) {
          const q = [pj(-146, -4.5, -1), pj(146, -4.5, -1), pj(146, 4.5, -1), pj(-146, 4.5, -1)].map(([X, Y]) => [X, Y] as [number, number]);
          g.save();
          path(q);
          g.fillStyle = accent2;
          g.globalAlpha = 0.45 * flex;
          g.fill();
          g.restore();
        }
        // specular glint on the wafer: one soft band, position follows the tilt
        if (waferA > 0.3 && uu < 1.4) {
          const [ox, oy] = pj(0, 0, 0);
          const wr = R_WAFER * S;
          const th = 0.4 * t + psi * 1.6;
          const off = Math.sin(th) * wr * 0.75;
          g.save();
          g.beginPath();
          g.ellipse(ox, oy, wr * Math.abs(cosP), wr, 0, 0, Math.PI * 2);
          g.clip();
          const grad = g.createLinearGradient(ox + off - wr * 0.25, oy - wr * 0.25, ox + off + wr * 0.25, oy + wr * 0.25);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(0.5, 'rgba(255,255,255,0.14)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = grad;
          g.globalAlpha = (1 - smooth(1, 1.4, uu)) * waferA;
          g.fillRect(ox - wr, oy - wr, 2 * wr, 2 * wr);
          g.restore();
        }
      }

      // ---- barrel (u ≥ 3)
      if (uu >= 3.0) {
        const polys: Poly[] = [];
        const spread = smooth(3.0, 3.45, uu);
        const pipeA = smooth(3.25, 3.6, uu);
        // beam pipe: longitudinal lines + end rings
        if (pipeA > 0.02) {
          const Lp = 760;
          g.save();
          g.strokeStyle = accent2;
          g.lineWidth = 1;
          g.globalAlpha = 0.5 * pipeA;
          for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2;
            const p0 = pj(-Lp, R_PIPE * Math.sin(a), R_PIPE * Math.cos(a));
            const p1 = pj(Lp, R_PIPE * Math.sin(a), R_PIPE * Math.cos(a));
            g.beginPath();
            g.moveTo(p0[0], p0[1]);
            g.lineTo(p1[0], p1[1]);
            g.stroke();
          }
          for (const sx of [-Lp, Lp]) {
            g.beginPath();
            for (let k = 0; k <= 48; k++) {
              const a = (k / 48) * Math.PI * 2;
              const p0 = pj(sx, R_PIPE * Math.sin(a), R_PIPE * Math.cos(a));
              k ? g.lineTo(p0[0], p0[1]) : g.moveTo(p0[0], p0[1]);
            }
            g.stroke();
          }
          g.restore();
        }
        LAYERS.forEach((ly, li) => {
          const reveal = li === 0 ? 1 : smooth(3.12 + 0.07 * li, 3.4 + 0.07 * li, uu);
          if (reveal < 0.02) return;
          const wd = li < 3 ? 15 : ((2 * Math.PI * ly.R) / ly.n) * 0.92;
          const half = ly.L / 2;
          for (let k = 0; k < ly.n; k++) {
            const phi = (k / ly.n) * Math.PI * 2;
            const ysc = Math.sin(phi) * ly.R * spread;
            const zsc = li === 0 && k === 0 ? ly.R * spread : Math.cos(phi) * ly.R * spread;
            const tx = Math.cos(phi); // tangent in (y, z): (cos φ, −sin φ)
            const tz = -Math.sin(phi);
            const a1 = pj(-half, ysc + (tx * wd) / 2, zsc + (tz * wd) / 2);
            const a2 = pj(half, ysc + (tx * wd) / 2, zsc + (tz * wd) / 2);
            const a3 = pj(half, ysc - (tx * wd) / 2, zsc - (tz * wd) / 2);
            const a4 = pj(-half, ysc - (tx * wd) / 2, zsc - (tz * wd) / 2);
            const dep = (a1[2] + a2[2] + a3[2] + a4[2]) / 4;
            polys.push({
              pts: [
                [a1[0], a1[1]],
                [a2[0], a2[1]],
                [a3[0], a3[1]],
                [a4[0], a4[1]],
              ],
              depth: dep,
              fill: accent,
              fillA: (li === 0 ? 0.3 : 0.1) * reveal * (k === 0 && li === 0 ? 1.2 : 1),
              stroke: accent,
              strokeA: (li === 0 && k === 0 ? 0.95 : li === 0 ? 0.55 : 0.35) * reveal,
              lw: 0.9,
            });
          }
        });
        polys.sort((a, b) => a.depth - b.depth);
        for (const p of polys) {
          g.save();
          path(p.pts);
          g.fillStyle = p.fill!;
          g.globalAlpha = p.fillA!;
          g.fill();
          g.strokeStyle = p.stroke!;
          g.globalAlpha = p.strokeA!;
          g.lineWidth = p.lw!;
          g.stroke();
          g.restore();
        }
        // chip boundaries on the first stave when they are large enough to read
        if (S * DIE_X > 8) {
          const zz = LAYERS[0].R * spread;
          g.save();
          g.strokeStyle = accent;
          g.globalAlpha = 0.6;
          g.lineWidth = 0.8;
          for (let k = -4; k <= 5; k++) {
            const x = (k - 0.5) * (DIE_X + 0.4);
            const a = pj(x, -DIE_Y / 2, zz);
            const b = pj(x, DIE_Y / 2, zz);
            g.beginPath();
            g.moveTo(a[0], a[1]);
            g.lineTo(b[0], b[1]);
            g.stroke();
          }
          g.restore();
        }
        // interaction point
        const ipA = smooth(3.3, 3.6, uu);
        const ip = pj(0, 0, 0);
        g.save();
        g.fillStyle = accent2;
        g.globalAlpha = ipA;
        g.beginPath();
        g.arc(ip[0], ip[1], 2.5, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }

      // ---- pixel inset (chips)
      const insA = win(uu, 1.55, 1.85, 2.0, 2.25);
      if (insA > 0.02) {
        const box = narrow ? 112 : 150;
        const bx = W - box - 24;
        const by = narrow ? 52 : 40;
        const nPix = 6;
        const sc = box / (nPix * PIX_X);
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = '#000';
        g.globalAlpha = 0.9 * insA;
        g.fillRect(bx - 10, by - 10, box + 20, nPix * PIX_Y * sc + 66);
        g.restore();
        g.save();
        g.globalAlpha = insA;
        g.fillStyle = accent;
        g.globalAlpha = 0.1 * insA;
        g.fillRect(bx, by, box, nPix * PIX_Y * sc);
        g.globalAlpha = 0.8 * insA;
        g.strokeStyle = accent;
        g.lineWidth = 1;
        for (let k = 0; k <= nPix; k++) {
          g.beginPath();
          g.moveTo(bx + k * PIX_X * sc, by);
          g.lineTo(bx + k * PIX_X * sc, by + nPix * PIX_Y * sc);
          g.moveTo(bx, by + k * PIX_Y * sc);
          g.lineTo(bx + box, by + k * PIX_Y * sc);
          g.stroke();
        }
        g.restore();
        // connector from the pixel corner of the central die (top-right) to the inset
        const corner = pj(DIE_X / 2, DIE_Y / 2, 9 * smooth(1, 1.7, uu) * (1 - smooth(2, 2.6, uu)));
        line(g, corner[0], corner[1], bx, by + nPix * PIX_Y * sc, fg, 0.4 * insA, 1, [3, 3]);
        g.save();
        g.globalAlpha = insA;
        g.strokeStyle = accent;
        g.lineWidth = 1.25;
        g.strokeRect(corner[0] - 2.5, corner[1] - 2.5, 5, 5);
        g.restore();
        txt(g, L('pixelLabel'), bx + box, by + nPix * PIX_Y * sc + 16, { align: 'right', mono: true, alpha: 0.9 * insA });
        const bar = 100 * sc;
        scaleBar(g, bx, by + nPix * PIX_Y * sc + 36, bar, '100 µm', false, 0.8 * insA);
      }

      // ---- labels
      const lx = 24;
      const ly0 = 28;
      const backing = (x: number, y: number, w: number, h: number, a: number) => {
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = '#000';
        g.globalAlpha = 0.88 * a;
        g.fillRect(x, y, w, h);
        g.restore();
      };
      const lab = (a: number, l1: string, l2?: string) => {
        if (a < 0.02) return;
        if (uu > 1.1 && uu < 2.3) backing(lx - 8, ly0 - 16, 300, l2 ? 48 : 30, a);
        txt(g, l1, lx, ly0, { alpha: 0.95 * a });
        if (l2) txt(g, l2, lx, ly0 + 20, { mono: true, alpha: 0.8 * a });
      };
      lab(win(uu, -0.1, 0.05, 0.85, 1.2), L('waferLabel'));
      lab(win(uu, 1.0, 1.3, 1.9, 2.15), L('chipLabel'), `15 × 30 mm · 512 × 1024 ${L('pixels')}`);
      lab(win(uu, 2.15, 2.5, 2.9, 3.15), L('staveLabel'), `9 × 30 mm = 27 cm`);
      lab(smooth(3.45, 3.8, uu), L('barrelLabel'), L('innerLabel'));
      if (uu > 3.5) {
        const a = smooth(3.55, 3.9, uu);
        const ip = pj(0, 0, 0);
        const lxp = ip[0] + (narrow ? 38 : 56);
        const lyp = ip[1] - (narrow ? 46 : 64);
        line(g, ip[0] + 5, ip[1] - 5, lxp - 4, lyp + 4, fg, 0.4 * a, 1);
        txt(g, L('beamPipe'), lxp, lyp, { alpha: 0.85 * a });
      }

      // ---- scale bar (vertical axis is never foreshortened)
      const target = 90 / S; // mm for ~90 px
      const e = Math.floor(Math.log10(target));
      const base = 10 ** e;
      const nice = [1, 2, 5, 10].map((k) => k * base).reduce((best, v) => (Math.abs(v * S - 90) < Math.abs(best * S - 90) ? v : best));
      const label = nice < 10 ? `${ctx.formatNumber(nice)} mm` : nice < 1000 ? `${ctx.formatNumber(nice / 10)} cm` : `${ctx.formatNumber(nice / 1000)} m`;
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      g.globalAlpha = uu > 1.1 && uu < 2.3 ? 0.9 : 0;
      g.fillRect(14, H - 26 - nice * S - 10, 78, nice * S + 20);
      g.restore();
      scaleBar(g, 30, H - 26, nice * S, label, true, 0.85);
      g.font = FONT_MONO;
    }

    const set = (i: number, p: number, imm: boolean) => {
      idx = i;
      u = i + clamp(p);
      if (imm || ctx.reducedMotion) uD = u;
      else c.animate = true;
      c.invalidate();
    };
    return {
      setState(state: string, opts: SetStateOptions) {
        const i = Math.max(0, STATES.indexOf(state as (typeof STATES)[number]));
        set(i, opts.immediate || ctx.reducedMotion ? 1 : opts.direction > 0 ? 0 : 1, opts.immediate);
      },
      setProgress(p) {
        set(idx, p, false);
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

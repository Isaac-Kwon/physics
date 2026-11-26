/**
 * dm.indirect — Canvas2D, steps.
 *   annihilation  χχ → γγ or quarks → γ, ν, e⁺, p̄ (diagram), and the emission ∝ ρ² along the galaxy: NFW halo ρ(r) = 1/((r/r_s)(1 + r/r_s)²),
 *                 r_s = 20 kpc, normalised to 1 at the Sun (8 kpc, 0.3 GeV/cm³ in src/data/dark-matter.ts). ρ and ρ² on log axes.
 *   sky           Mollweide all-sky map (galactic l, b). Brightness = line-of-sight integral of ρ² for the same NFW halo (centre at 8 kpc)
 *                 plus a schematic diffuse band along the plane; dots are pulsars scattered around the bulge (a competing explanation);
 *                 rings mark dwarf galaxies (approximate positions). Brightness is schematic: inferno scale, no numbers.
 */
import type { SceneModule } from '../shared/types';
import { clamp, gaussian, mulberry32 } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, createStage, interpolateInferno, nfw, pow10, rgbOf, txt, type G } from './_dm1-common';

const STATES = ['annihilation', 'sky'] as const;
type P = { wa: number; ws: number };
const TARGETS: Record<string, P> = { annihilation: { wa: 1, ws: 0 }, sky: { wa: 0, ws: 1 } };
const R0 = 8;
const rho = (r: number) => nfw(Math.max(r, 0.02)) / nfw(R0);
const DEG = Math.PI / 180;

/** Mollweide projection of (l, b) in radians, with l increasing to the left. Returns x in [−2√2, 2√2], y in [−√2, √2]. */
function mollweide(l: number, b: number): [number, number] {
  let th = b;
  for (let i = 0; i < 12; i++) {
    const f = 2 * th + Math.sin(2 * th) - Math.PI * Math.sin(b);
    const d = 2 + 2 * Math.cos(2 * th);
    if (Math.abs(d) < 1e-9) break;
    th -= f / d;
  }
  return [(-(2 * Math.SQRT2) / Math.PI) * l * Math.cos(th), Math.SQRT2 * Math.sin(th)];
}

const DWARFS: [number, number][] = [
  [86.4, 34.7],
  [104.9, 44.8],
  [287.5, -83.2],
  [237.1, -65.7],
  [260.1, -22.2],
  [243.5, 42.3],
  [226, 49.1],
  [266.3, -49.7],
];

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, fg } = ctx.theme;
    let sky: HTMLCanvasElement | null = null;
    const NW = 220;
    const NH = 110;
    const paintSky = () => {
      if (sky) return sky;
      sky = Object.assign(document.createElement('canvas'), { width: NW, height: NH });
      const sg = sky.getContext('2d')!;
      const img = sg.createImageData(NW, NH);
      // line-of-sight integral of ρ² (log-spaced steps)
      const steps = 44;
      let peak = 0;
      const dm = new Float32Array(NW * NH).fill(-1);
      for (let j = 0; j < NH; j++)
        for (let i = 0; i < NW; i++) {
          const X = ((i + 0.5) / NW) * 4 * Math.SQRT2 - 2 * Math.SQRT2;
          const Y = Math.SQRT2 - ((j + 0.5) / NH) * 2 * Math.SQRT2;
          const th = Math.asin(Y / Math.SQRT2);
          if (Math.abs(X) > 2 * Math.SQRT2 * Math.cos(th)) continue;
          const b = Math.asin((2 * th + Math.sin(2 * th)) / Math.PI);
          const l = (-Math.PI * X) / (2 * Math.SQRT2 * Math.cos(th));
          const cpsi = Math.cos(b) * Math.cos(l);
          let sum = 0;
          let prev = 0.05;
          for (let k = 1; k <= steps; k++) {
            const sNow = 0.05 * (80 / 0.05) ** (k / steps);
            const sm = Math.sqrt(sNow * prev);
            const r = Math.sqrt(R0 * R0 + sm * sm - 2 * R0 * sm * cpsi);
            sum += rho(r) ** 2 * (sNow - prev);
            prev = sNow;
          }
          dm[j * NW + i] = sum;
          peak = Math.max(peak, sum);
        }
      for (let j = 0; j < NH; j++)
        for (let i = 0; i < NW; i++) {
          const k = j * NW + i;
          if (dm[k] < 0) continue;
          const X = ((i + 0.5) / NW) * 4 * Math.SQRT2 - 2 * Math.SQRT2;
          const Y = Math.SQRT2 - ((j + 0.5) / NH) * 2 * Math.SQRT2;
          const th = Math.asin(Y / Math.SQRT2);
          const b = Math.asin((2 * th + Math.sin(2 * th)) / Math.PI) / DEG;
          const l = (-Math.PI * X) / (2 * Math.SQRT2 * Math.cos(th)) / DEG;
          const band = Math.exp(-Math.abs(b) / 4) * (0.35 + 0.65 * Math.exp(-Math.abs(l) / 55));
          const v = clamp(0.05 + 0.42 * band + 0.55 * Math.pow(dm[k] / peak, 0.3) * 0.9, 0, 0.97);
          const [r, g, bl] = rgbOf(interpolateInferno(v));
          img.data[k * 4] = r;
          img.data[k * 4 + 1] = g;
          img.data[k * 4 + 2] = bl;
          img.data[k * 4 + 3] = 255;
        }
      sg.putImageData(img, 0, 0);
      return sky;
    };

    const rnd = mulberry32(8);
    const pulsars = Array.from({ length: Math.round(90 * ctx.quality) }, () => {
      const bulge = rnd() < 0.6;
      return bulge
        ? { l: gaussian(rnd) * 7 * DEG, b: gaussian(rnd) * 4 * DEG }
        : { l: (rnd() * 2 - 1) * 60 * DEG, b: gaussian(rnd) * 2 * DEG };
    });

    const wavy = (g: G, x0: number, y0: number, x1: number, y1: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const ux = (x1 - x0) / len;
      const uy = (y1 - y0) / len;
      g.beginPath();
      for (let d = 0; d <= len; d += 1.5) {
        const o = 3.5 * Math.sin((d / 11) * Math.PI * 2);
        const x = x0 + ux * d - uy * o;
        const y = y0 + uy * d + ux * o;
        d === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      draw(g, s, p) {
        const { w: W, h: H } = s;
        const narrow = W < 620;

        // ------------------------------------------------ annihilation
        if (p.wa > 0.004) {
          g.save();
          g.globalAlpha = p.wa;
          const dw = narrow ? W : W * 0.42;
          const dh = narrow ? H * 0.42 : H;
          const cx = dw * 0.4;
          const cy = narrow ? 56 + (dh - 56) / 2 : H * 0.5;
          const u = Math.min(dw * 0.2, (narrow ? dh - 70 : dh) * 0.22, 80);
          // incoming χ
          for (const sg of [-1, 1]) {
            g.strokeStyle = accent;
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(cx - u * 1.3, cy + sg * u * 0.9);
            g.lineTo(cx, cy);
            g.stroke();
            arrow(g, cx - u * 0.72, cy + sg * u * 0.5, cx - u * 0.6, cy + sg * u * 0.4, { color: accent, head: 6, width: 0.1 });
            txt(g, 'χ', cx - u * 1.3 - 8, cy + sg * u * 0.9, { align: 'right', color: accent, alpha: 0.95 });
          }
          // outgoing: photon pair (top branch) and quark pair (bottom branch)
          g.fillStyle = ctx.theme.accent2;
          g.beginPath();
          g.arc(cx, cy, 8, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = fg;
          g.globalAlpha = 0.6 * p.wa;
          g.lineWidth = 1;
          g.stroke();
          g.globalAlpha = p.wa;
          g.lineWidth = 1.25;
          wavy(g, cx + 6, cy - 4, cx + u * 1.4, cy - u * 0.9);
          txt(g, 'γ', cx + u * 1.4 + 8, cy - u * 0.9, { alpha: 0.95 });
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(cx + 6, cy + 4);
          g.lineTo(cx + u * 0.9, cy + u * 0.55);
          g.stroke();
          // cascade from the quark leg: γ, ν, e⁺, p̄
          const qx = cx + u * 0.9;
          const qy = cy + u * 0.55;
          g.lineWidth = 1;
          g.globalAlpha = 0.8 * p.wa;
          wavy(g, qx, qy, qx + u * 0.6, qy - u * 0.15);
          g.beginPath();
          g.setLineDash([3, 3]);
          g.moveTo(qx, qy);
          g.lineTo(qx + u * 0.65, qy + u * 0.3);
          g.stroke();
          g.setLineDash([]);
          g.beginPath();
          g.moveTo(qx, qy);
          g.lineTo(qx + u * 0.5, qy + u * 0.7);
          g.stroke();
          g.globalAlpha = p.wa;
          txt(g, L('cascade'), qx + u * 0.7, qy + u * 0.3 + 20, { alpha: 0.85 });
          txt(g, L('annih'), 20, narrow ? 26 : 30, { alpha: 0.95 });
          txt(g, L('channels'), 20, narrow ? 44 : 50, { alpha: 0.75 });

          // ρ and ρ² along the galaxy (log–log)
          const r = narrow
            ? { x: 56, y: dh + 24, w: W - 56 - 24, h: H - dh - 24 - 58 }
            : { x: dw + 56, y: 56, w: W - dw - 56 - 36, h: H - 56 - 62 };
          const dec = (a: number, b2: number) => Array.from({ length: Math.floor((b2 - a) / 2) + 1 }, (_, i) => a + 2 * i);
          const pl = plot(
            g,
            ctx,
            r,
            { min: 0.1, max: 50, log: true, label: L('radius'), ticks: [0.1, 1, 10].map((v) => ({ v, label: String(v) })).concat([{ v: 50, label: '50' }]) },
            { min: 1e-4, max: 1e5, log: true, label: L('rel'), ticks: dec(-4, 4).map((e) => ({ v: 10 ** e, label: pow10(e) })) },
          );
          pl.axes();
          pl.vline(R0, { dash: [3, 4], color: fg });
          pl.curve((x) => rho(x) ** 2, { color: accent, width: 1.9 }, 240);
          pl.curve((x) => rho(x), { color: fg, width: 1.5, alpha: 0.9, dash: [5, 4] }, 240);
          pl.dot(R0, 1, 3, fg);
          pl.text(0.13, rho(0.13) ** 2 * 3.5, L('rate'), { color: accent, alpha: 0.95 });
          pl.text(0.13, rho(0.13) * 3.5, L('density'), { alpha: 0.9 });
          pl.text(R0 * 1.12, 3e-4, L('sun'), { alpha: 0.85 });
          g.restore();
        }

        // ------------------------------------------------ sky
        if (p.ws > 0.004) {
          g.save();
          g.globalAlpha = p.ws;
          const legendH = narrow ? 92 : 56;
          const top = 56;
          const wE = Math.max(120, Math.min(W - 40, 2 * (H - top - legendH)));
          const hE = wE / 2;
          const ex = W / 2;
          const ey = top + hE / 2;
          const MX = (x: number) => ex + (x / (4 * Math.SQRT2)) * wE;
          const MY = (y: number) => ey - (y / (2 * Math.SQRT2)) * hE;
          g.save();
          g.beginPath();
          g.ellipse(ex, ey, wE / 2, hE / 2, 0, 0, Math.PI * 2);
          g.clip();
          g.imageSmoothingEnabled = true;
          g.drawImage(paintSky(), ex - wE / 2, ey - hE / 2, wE, hE);
          // graticule: every 30° in l and b
          g.strokeStyle = fg;
          g.lineWidth = 0.6;
          g.globalAlpha = 0.14 * p.ws;
          for (let lg = -150; lg <= 150; lg += 30) {
            g.beginPath();
            for (let bg = -90; bg <= 90; bg += 3) {
              const [x, y] = mollweide(lg * DEG, bg * DEG);
              bg === -90 ? g.moveTo(MX(x), MY(y)) : g.lineTo(MX(x), MY(y));
            }
            g.stroke();
          }
          for (let bg = -60; bg <= 60; bg += 30) {
            g.beginPath();
            for (let lg = -180; lg <= 180; lg += 4) {
              const [x, y] = mollweide(lg * DEG, bg * DEG);
              lg === -180 ? g.moveTo(MX(x), MY(y)) : g.lineTo(MX(x), MY(y));
            }
            g.stroke();
          }
          g.globalAlpha = p.ws;
          // pulsars
          g.fillStyle = '#ffffff';
          for (const q of pulsars) {
            const [x, y] = mollweide(q.l, q.b);
            g.globalAlpha = 0.85 * p.ws;
            g.beginPath();
            g.arc(MX(x), MY(y), 1.4, 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
          // dwarf galaxies
          g.strokeStyle = accent;
          g.lineWidth = 1.5;
          g.globalAlpha = p.ws;
          for (const [l0, b0] of DWARFS) {
            const l = l0 > 180 ? l0 - 360 : l0;
            const [x, y] = mollweide(l * DEG, b0 * DEG);
            g.beginPath();
            g.arc(MX(x), MY(y), 4.5, 0, Math.PI * 2);
            g.stroke();
          }
          g.strokeStyle = fg;
          g.globalAlpha = 0.5 * p.ws;
          g.lineWidth = 1;
          g.beginPath();
          g.ellipse(ex, ey, wE / 2, hE / 2, 0, 0, Math.PI * 2);
          g.stroke();
          g.globalAlpha = p.ws;
          txt(g, L('centre'), 20, 24, { color: accent, alpha: 0.95 });
          txt(g, L('centreSub'), 20, 42, { alpha: 0.75 });
          // legend row
          const ly = ey + hE / 2 + 28;
          const row = (i: number, label: string, mark: () => void) => {
            const x = narrow ? 20 : 20 + i * Math.min(300, W * 0.3);
            const y = narrow ? ly + i * 20 : ly;
            g.save();
            g.translate(x, y - ly);
            mark();
            g.restore();
            txt(g, label, x + 16, y, { alpha: 0.85 });
          };
          row(0, L('lgDwarf'), () => {
            g.strokeStyle = accent;
            g.lineWidth = 1.5;
            g.beginPath();
            g.arc(4, ly, 4.5, 0, Math.PI * 2);
            g.stroke();
          });
          row(1, L('lgPulsar'), () => {
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.arc(4, ly, 1.8, 0, Math.PI * 2);
            g.fill();
          });
          // brightness bar
          const bx = narrow ? 20 : 20 + 2 * Math.min(300, W * 0.3);
          const by = narrow ? ly + 40 : ly;
          const bw = Math.min(110, W - bx - 20 - 90);
          if (bw > 40) {
            const gr = g.createLinearGradient(bx, 0, bx + bw, 0);
            for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, interpolateInferno(0.05 + 0.9 * (i / 8)));
            g.fillStyle = gr;
            g.fillRect(bx, by - 4, bw, 8);
            txt(g, L('lgBright'), bx + bw + 8, by, { alpha: 0.8 });
          }
          g.restore();
        }
      },
    });
  },
};
export default mod;

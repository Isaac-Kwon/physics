/**
 * sc.lab-pipeline — the path of one sensor from idea to detector: a strip of eight stages and one pictogram per stage.
 * Pictograms are schematic; numbers come from src/data/semiconductor.ts (MIP charge 80 pairs/µm × 300 µm ≈ 24,000 e⁻, ⁵⁵Fe 5.9 keV / 3.6 eV ≈ 1,640 e⁻,
 * collection speed 100 µm/ns, V_fd 70 V).
 */
import type { SceneModule } from '../shared/types';
import { interpolateViridis } from 'd3-scale-chromatic';

import { plot, type Rect } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { arrow, clamp, dot, ease, fadeStage, hatch, ln, poly, rect, ring, sci, seg, slab, txt, type Fr, type G, wideOf } from './_sc3-common';

const STATES = ['tcad', 'asic', 'probe', 'source', 'tct', 'testbeam', 'irradiation', 'integration'] as const;
const KEYS = ['s_tcad', 's_asic', 's_probe', 's_source', 's_tct', 's_beam', 's_irr', 's_build'];

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const fmt = (v: number) => ctx.formatNumber(v);

    /** Pipeline strip across the top; returns the pictogram area below it. */
    const strip = (g: G, f: Fr, idx: number): Rect => {
      const n = STATES.length;
      const x0 = 34;
      const x1 = f.w - 34;
      const y = 26;
      const narrow = f.w < 640;
      ln(g, x0, y, x1, y, { alpha: 0.35 });
      for (let i = 0; i < n; i++) {
        const x = x0 + ((x1 - x0) * i) / (n - 1);
        const on = i === idx;
        if (on) dot(g, x, y, 5, accent, 1);
        else if (i < idx) dot(g, x, y, 3, fg, 0.6);
        else ring(g, x, y, 3, fg, 0.5);
        if (!narrow || on) txt(g, narrow ? `${i + 1}. ${L(KEYS[i])}` : L(KEYS[i]), narrow ? Math.min(Math.max(x, 70), f.w - 70) : x, y + 20, { align: 'center', color: on ? accent : fg, alpha: on ? 1 : 0.6 });
      }
      return { x: 0, y: 64, w: f.w, h: f.h - 64 };
    };

    const fieldMap = (g: G, r: Rect, nx: number, ny: number) => {
      const cw = r.w / nx;
      const ch = r.h / ny;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const x = (i + 0.5) / nx;
          const y = (j + 0.5) / ny; // 0 = electrode side
          const e = (0.3 + 0.55 * (1 - y)) * (1 + 1.1 * Math.exp(-((x - 0.5) ** 2 / 0.012 + y * y / 0.015)));
          g.fillStyle = interpolateViridis(clamp(e, 0, 1));
          g.globalAlpha = 0.9;
          g.fillRect(r.x + i * cw, r.y + j * ch, cw + 0.6, ch + 0.6);
        }
      }
      g.globalAlpha = 1;
      rect(g, r.x, r.y, r.w, r.h, { stroke: fg, alpha: 0.5 });
    };

    // 1 — TCAD + particle simulation
    const dTcad = (g: G, f: Fr) => {
      const P = strip(g, f, 0);
      const wide = wideOf(f);
      const tall = !wide && f.h >= 520;
      const fr: Rect = tall ? { x: 24, y: P.y + 30, w: f.w - 48, h: Math.min(230, (P.h - 170) * 0.5) } : wide ? { x: 40, y: P.y + 40, w: Math.min(300, f.w * 0.34), h: Math.min(260, P.h - 110) } : { x: 24, y: P.y + 30, w: f.w * 0.46, h: Math.min(150, P.h - 70) };
      fieldMap(g, fr, 40, 28);
      txt(g, L('tcadField'), fr.x, fr.y - 14, { alpha: 0.85 });
      // colour bar
      for (let i = 0; i < 40; i++) {
        g.fillStyle = interpolateViridis(i / 39);
        g.fillRect(fr.x + (fr.w * i) / 40, fr.y + fr.h + 8, fr.w / 40 + 0.5, 6);
      }
      txt(g, L('low'), fr.x, fr.y + fr.h + 26, { alpha: 0.7 });
      txt(g, L('high'), fr.x + fr.w, fr.y + fr.h + 26, { alpha: 0.7, align: 'right' });
      // simulated track through the cross-section
      const u = clamp(f.ts / 1.8);
      const tx = fr.x + fr.w * 0.5;
      ln(g, tx - 14, fr.y - 8, tx - 14 + 14 * u, fr.y - 8 + (fr.h + 8) * u, { color: accent2, alpha: 1, width: 1.5 });
      for (let i = 0; i < 14; i++) {
        const k = (i + 0.5) / 14;
        if (k < u) dot(g, tx - 14 + 14 * k, fr.y - 8 + (fr.h + 8) * k, 1.7, fg, 0.9);
      }
      // induced current pulse
      const pr: Rect = tall ? { x: 56, y: fr.y + fr.h + 80, w: f.w - 56 - 24, h: Math.min(230, P.h - (fr.h + 80 + 60)) } : wide ? { x: fr.x + fr.w + 80, y: fr.y, w: f.w - (fr.x + fr.w + 80) - 40, h: fr.h } : { x: fr.x + fr.w + 56, y: fr.y, w: f.w - (fr.x + fr.w + 56) - 20, h: fr.h };
      const pl = plot(g, ctx, pr, { min: 0, max: 20, label: 't (ns)', ticks: [0, 10, 20].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 1.8, label: L('current'), ticks: [] });
      pl.axes();
      const pulse = (t: number) => (t < 0 ? 0 : 0.5 * Math.exp(-t / 5) * (1 - Math.exp(-t / 0.4)) * 2.2 + 0.5 * Math.exp(-t / 1.6) * (1 - Math.exp(-t / 0.3)) * 1.4);
      pl.curve(pulse, { color: accent, width: 1.75, progress: ease(clamp((f.ts - 0.6) / 1.6)) }, 160);
      if (wide || f.w > 520) txt(g, L('tool'), P.x + 24, f.h - 14, { alpha: 0.65 });
    };

    // 2 — readout chain + design triangle
    const dAsic = (g: G, f: Fr) => {
      const P = strip(g, f, 1);
      const narrow = !wideOf(f);
      const bw = Math.min(150, (f.w - 80) / 3 - 24);
      const by = P.y + 14;
      const bh = narrow ? 56 : 74;
      const names = [L('amp'), L('shaper'), L('disc')];
      const gx = (f.w - (3 * bw + 2 * 34)) / 2;
      names.forEach((nm, i) => {
        const x = gx + i * (bw + 34);
        rect(g, x, by, bw, bh, { stroke: accent, alpha: 0.8, width: 1.25 });
        txt(g, nm, x + bw / 2, by + 12, { align: 'center', alpha: 0.9 });
        // waveform glyphs
        const wy = by + bh - 14;
        const pts: [number, number][] = [];
        for (let k = 0; k <= 30; k++) {
          const t = k / 30;
          let v = 0;
          if (i === 0) v = t < 0.2 ? 0 : 1 - 0.25 * (t - 0.2);
          else if (i === 1) v = t < 0.2 ? 0 : ((t - 0.2) / 0.2) * Math.exp(1 - (t - 0.2) / 0.2) * 0.9;
          else v = t > 0.25 && t < 0.55 ? 1 : 0;
          pts.push([x + 12 + t * (bw - 24), wy - v * (bh - 40)]);
        }
        poly(g, pts, { color: accent2, alpha: 0.95, width: 1.5 });
        if (i === 2) ln(g, x + 12, wy - (bh - 40) * 0.5, x + bw - 12, wy - (bh - 40) * 0.5, { alpha: 0.5, dash: [3, 3] });
        if (i < 2) arrow(g, x + bw + 4, by + bh / 2, x + bw + 30, by + bh / 2, { alpha: 0.7 });
      });
      txt(g, L('inputSignal'), gx - 4, by + bh + 14, { alpha: 0.65 });
      // trade-off triangle: noise / threshold / power
      const th0 = (f.h - 22 - (by + bh + 44)) / 0.95;
      const th = Math.min(th0, f.h >= 520 ? 300 : 170);
      const cx = f.w / 2;
      const ty = by + bh + 44;
      const V: [number, number][] = [[cx, ty], [cx - th * 0.62, ty + th * 0.95], [cx + th * 0.62, ty + th * 0.95]];
      poly(g, V, { close: true, color: fg, alpha: 0.5, width: 1 });
      txt(g, L('noise'), V[0][0], V[0][1] - 10, { align: 'center', alpha: 0.9 });
      txt(g, L('threshold'), V[1][0], V[1][1] + 14, { align: 'center', alpha: 0.9 });
      txt(g, L('power'), V[2][0], V[2][1] + 14, { align: 'center', alpha: 0.9 });
      // design point settles at a compromise
      const k = ease(clamp(f.ts / 2.2));
      const w0 = [1, 0, 0];
      const w1 = [0.34, 0.38, 0.28];
      const w = w0.map((a, i) => a + (w1[i] - a) * k);
      const px = V.reduce((s, v, i) => s + v[0] * w[i], 0);
      const py = V.reduce((s, v, i) => s + v[1] * w[i], 0);
      dot(g, px, py, 4.5, accent, 1);
      txt(g, L('designPoint'), px + 10, py, { color: accent, alpha: k });
    };

    // 3 — probe station
    const dProbe = (g: G, f: Fr) => {
      const P = strip(g, f, 2);
      const wide = wideOf(f);
      const tall = !wide && f.h >= 520;
      const D = tall ? Math.min(f.w * 0.7, (P.h - 140) * 0.55) : Math.min(wide ? f.w * 0.4 : f.w * 0.5, P.h - 40);
      const cx = tall ? f.w / 2 : wide ? f.w * 0.3 : f.w * 0.28;
      const cy = tall ? P.y + D / 2 + 24 : P.y + P.h / 2 + 6;
      g.save();
      g.beginPath();
      g.arc(cx, cy, D / 2, 0, Math.PI * 2);
      g.strokeStyle = fg;
      g.globalAlpha = 0.5;
      g.stroke();
      g.clip();
      const dies = 8;
      const s = D / dies;
      for (let i = 0; i < dies; i++)
        for (let j = 0; j < dies; j++) rect(g, cx - D / 2 + i * s + 1, cy - D / 2 + j * s + 1, s - 2, s - 2, { fill: accent, fillAlpha: 0.1, stroke: accent, alpha: 0.35 });
      g.restore();
      // needle on one die
      const tx = cx + s * 0.6;
      const ty = cy - s * 0.4;
      const u = ease(clamp(f.ts / 1.2));
      ln(g, tx + 80 - 60 * u, ty - 90 + 60 * u, tx, ty, { color: accent2, alpha: 1, width: 1.5 });
      dot(g, tx, ty, 2.5, accent2, u);
      txt(g, L('probeNeedle'), tx + 24, ty - 70, { alpha: 0.85 * u, color: accent2 });
      rect(g, tx - s / 2 + 1, ty - s / 2 + 1, s - 2, s - 2, { stroke: accent2, alpha: 0.9 * u });
      txt(g, L('waferDies'), cx, cy + D / 2 + 16, { align: 'center', alpha: 0.7 });
      // I–V inset
      const pr: Rect = tall ? { x: 56, y: cy + D / 2 + 70, w: f.w - 56 - 40, h: Math.max(80, P.h - (D + 24 + 70 + 50)) } : wide ? { x: f.w * 0.58, y: P.y + 36, w: f.w * 0.34, h: P.h - 110 } : { x: f.w * 0.58, y: P.y + 34, w: f.w * 0.34, h: P.h - 100 };
      const pl = plot(g, ctx, pr, { min: 0, max: 300, label: 'V', ticks: [] }, { min: 0.1, max: 300, log: true, label: 'I', ticks: [] });
      pl.axes();
      const I = (V: number) => 0.12 + 0.88 * Math.sqrt(Math.min(V, 70) / 70) + 0.5 * Math.exp((V - 230) / 9);
      pl.curve(I, { color: accent, width: 1.75, progress: ease(clamp((f.ts - 0.8) / 1.6)) }, 200);
      txt(g, L('ivCv'), pr.x, pr.y - 22, { alpha: 0.85 });
    };

    // 4 — radioactive sources
    const dSource = (g: G, f: Fr) => {
      const P = strip(g, f, 3);
      const narrow = !wideOf(f);
      const sw = Math.min(f.w - 80, 520);
      const sx = (f.w - sw) / 2;
      const sy = P.y + Math.min(P.h - 74, 300);
      slab(g, sx, sy, sw, 26, accent, 0.14);
      const x1 = sx + sw * 0.25;
      const x2 = sx + sw * 0.75;
      // 90Sr
      rect(g, x1 - 22, P.y + 22, 44, 18, { fill: accent2, fillAlpha: 0.4, stroke: accent2, alpha: 0.9 });
      txt(g, '⁹⁰Sr', x1, P.y + 31, { align: 'center', mono: true, alpha: 1 });
      const u = ease(clamp(f.ts / 1.5));
      [-12, 0, 12].forEach((d, i) => {
        const yy = P.y + 44 + (sy + 26 - (P.y + 44)) * u;
        ln(g, x1 + d * 0.5, P.y + 44, x1 + d * 0.5 + d * 0.3 * u, yy, { color: accent2, alpha: 0.9, width: 1.25 });
        if (u > 0.9) for (let k = 0; k < 6; k++) dot(g, x1 + d * 0.5 + d * 0.3 * ((sy - P.y - 44 + 26 * (k / 5)) / (sy + 26 - P.y - 44)), sy + 26 * (k / 5), 1.5, fg, 0.9);
        void i;
      });
      txt(g, L('srLabel'), x1, P.y + 8, { align: 'center', alpha: 0.9 });
      txt(g, `≈ ${fmt(SC.MIP_CHARGE_300UM_E.value as number)} e⁻`, x1, sy + 46, { align: 'center', mono: true, color: accent, alpha: u > 0.9 ? 1 : 0 });
      // 55Fe
      rect(g, x2 - 22, P.y + 22, 44, 18, { fill: accent2, fillAlpha: 0.4, stroke: accent2, alpha: 0.9 });
      txt(g, '⁵⁵Fe', x2, P.y + 31, { align: 'center', mono: true, alpha: 1 });
      const yAbs = sy + 9;
      const photonEnd = P.y + 44 + (yAbs - P.y - 44) * u;
      ln(g, x2, P.y + 44, x2, photonEnd, { color: fg, alpha: 0.9, width: 1.25, dash: [4, 3] });
      if (u > 0.95) {
        for (let k = 0; k < 14; k++) dot(g, x2 + Math.cos(k * 1.7) * 5, yAbs + Math.sin(k * 2.3) * 4, 1.4, accent, 0.95);
        txt(g, `≈ ${fmt(SC.FE55_PAIRS.value as number)} e⁻`, x2, sy + 46, { align: 'center', mono: true, color: accent, alpha: 1 });
      }
      txt(g, L('feLabel'), x2, P.y + 8, { align: 'center', alpha: 0.9 });
      if (!narrow) txt(g, L('sensorNote'), f.w - 16, f.h - 14, { align: 'right', alpha: 0.55 });
    };

    // 5 — laser scan (TCT / TPA-TCT)
    const dTct = (g: G, f: Fr) => {
      const P = strip(g, f, 4);
      const wide = wideOf(f);
      const sw = wide ? f.w * 0.4 : f.w * 0.84;
      const sx = wide ? 40 : (f.w - sw) / 2;
      const sh = wide ? Math.min(70, P.h * 0.22) : Math.min(60, P.h * 0.16);
      const sy = wide ? P.y + P.h * 0.5 : P.y + 50;
      slab(g, sx, sy, sw, sh, accent, 0.14);
      const u = f.ts > 1e2 ? 1 : clamp(f.ts / 4);
      const lx = sx + sw * (0.08 + 0.84 * u);
      const fy = sy + sh * 0.6;
      ln(g, lx - 14, sy - 40, lx, fy, { color: fg, alpha: 0.8, width: 1 });
      ln(g, lx + 14, sy - 40, lx, fy, { color: fg, alpha: 0.8, width: 1 });
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#ff8a8a';
      g.globalAlpha = 0.9;
      g.beginPath();
      g.arc(lx, fy, 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
      txt(g, L('laser'), sx, wide ? sy - 52 : sy - 14, { alpha: 0.85 });
      if (wide) txt(g, L('tpa'), lx + 10, fy + 14, { alpha: 0.75, color: '#ff8a8a' });
      else txt(g, L('tpa'), sx + sw, sy - 14, { alpha: 0.75, color: '#ff8a8a', align: 'right' });
      if (wide || f.h > 450) {
        arrow(g, sx, sy + sh + 20, sx + sw, sy + sh + 20, { alpha: 0.5 });
        txt(g, L('scan'), sx + sw / 2, sy + sh + 36, { align: 'center', alpha: 0.7 });
      }
      // charge map
      const mr: Rect = wide ? { x: f.w * 0.55, y: P.y + 36, w: f.w * 0.38, h: Math.min(P.h - 100, f.w * 0.26) } : { x: sx, y: f.h > 450 ? P.y + P.h * 0.58 : sy + sh + 40, w: sw, h: f.h > 450 ? P.h * 0.3 : Math.max(60, f.h - (sy + sh + 40) - 16) };
      const nx = 24;
      const ny = 10;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          if ((i + 0.5) / nx > u) continue;
          const px = ((i + 0.5) / nx) * 4; // 4 pixels across
          const py = ((j + 0.5) / ny) * 2;
          const c = 0.55 + 0.4 * Math.cos(Math.PI * (px % 1 - 0.5)) ** 2 * Math.cos(Math.PI * (py % 1 - 0.5)) ** 2;
          g.fillStyle = interpolateViridis(clamp(c));
          g.fillRect(mr.x + (i * mr.w) / nx, mr.y + (j * mr.h) / ny, mr.w / nx + 0.6, mr.h / ny + 0.6);
        }
      }
      rect(g, mr.x, mr.y, mr.w, mr.h, { stroke: fg, alpha: 0.5 });
      txt(g, L('chargeMap'), mr.x, mr.y - 14, { alpha: 0.85 });
    };

    // 6 — test beam
    const dBeam = (g: G, f: Fr) => {
      const P = strip(g, f, 5);
      const yc = P.y + P.h / 2;
      const zs = [-3, -2, -1, 0, 1, 2, 3];
      const X = (i: number) => f.w / 2 + i * Math.min(110, (f.w - 100) / 7);
      const H = Math.min(P.h * 0.5, 130);
      const u = f.ts > 1e2 ? 1 : clamp(f.ts / 2);
      zs.forEach((z) => {
        const dut = z === 0;
        rect(g, X(z) - 2, yc - H / 2 - (dut ? 8 : 0), 4, H + (dut ? 16 : 0), { fill: dut ? accent : fg, fillAlpha: dut ? 0.6 : 0.25, stroke: dut ? accent : fg, alpha: dut ? 0.9 : 0.5 });
      });
      arrow(g, X(-3) - 70, yc, X(-3) - 14, yc, { alpha: 0.8 });
      ln(g, X(-3) - 14, yc, X(-3) + (X(3) - X(-3) + 60) * u, yc, { color: accent2, alpha: 0.95, width: 1.5 });
      zs.forEach((z) => X(z) < X(-3) + (X(3) - X(-3) + 60) * u && dot(g, X(z), yc, z === 0 ? 3.5 : 2.5, z === 0 ? accent : accent2, 1));
      txt(g, L('beam'), X(-3) - 70, yc - 16, { alpha: 0.8 });
      txt(g, L('dut'), X(0), yc + H / 2 + 26, { align: 'center', color: accent, alpha: 1 });
      txt(g, L('telescope'), (X(-3) + X(-1)) / 2, yc - H / 2 - 16, { align: 'center', alpha: 0.75 });
      txt(g, L('telescope'), (X(1) + X(3)) / 2, yc - H / 2 - 16, { align: 'center', alpha: 0.75 });
      txt(g, L('beamNext'), f.w / 2, f.h - 16, { align: 'center', alpha: 0.65 });
    };

    // 7 — irradiation
    const dIrr = (g: G, f: Fr) => {
      const P = strip(g, f, 6);
      const sw = Math.min(f.w * 0.55, 420);
      const sh = Math.min(P.h * 0.4, 110);
      const sx = f.w / 2 - sw / 2 + 30;
      const sy = P.y + P.h / 2 - sh / 2 + 6;
      const phi = 1e15 * (f.ts > 1e2 ? 1 : ease(clamp(f.ts / 4)));
      slab(g, sx, sy, sw, sh, accent, 0.12);
      // neutrons: arrows from the left, density ∝ Φ
      const n = 7;
      for (let i = 0; i < n; i++) arrow(g, sx - 60, sy + ((i + 0.5) * sh) / n, sx - 8, sy + ((i + 0.5) * sh) / n, { color: accent2, alpha: 0.85 });
      txt(g, L('neutrons'), sx - 60, sy - 14, { color: accent2, alpha: 0.9 });
      // defects accumulate with the fluence
      const nd = Math.round(60 * (phi / 1e15));
      for (let i = 0; i < nd; i++) {
        const x = sx + 6 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * (sw - 12);
        const y = sy + 5 + ((Math.sin(i * 78.233) * 12345.6789) % 1 + 1) % 1 * (sh - 10);
        ln(g, x - 2.5, y - 2.5, x + 2.5, y + 2.5, { color: fg, alpha: 0.8 });
        ln(g, x - 2.5, y + 2.5, x + 2.5, y - 2.5, { color: fg, alpha: 0.8 });
      }
      txt(g, `Φ_eq = ${phi > 1 ? sci(phi) : '0'} n_eq/cm²`, sx, sy + sh + 28, { mono: true, color: accent, alpha: 1 });
      txt(g, L('then'), sx, sy + sh + 48, { alpha: 0.7 });
    };

    // 8 — integration (exploded stave)
    const dBuild = (g: G, f: Fr) => {
      const P = strip(g, f, 7);
      const u = ease(clamp(f.ts / 1.6));
      const layers = [
        { k: 'sensors', c: accent, hatch: false },
        { k: 'flex', c: accent2, hatch: false },
        { k: 'cold', c: fg, hatch: false },
        { k: 'carbon', c: fg, hatch: true },
      ];
      const lw = Math.min(f.w * 0.5, 380);
      const lx = Math.max(24, f.w * 0.5 - lw * 0.7);
      const gap = Math.min(54, (P.h - 70) / 4) * u + 10;
      const top = P.y + P.h * 0.5 - (gap * 3) / 2 - 8;
      layers.forEach((l, i) => {
        const y = top + i * gap;
        const lh = 12;
        poly(g, [[lx, y + lh], [lx + 30, y], [lx + lw + 30, y], [lx + lw, y + lh]], { close: true, fill: l.c, fillAlpha: l.hatch ? 0.05 : 0.2, color: l.c, alpha: 0.85, width: 1.25 });
        if (l.hatch) hatch(g, lx, y, lw, lh, l.c, 6, 0.3);
        if (l.k === 'cold') ln(g, lx + 40, y + 7, lx + lw - 10, y + 7, { color: accent, alpha: 0.7, dash: [6, 3] });
        txt(g, L(l.k), lx + lw + 44, y + 6, { alpha: 0.9 });
      });
      txt(g, L('stave'), lx, P.y + 10, { alpha: 0.75 });
    };

    return fadeStage(ctx, {
      states: STATES,
      draws: { tcad: dTcad, asic: dAsic, probe: dProbe, source: dSource, tct: dTct, testbeam: dBeam, irradiation: dIrr, integration: dBuild },
      anim: 5,
    });
  },
};
export default mod;

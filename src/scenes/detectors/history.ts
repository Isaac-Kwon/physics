/**
 * det.history — the principle of each era's detector drawn as a schematic with a track (not photographs).
 *   scintillation screen (1909): isolated flashes, one per alpha, counted by eye.
 *   cloud chamber (1911): droplets condense on ions; a lead plate in a magnetic field (Anderson's positron, 1932): the curve tightens after the plate.
 *   emulsion (1947): silver grains along the path; grain density ∝ dE/dx (same Bethe–Bloch function as the widget), so a stopping pion gets denser,
 *     then the muon from π→μν leaves at a kink.
 *   bubble chamber (1952): bubbles along every charged path; curvature = momentum; interaction vertex, a neutral V⁰, a spiralling low-energy electron.
 *   wire chamber (1968): planes of wires; the wire nearest the track fires; a straight line fitted through the fired wires; pulse trace.
 *   electronic (1980s →): one event: electron stops in the ECAL, muon passes through; hits and energy-deposit bars (viridis).
 */
import type { SceneModule } from '../shared/types';
import { clamp, mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { betaOf, dEdx } from '../../components/widgets/_physics';
import { arcPoints, createStage, dot, fieldMark, glow, hash01, line, makeLayer, poly, rgba, txt, viridisLit, type Env, type G, type Rect } from './_d1-common';

const STATES = ['scintillation-screen', 'cloud-chamber', 'emulsion', 'bubble-chamber', 'wire-chamber', 'electronic'] as const;
type P = Record<(typeof STATES)[number], number>;
const TARGETS = Object.fromEntries(STATES.map((s) => [s, Object.fromEntries(STATES.map((t) => [t, t === s ? 1 : 0]))])) as Record<string, P>;
const YEARS = ['1909', '1911', '1947', '1952', '1968', '1980s'];
const KEYS = ['screen', 'cloud', 'emulsion', 'bubble', 'wire', 'electronic'];

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const { accent, accent2, fg, bg } = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const layers = STATES.map(() => makeLayer());

    const head = (g: G, R: Rect, key: string) => {
      txt(g, L(key + 'Name'), R.x, R.y - 14, { bold: true, alpha: 0.95 });
      txt(g, L(key + 'Readout'), R.x + R.w, R.y - 14, { align: 'right', alpha: 0.6 });
    };

    // ---------------------------------------------------------------- 1909 scintillation screen
    const FLASH_DT = 0.42;
    const flashT = (k: number) => k * FLASH_DT + (hash01(k) - 0.5) * 0.2;
    const screen = (g: G, R: Rect, e: Env) => {
      head(g, R, 'screen');
      const sx = R.x + R.w * 0.14;
      const sy = R.y + R.h * 0.5;
      const scrX = R.x + R.w * 0.8;
      const T = e.reduced ? 4.6 : e.t + 2.5;
      g.fillStyle = rgba(accent, 0.1);
      g.strokeStyle = rgba(fg, 0.45);
      g.lineWidth = 1;
      g.fillRect(scrX - 3, R.y + R.h * 0.06, 6, R.h * 0.88);
      g.strokeRect(scrX - 3, R.y + R.h * 0.06, 6, R.h * 0.88);
      dot(g, sx, sy, 3, fg, 0.9);
      txt(g, L('screenSource'), sx, sy + 18, { align: 'center', alpha: 0.7 });
      txt(g, L('screenZns'), scrX, R.y + R.h * 0.06 - 12, { align: 'center', alpha: 0.7 });
      const kMax = Math.floor(T / FLASH_DT) + 1;
      let n = Math.max(0, kMax - 4);
      for (let k = Math.max(0, kMax - 4); k <= kMax; k++) {
        const tk = flashT(k);
        if (tk > T) continue;
        n++;
        const age = T - tk;
        if (age > 1.6) continue;
        const yk = sy + Math.tan((hash01(k + 99) - 0.5) * Math.PI * 0.78) * R.h * 0.07;
        const y = clamp(yk, R.y + R.h * 0.1, R.y + R.h * 0.9);
        const a = Math.exp(-age / 0.28);
        if (age < 0.14) line(g, sx, sy, scrX, y, accent2, 0.35 * (1 - age / 0.14), 1, [3, 4]);
        glow(g, scrX, y, 16, accent, 0.95 * a);
        glow(g, scrX, y, 5, accent2, 0.9 * a);
      }
      txt(g, L('screenTally') + ' ' + n, R.x + R.w * 0.5, R.y + R.h - 6, { mono: true, align: 'center', alpha: 0.85 });
    };

    // ---------------------------------------------------------------- 1911 cloud chamber (positron through a plate, 1932)
    const cloud = (g: G, R: Rect, e: Env) => {
      head(g, R, 'cloud');
      const bw = Math.min(R.w * 0.9, R.h * 0.95);
      const bx = R.x + (R.w - bw) / 2;
      const by = R.y;
      const bh = R.h;
      g.strokeStyle = rgba(fg, 0.5);
      g.lineWidth = 1;
      g.strokeRect(bx, by, bw, bh);
      const py = by + bh * 0.46;
      g.fillStyle = rgba(fg, 0.5);
      g.fillRect(bx + bw * 0.12, py - 2.5, bw * 0.76, 5);
      txt(g, L('cloudPlate'), bx + bw * 0.88, py + 12, { align: 'right', alpha: 0.7 });
      fieldMark(g, bx + 16, by + 16, true, fg);
      txt(g, 'B', bx + 30, by + 16, { mono: true, alpha: 0.7 });
      // path: R1 below the plate, R2 (smaller: lower momentum) above it. Positive charge, B out of the page: turns to the right.
      const start: [number, number] = [bx + bw * 0.3, by + bh - 2];
      const R1 = bh * 1.25;
      const R2 = R1 * 0.5;
      const below: [number, number][] = [start];
      let a = -Math.PI / 2;
      let [x, y] = start;
      while (y > py) {
        a += 1 / R1;
        x += Math.cos(a);
        y += Math.sin(a);
        below.push([x, y]);
      }
      const above: [number, number][] = [[x, y]];
      while (y > by + 4 && x < bx + bw - 4) {
        a += 1 / R2;
        x += Math.cos(a);
        y += Math.sin(a);
        above.push([x, y]);
      }
      const all = below.concat(above);
      const cyc = e.reduced ? 1.3 : e.t % 3.0;
      const grow = e.reduced ? 1 : clamp(cyc / 0.9);
      const nHead = Math.floor(all.length * grow);
      for (let i = 0; i < nHead; i += 1) {
        const age = e.reduced ? 0.3 : Math.max(0, cyc - (i / all.length) * 0.9);
        const al = 0.9 * Math.exp(-age / 0.9);
        if (al < 0.02) continue;
        const jx = (hash01(i) - 0.5) * 1.6;
        const jy = (hash01(i + 7) - 0.5) * 1.6;
        dot(g, all[i][0] + jx, all[i][1] + jy, 1.6, fg, Math.min(1, al * 1.2));
      }
      txt(g, 'e⁺', start[0] + 12, by + bh - 12, { alpha: 0.9 });
      const mid = above[Math.min(above.length - 1, Math.floor(above.length * 0.55))];
      txt(g, L('cloudTighter'), Math.min(mid[0] + 12, bx + bw - 4), mid[1], { align: mid[0] + 12 > bx + bw * 0.55 ? 'right' : 'left', alpha: 0.7 });
    };

    // ---------------------------------------------------------------- 1947 emulsion
    const rngEm = mulberry32(47);
    const emulsion = (g: G, R: Rect, e: Env) => {
      head(g, R, 'emulsion');
      const pl = { x: R.x, y: R.y + R.h * 0.1, w: R.w, h: R.h * 0.72 };
      g.fillStyle = rgba(fg, 0.8);
      g.fillRect(pl.x, pl.y, pl.w, pl.h);
      const grains = emulsionGrains(pl, rngEm);
      const k = e.reduced ? 1 : clamp(e.ts / 1.8);
      g.fillStyle = rgba(bg, 0.92);
      const nShow = Math.floor(grains.pts.length * k);
      for (let i = 0; i < nShow; i++) {
        g.beginPath();
        g.arc(grains.pts[i][0], grains.pts[i][1], 1.35, 0, Math.PI * 2);
        g.fill();
      }
      const lx = (x: number, y: number, s: string, dx: number, dy: number, al = 0.8) => {
        line(g, x, y, x + dx, y + dy, fg, 0.5, 1);
        txt(g, s, x + dx, y + dy + (dy > 0 ? 9 : -9), { align: 'center', alpha: al });
      };
      if (k > 0.5) lx(grains.start[0] + 20, grains.start[1] - 4, L('emulsionPion'), 0, -(pl.y - R.y) * 0.35 - 8);
      if (k > 0.95) {
        lx(grains.stop[0], grains.stop[1] + 3, L('emulsionStop'), 0, pl.y + pl.h - grains.stop[1] + 8);
        lx(grains.end[0], grains.end[1] - 3, L('emulsionMuon'), 0, pl.y - grains.end[1] - 8);
      }
      txt(g, L('emulsionNote'), R.x, pl.y + pl.h + 40, { alpha: 0.65 });
    };
    const emulsionGrains = (() => {
      let cache: { key: string; v: { pts: [number, number][]; start: [number, number]; stop: [number, number]; end: [number, number] } } | null = null;
      return (pl: Rect, rnd: () => number) => {
        const key = [pl.x, pl.y, pl.w, pl.h].map((v) => Math.round(v)).join(',');
        if (cache?.key === key) return cache.v;
        const pts: [number, number][] = [];
        const start: [number, number] = [pl.x + pl.w * 0.06, pl.y + pl.h * 0.22];
        const Lpi = pl.w * 0.46;
        const ang = 0.34;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const p0 = 0.07; // GeV/c, a ~16 MeV pion near the end of its range
        const walk = (x0: number, y0: number, cs: number, sn: number, len: number, m: number, pStart: number, density: number) => {
          let x = x0;
          let y = y0;
          const step = 0.8;
          for (let s = 0; s < len; s += step) {
            const p = Math.max(0.004, pStart * Math.pow((len - s) / len, 0.3));
            const rel = Math.min(14, dEdx(p, m) / dEdx(0.5, 0.13957)); // relative to a minimum-ionizing particle
            if (rnd() < density * rel * step) pts.push([x + (rnd() - 0.5) * 1.8 * -sn, y + (rnd() - 0.5) * 1.8 * cs]);
            x += cs * step;
            y += sn * step;
          }
          return [x, y] as [number, number];
        };
        const stop = walk(start[0], start[1], ca, sa, Lpi, 0.13957, p0, 1 / 7);
        // π→μν at rest: the muon (29.8 MeV/c, range ≈ 1/3.7 of the pion's here) leaves at a kink
        const mAng = ang - 2.2;
        const end = walk(stop[0], stop[1], Math.cos(mAng), Math.sin(mAng), Lpi / 3.7, 0.10566, 0.0298, 1 / 7);
        void betaOf;
        cache = { key, v: { pts, start, stop, end } };
        return cache.v;
      };
    })();

    // ---------------------------------------------------------------- 1952 bubble chamber
    const bubbleTrack = (g: G, pts: [number, number][], spacing: number, al: number, seed: number) => {
      g.save();
      g.strokeStyle = fg;
      g.lineWidth = 1;
      g.globalAlpha = al;
      let acc = 0;
      let nxt = spacing * (0.4 + hash01(seed));
      let k = 0;
      for (let i = 1; i < pts.length; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        while (acc >= nxt) {
          acc -= nxt;
          nxt = spacing * (0.5 + hash01(seed * 131 + ++k));
          g.beginPath();
          g.arc(pts[i][0], pts[i][1] + (hash01(seed + k * 7) - 0.5) * 1.2, 1.15 + hash01(seed + k * 3) * 0.7, 0, Math.PI * 2);
          g.stroke();
        }
      }
      g.restore();
    };
    const bubble = (g: G, R: Rect, e: Env) => {
      head(g, R, 'bubble');
      g.strokeStyle = rgba(fg, 0.4);
      g.lineWidth = 1;
      g.strokeRect(R.x, R.y, R.w, R.h);
      g.save();
      g.beginPath();
      g.rect(R.x, R.y, R.w, R.h);
      g.clip();
      const k = e.reduced ? 1 : clamp(e.ts / 1.6);
      const vx = R.x + R.w * 0.34;
      const vy = R.y + R.h * 0.5;
      const sc = R.h / 300;
      const mip = 7 * Math.max(0.8, sc * 1.3); // px between bubbles for a fast particle
      fieldMark(g, R.x + 16, R.y + 16, true, fg);
      txt(g, 'B', R.x + 30, R.y + 16, { mono: true, alpha: 0.7 });
      // beam: five nearly parallel fast tracks, the middle one interacts at the vertex
      for (let i = -2; i <= 2; i++) {
        const y0 = vy + i * 14 * sc + 2;
        const len = i === 0 ? vx - R.x : R.w;
        const pts = arcPoints(R.x, y0, 0, 2400 * sc, len * k, 1.5);
        bubbleTrack(g, pts, mip, 0.7, 11 + i);
      }
      // a delta electron spiralling in from the beam track at 18 % of the width
      {
        const sx0 = R.x + R.w * 0.14;
        const sy0 = vy - 28 * sc + 2;
        const pts: [number, number][] = [[sx0, sy0]];
        let a = -1.0;
        let x = sx0;
        let y = sy0;
        const S = 330 * sc;
        for (let s = 0; s < S * k; s += 1) {
          const Rr = 34 * sc * Math.pow(1 - s / S, 0.7) + 3;
          a -= 1 / Rr;
          x += Math.cos(a);
          y += Math.sin(a);
          pts.push([x, y]);
        }
        bubbleTrack(g, pts, mip * 0.55, 0.8, 71);
        if (k > 0.9) txt(g, L('bubbleSpiral'), sx0 + 24 * sc, sy0 - 52 * sc, { alpha: 0.7 });
      }
      // outgoing charged tracks: [angle, signed radius (px, + = clockwise on screen), length, relative ionization]
      const out: [number, number, number, number][] = [
        [-0.62, -300, 0.62, 1.1],
        [-0.2, 190, 0.7, 1.0],
        [0.15, -140, 0.66, 1.8],
        [0.5, 90, 0.5, 2.6],
      ];
      out.forEach(([a0, Rr, l, rel], i) => {
        const pts = arcPoints(vx, vy, a0, Rr * sc, R.w * l * k, 1.5);
        bubbleTrack(g, pts, mip / rel, 0.85, 31 + i);
      });
      // neutral V0: invisible path, then two charged tracks from where it decays
      {
        const a0 = -0.95;
        const d = 120 * sc * k;
        line(g, vx, vy, vx + Math.cos(a0) * 120 * sc, vy + Math.sin(a0) * 120 * sc, fg, 0.45 * k, 1, [3, 4]);
        if (k > 0.6) {
          const x1 = vx + Math.cos(a0) * 120 * sc;
          const y1 = vy + Math.sin(a0) * 120 * sc;
          bubbleTrack(g, arcPoints(x1, y1, a0 - 0.35, 160 * sc, R.w * 0.28 * (k - 0.6) / 0.4, 1.5), mip, 0.85, 51);
          bubbleTrack(g, arcPoints(x1, y1, a0 + 0.3, -120 * sc, R.w * 0.28 * (k - 0.6) / 0.4, 1.5), mip / 1.4, 0.85, 52);
          if (k > 0.98) txt(g, L('bubbleV0'), x1 - 14, R.y + 14, { align: 'right', alpha: 0.7 });
        }
        void d;
      }
      dot(g, vx, vy, 2.2, accent, 0.95 * k);
      g.restore();
      txt(g, L('bubbleBeam'), R.x + 10, vy + 46 * sc + 18, { alpha: 0.7 });
      if (k > 0.9) txt(g, L('bubbleVertex'), vx + 4, R.y + R.h - 12, { align: 'center', alpha: 0.8 });
    };

    // ---------------------------------------------------------------- 1968 wire chamber
    const wire = (g: G, R: Rect, e: Env) => {
      head(g, R, 'wire');
      const area: Rect = { x: R.x, y: R.y + 6, w: Math.min(R.w * 0.62, R.h * 1.2), h: R.h - 12 };
      const nW = 14;
      const nP = 8;
      const pitch = area.w / nW;
      const rowH = area.h / (nP - 1);
      const k = e.reduced ? 1 : clamp(e.ts / 1.6);
      // a straight track
      const x0 = area.x + area.w * 0.14;
      const x1 = area.x + area.w * 0.86;
      const trackX = (y: number) => x1 + ((y - area.y) / area.h) * (x0 - x1);
      const hits: [number, number][] = [];
      for (let r = 0; r < nP; r++) {
        const y = area.y + r * rowH;
        const off = (r % 2) * 0.5 * pitch;
        const tx = trackX(y);
        const near = Math.round((tx - area.x - off - pitch / 2) / pitch);
        const hitIdx = clamp(near, 0, nW - 1);
        const hitX = area.x + off + pitch / 2 + hitIdx * pitch;
        const reached = (area.y + area.h - y) / area.h <= k;
        for (let i = 0; i < nW; i++) {
          const wx = area.x + off + pitch / 2 + i * pitch;
          if (i === hitIdx && reached) {
            dot(g, wx, y, 3.4, accent, 1);
            hits.push([wx, y]);
          } else dot(g, wx, y, 1.5, fg, 0.35);
        }
        void hitX;
      }
      // fitted line through the fired wires (least squares x = a + b y)
      if (hits.length > 2) {
        const n = hits.length;
        const sy = hits.reduce((s, h) => s + h[1], 0);
        const sx = hits.reduce((s, h) => s + h[0], 0);
        const syy = hits.reduce((s, h) => s + h[1] * h[1], 0);
        const sxy = hits.reduce((s, h) => s + h[0] * h[1], 0);
        const b = (n * sxy - sx * sy) / (n * syy - sy * sy);
        const a = (sx - b * sy) / n;
        const yA = area.y - 4;
        const yB = area.y + area.h + 4;
        line(g, a + b * yA, yA, a + b * yB, yB, accent2, 0.9, 1);
      }
      txt(g, L('wireNote'), area.x, area.y + area.h + 16, { alpha: 0.65 });
      txt(g, L('wireHit') + ' ' + hits.length + ' / ' + nP, area.x + area.w, area.y + area.h + 16, { mono: true, align: 'right', alpha: 0.8 });
      // pulse trace
      const pr: Rect = { x: area.x + area.w + Math.min(70, R.w * 0.12), y: R.y + 30, w: Math.max(60, R.x + R.w - (area.x + area.w) - Math.min(70, R.w * 0.12) - 12), h: Math.min(120, R.h * 0.4) };
      if (pr.w > 70) {
        const pl = plot(g, ctx, pr, { min: 0, max: 1, label: L('wireTime'), ticks: [] }, { min: 0, max: 1.05, label: L('wireSignal'), ticks: [] });
        pl.axes();
        const f = (x: number) => (Math.exp(-x / 0.3) - Math.exp(-x / 0.04)) / 0.5;
        pl.curve(f, { color: accent, width: 1.5, progress: k }, 160);
        txt(g, L('wirePulse'), pr.x, pr.y + pr.h + 40, { alpha: 0.65 });
      }
    };

    // ---------------------------------------------------------------- 1980s electronic detectors
    const electronic = (g: G, R: Rect, e: Env) => {
      head(g, R, 'electronic');
      const k = e.reduced ? 1 : clamp(e.ts / 1.8);
      const vx = R.x + R.w * 0.05;
      const cy = R.y + R.h * 0.46;
      const H = R.h * 0.78;
      const top = cy - H / 2;
      const fx = (f: number) => R.x + R.w * f;
      // layers
      const pix = [0.1, 0.13, 0.16];
      const strips = [0.22, 0.265, 0.31, 0.355];
      for (const f of pix.concat(strips)) line(g, fx(f), cy - H * (f < 0.2 ? 0.14 : 0.3), fx(f), cy + H * (f < 0.2 ? 0.14 : 0.3), fg, 0.35, 1);
      const nE = 11;
      const eRect: Rect = { x: fx(0.43), y: top + H * 0.08, w: R.w * 0.12, h: H * 0.84 };
      const hRect: Rect = { x: fx(0.58), y: top, w: R.w * 0.2, h: H };
      g.strokeStyle = rgba(fg, 0.4);
      g.lineWidth = 1;
      g.strokeRect(eRect.x, eRect.y, eRect.w, eRect.h);
      g.strokeRect(hRect.x, hRect.y, hRect.w, hRect.h);
      const nH = 7;
      g.strokeStyle = rgba(fg, 0.15);
      for (let i = 1; i < nE; i++) line(g, eRect.x, eRect.y + (i * eRect.h) / nE, eRect.x + eRect.w, eRect.y + (i * eRect.h) / nE, fg, 0.15);
      for (let i = 1; i < nH; i++) line(g, hRect.x, hRect.y + (i * hRect.h) / nH, hRect.x + hRect.w, hRect.y + (i * hRect.h) / nH, fg, 0.15);
      const mu = [0.84, 0.9, 0.96];
      for (const f of mu) line(g, fx(f), cy - H * 0.45, fx(f), cy + H * 0.45, fg, 0.35, 1);
      // tracks (angle, in px: electron up and curving, muon slightly down, nearly straight)
      const vy = cy;
      const ang = -0.1;
      const eTrack: [number, number][] = arcPoints(vx, vy, ang, 420, fx(0.5) - vx, 2);
      const mAng = 0.05;
      const mTrack: [number, number][] = arcPoints(vx, vy, mAng, -3200, fx(0.99) - vx, 2);
      const clip = (pts: [number, number][]) => pts.filter((p) => (p[0] - vx) / (fx(0.99) - vx) <= k);
      poly(g, clip(eTrack), accent, 0.9, 1.25);
      poly(g, clip(mTrack), accent2, 0.9, 1.25);
      dot(g, vx, vy, 2, fg, 0.9);
      // hits at layers
      const yAt = (pts: [number, number][], x: number) => {
        let best = pts[0];
        for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
        return best[1];
      };
      const reach = (x: number) => (x - vx) / (fx(0.99) - vx) <= k;
      for (const f of pix.concat(strips)) {
        const x = fx(f);
        for (const [tr, col] of [[eTrack, accent], [mTrack, accent2]] as [[number, number][], string][]) {
          if (x > tr[tr.length - 1][0] || !reach(x)) continue;
          const y = yAt(tr, x);
          if (f < 0.2) {
            g.fillStyle = col;
            g.fillRect(x - 1.8, y - 1.8, 3.6, 3.6);
          } else line(g, x, y - 5, x, y + 5, col, 1, 2);
        }
      }
      for (const f of mu) {
        const x = fx(f);
        if (!reach(x)) continue;
        const y = yAt(mTrack, x);
        g.strokeStyle = accent2;
        g.lineWidth = 1.25;
        g.beginPath();
        g.arc(x, y, 3.4, 0, Math.PI * 2);
        g.stroke();
      }
      // energy deposits: bar length from the front face of each cell ∝ deposited energy; colour = same quantity (viridis)
      const bar = (rx: number, ry: number, rw: number, rh: number, n: number, i: number, dep: number, maxLen: number) => {
        const cellH = rh / n;
        const len = maxLen * dep;
        g.fillStyle = viridisLit(dep);
        g.fillRect(rx + 1, ry + i * cellH + cellH * 0.18, Math.max(1.5, len), cellH * 0.64);
      };
      if (reach(eRect.x + 6)) {
        const ye = yAt(eTrack, eRect.x + eRect.w * 0.5);
        const ci = clamp(Math.floor(((ye - eRect.y) / eRect.h) * nE), 1, nE - 2);
        [[ci - 1, 0.28], [ci, 1], [ci + 1, 0.34]].forEach(([i, d]) => bar(eRect.x, eRect.y, eRect.w, eRect.h, nE, i, d, eRect.w - 4));
        const ym = yAt(mTrack, eRect.x + eRect.w * 0.5);
        bar(eRect.x, eRect.y, eRect.w, eRect.h, nE, clamp(Math.floor(((ym - eRect.y) / eRect.h) * nE), 0, nE - 1), 0.08, eRect.w - 4);
      }
      if (reach(hRect.x + 6)) {
        const ym = yAt(mTrack, hRect.x + hRect.w * 0.5);
        bar(hRect.x, hRect.y, hRect.w, hRect.h, nH, clamp(Math.floor(((ym - hRect.y) / hRect.h) * nH), 0, nH - 1), 0.14, hRect.w - 4);
      }
      // labels
      const ly = cy + H / 2 + 16;
      txt(g, L('elPixel'), fx(0.13), ly, { align: 'center', alpha: 0.7 });
      txt(g, L('elStrip'), fx(0.29), ly, { align: 'center', alpha: 0.7 });
      txt(g, L('elEcal'), eRect.x + eRect.w / 2, ly, { align: 'center', alpha: 0.7 });
      txt(g, L('elHcal'), hRect.x + hRect.w / 2, ly, { align: 'center', alpha: 0.7 });
      txt(g, L('elMuon'), fx(0.9), ly, { align: 'center', alpha: 0.7 });
      txt(g, 'e⁻', fx(0.5) + 8, yAt(eTrack, fx(0.5)) - 10, { color: accent, alpha: 0.95 });
      txt(g, 'μ', fx(0.99) - 4, yAt(mTrack, fx(0.98)) + 14, { color: accent2, alpha: 0.95, align: 'right' });
      txt(g, L('elBars'), R.x, R.y + R.h - 2, { alpha: 0.6 });
    };

    const draw = (g: G, s: { w: number; h: number }, P: P, env: Env) => {
      const { w, h } = s;
      const R: Rect = { x: 22, y: 50, w: w - 44, h: h - 50 - 62 };
      const fns = [screen, cloud, emulsion, bubble, wire, electronic];
      fns.forEach((fn, i) => {
        const a = P[STATES[i]];
        layers[i](g, w, h, a, (g2) => fn(g2, R, env.state === STATES[i] ? env : { ...env, ts: 1e3 }));
      });
      // timeline
      const ty = h - 26;
      const x0 = 40;
      const x1 = w - 40;
      line(g, x0, ty, x1, ty, fg, 0.3, 1);
      YEARS.forEach((yr, i) => {
        const x = x0 + ((x1 - x0) * i) / (YEARS.length - 1);
        const a = P[STATES[i]];
        dot(g, x, ty, 2.6 + a * 1.4, a > 0.5 ? accent : fg, 0.4 + 0.6 * a);
        txt(g, yr, x, ty + 15, { mono: true, align: 'center', alpha: 0.4 + 0.5 * a, color: a > 0.5 ? accent : undefined });
      });
      void smooth;
      void KEYS;
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, loop: ['scintillation-screen', 'cloud-chamber'], anim: { emulsion: 2, 'bubble-chamber': 2, 'wire-chamber': 2, electronic: 2 }, draw });
  },
};
export default mod;

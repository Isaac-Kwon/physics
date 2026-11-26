/**
 * hi.event-replay — simulated event displays (seeded, schematic; not real data).
 *
 * collider-high: ~3000 charged tracks, p_T = 0.15 GeV/c + exponential (⟨p_T⟩ = 0.5 GeV/c), uniform η in ±2.5, uniform φ,
 *   helices in B = 0.5 T along the beam (end view: circular arcs; short side view below when there is room). Tracks end where
 *   they leave the barrel (r = 1.5 m or |z| = 2.4 m): high-η tracks are short in the end view.
 * fixed-target-low: ~300 tracks, isotropic in the CM frame (γ_cm = 4.0, √s_NN ≈ 7.5 GeV) boosted into a forward cone,
 *   bent by a 1 T dipole (field out of the page), silicon stations and a time-of-flight wall.
 * Colour = p_T (inferno, 0.15 → 1.5 GeV/c, log). Entering a state replays the event: every track grows at ≈ c from the vertex.
 * Both panels are always drawn; the panel of the current state is bright.
 */
import { interpolateInferno } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, mulberry32 } from '../shared/canvas2d';
import { HI } from '../../data/heavy-ion';
import { arrow, label } from './_s2-draw';
import { sampleBoosted, sampleUniformEta, trace, type Track } from './_s2-tracks';

const STATES = ['collider-high', 'fixed-target-low'] as const;
const B_BARREL = HI.B_FIELD_BARREL_T.value as number;
const NBIN = 12;
const STEPS_C = 80;
const STEPS_F = 140;
const binOf = (pt: number) => Math.min(NBIN - 1, Math.floor(clamp(Math.log(pt / 0.15) / Math.log(10)) * NBIN));
const binColor = (b: number) => interpolateInferno(0.3 + 0.7 * ((b + 0.5) / NBIN));

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const lab = ctx.label;
    const fmt = ctx.formatNumber;
    const rnd = mulberry32(88);

    const nC = Math.round(3200 * ctx.quality);
    const nF = Math.round(330 * ctx.quality);
    const col = sampleUniformEta(rnd, nC, 2.5);
    for (const t of col) trace(t, () => [0, 0, B_BARREL], (x, y, z) => Math.hypot(x, y) < 1.5 && Math.abs(z) < 2.4, 0.05, STEPS_C);
    const fix = sampleBoosted(rnd, nF, 4.0, 0.45);
    const dip = (_x: number, _y: number, z: number): [number, number, number] => (z > 0.9 && z < 1.9 ? [0, 1, 0] : [0, 0, 0]);
    for (const t of fix) trace(t, dip, (x, y, z) => z < 4.0 && Math.abs(x) < 1.8 && Math.abs(y) < 1.8, 0.04, STEPS_F);
    const group = (ts: Track[]) => {
      const bins: Track[][] = Array.from({ length: NBIN }, () => []);
      for (const t of ts) bins[binOf(t.pt)].push(t);
      return bins;
    };
    const colBins = group(col);
    const fixBins = group(fix);

    let act = 0;
    let aL = 1;
    let aR = 0.3;
    let gL = 1;
    let gR = 1;
    let gLT = 1;
    let gRT = 1;
    const c = createCanvas2D(ctx, draw);

    /** Draw tracks, projected by `P` (reads indices of the xyz triplet), grown to fraction `gr` of `steps`. */
    function tracks(g: CanvasRenderingContext2D, bins: Track[][], P: (x: number, y: number, z: number) => [number, number], gr: number, steps: number, alpha: number, lw: number) {
      const cnt = Math.floor(gr * steps) + 1;
      g.lineWidth = lw;
      g.lineJoin = 'round';
      for (let b = 0; b < NBIN; b++) {
        g.strokeStyle = binColor(b);
        g.globalAlpha = alpha;
        g.beginPath();
        for (const t of bins[b]) {
          const n = Math.min(t.pts.length / 3, cnt);
          for (let i = 0; i < n; i++) {
            const [px, py] = P(t.pts[i * 3], t.pts[i * 3 + 1], t.pts[i * 3 + 2]);
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    function panelCollider(g: CanvasRenderingContext2D, x0: number, y0: number, pw: number, ph: number, a: number, gr: number) {
      g.save();
      g.translate(x0, y0);
      label(g, lab('colTitle'), 16, 24, th.fg, { alpha: a * 0.95 });
      label(g, `${fmt(col.length)} ${lab('tracks')}`, 16, 40, th.fg, { mono: true, alpha: a * 0.6 });
      const strip = ph >= 470 ? 150 : 0;
      const r = Math.min(pw / 2 - 14, (ph - 56 - strip) / 2);
      const s = r / 1.75;
      const cx = pw / 2;
      const cy = 52 + (ph - 56 - strip) / 2;
      g.strokeStyle = th.fg;
      g.lineWidth = 1;
      g.globalAlpha = a * 0.5;
      g.beginPath();
      g.arc(cx, cy, 1.5 * s, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = a * 0.28;
      g.beginPath();
      g.arc(cx, cy, 1.75 * s, 0, Math.PI * 2);
      g.stroke();
      tracks(g, colBins, (x, y) => [cx + x * s, cy - y * s], gr, STEPS_C, a * 0.5, 0.7);
      // field: out of the page in the end view (⊙)
      g.globalAlpha = a * 0.85;
      g.strokeStyle = th.fg;
      g.fillStyle = th.fg;
      g.beginPath();
      g.arc(cx + 1.75 * s - 14, cy + 1.45 * s, 4, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(cx + 1.75 * s - 14, cy + 1.45 * s, 1.2, 0, Math.PI * 2);
      g.fill();
      label(g, `B = ${fmt(B_BARREL)} T`, cx + 1.75 * s - 22, cy + 1.45 * s + 4, th.fg, { mono: true, align: 'right', alpha: a * 0.8 });
      label(g, lab('endView'), cx - 1.75 * s, cy + 1.75 * s + 14, th.fg, { alpha: a * 0.6 });
      if (strip) {
        const ss = Math.min((pw - 30) / 5.2, 110 / 3.0);
        const sy = cy + r + 22 + 1.5 * ss;
        g.globalAlpha = a * 0.5;
        g.strokeStyle = th.fg;
        g.strokeRect(cx - 2.4 * ss, sy - 1.5 * ss, 4.8 * ss, 3 * ss);
        tracks(g, colBins, (_x, y, z) => [cx + z * ss, sy - (_x ?? 0) * ss + 0 * y], gr, STEPS_C, a * 0.5, 0.6);
        label(g, lab('sideView'), cx - 2.4 * ss, sy + 1.5 * ss + 14, th.fg, { alpha: a * 0.6 });
      }
      g.restore();
    }

    function panelFixed(g: CanvasRenderingContext2D, x0: number, y0: number, pw: number, ph: number, a: number, gr: number) {
      g.save();
      g.translate(x0, y0);
      label(g, lab('ftTitle'), 16, 24, th.fg, { alpha: a * 0.95 });
      label(g, `${fmt(fix.length)} ${lab('tracks')}`, 16, 40, th.fg, { mono: true, alpha: a * 0.6 });
      const s = Math.min((pw - 40) / 4.7, (ph - 90) / 3.9);
      const ox = (pw - 4.7 * s) / 2 + 0.45 * s;
      const oy = 52 + (ph - 52) / 2 - 8;
      const P = (x: number, z: number): [number, number] => [ox + z * s, oy - x * s];
      g.strokeStyle = th.fg;
      g.lineWidth = 1;
      g.globalAlpha = a * 0.25;
      g.beginPath();
      g.moveTo(ox - 0.45 * s, oy);
      g.lineTo(ox + 4.2 * s, oy);
      g.stroke();
      g.globalAlpha = a * 0.6;
      g.strokeRect(ox + 0.9 * s, oy - 0.8 * s, 1.0 * s, 1.6 * s);
      g.globalAlpha = a * 0.7;
      g.lineWidth = 2;
      for (const [z, hh] of [[0.15, 0.22], [0.35, 0.3], [0.6, 0.45], [2.3, 1.0], [2.8, 1.2], [3.3, 1.4]] as [number, number][]) {
        g.beginPath();
        g.moveTo(...P(hh, z));
        g.lineTo(...P(-hh, z));
        g.stroke();
      }
      g.lineWidth = 4;
      g.globalAlpha = a * 0.5;
      g.beginPath();
      g.moveTo(...P(1.7, 4.0));
      g.lineTo(...P(-1.7, 4.0));
      g.stroke();
      g.globalAlpha = 1;
      tracks(g, fixBins, (x, _y, z) => P(x, z), gr, STEPS_F, a * 0.85, 0.9);
      arrow(g, ox - 0.45 * s, oy, ox - 0.08 * s, oy, th.fg, 1.3, a * 0.9);
      g.fillStyle = th.fg;
      g.globalAlpha = a;
      g.fillRect(ox - 1.5, oy - 0.07 * s, 3, 0.14 * s);
      g.globalAlpha = a * 0.8;
      g.strokeStyle = th.fg;
      g.lineWidth = 1;
      const [bx, by] = P(0.45, 1.4);
      g.beginPath();
      g.arc(bx, by, 4, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(bx, by, 1.2, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      label(g, 'B = 1 T', bx + 10, by + 4, th.fg, { mono: true, alpha: a * 0.8 });
      label(g, lab('dipole'), ox + 1.4 * s, oy - 0.8 * s - 7, th.fg, { align: 'center', alpha: a * 0.75 });
      label(g, lab('tof'), ox + 4.0 * s, oy - 1.7 * s - 7, th.fg, { align: 'right', alpha: a * 0.75 });
      label(g, lab('target'), ox, oy + 0.3 * s + 14, th.fg, { align: 'center', alpha: a * 0.75 });
      g.restore();
    }

    function draw(g: CanvasRenderingContext2D, s: { w: number; h: number; dt: number }) {
      const { w, h } = s;
      const single = w < 640;
      const dim = single ? 0 : 0.28;
      aL = approach(aL, act === 0 ? 1 : dim, s.dt, 0.3);
      aR = approach(aR, act === 1 ? 1 : dim, s.dt, 0.3);
      gL = approach(gL, gLT, s.dt, 0.6);
      gR = approach(gR, gRT, s.dt, 0.6);
      const moving = Math.abs(aL - (act === 0 ? 1 : dim)) > 0.003 || Math.abs(aR - (act === 1 ? 1 : dim)) > 0.003 || gL < 0.995 || gR < 0.995;
      c.animate = moving;
      if (!moving) {
        gL = gR = 1;
        aL = act === 0 ? 1 : dim;
        aR = act === 1 ? 1 : dim;
      }
      const wide = w >= h * 1.1;
      if (single) {
        if (aL > 0.01) panelCollider(g, 0, 0, w, h, aL, gL);
        if (aR > 0.01) panelFixed(g, 0, 0, w, h, aR, gR);
      } else if (wide) {
        const wl = w * 0.5;
        panelCollider(g, 0, 0, wl, h, aL, gL);
        panelFixed(g, wl, 0, w - wl, h, aR, gR);
        g.strokeStyle = th.fg;
        g.globalAlpha = 0.15;
        g.beginPath();
        g.moveTo(wl, 20);
        g.lineTo(wl, h - 20);
        g.stroke();
        g.globalAlpha = 1;
      } else {
        panelCollider(g, 0, 0, w, h / 2, aL, gL);
        panelFixed(g, 0, h / 2, w, h / 2, aR, gR);
      }
      // simulated label and colour key
      label(g, lab('sim'), w - 14, 22, th.fg, { align: 'right', alpha: 0.6 });
      const kx = single ? w - 100 : 16;
      const ky = h - 30;
      for (let i = 0; i < 80; i++) {
        g.fillStyle = interpolateInferno(0.3 + 0.7 * (i / 79));
        g.fillRect(kx + i, ky, 1.2, 6);
      }
      label(g, '0.15', kx, ky + 19, th.fg, { mono: true, alpha: 0.7 });
      label(g, '1.5', kx + 80, ky + 19, th.fg, { mono: true, align: 'right', alpha: 0.7 });
      if (single) label(g, lab('ptKey'), kx, ky - 4, th.fg, { alpha: 0.75 });
      else label(g, lab('ptKey'), kx + 90, ky + 6, th.fg, { alpha: 0.75 });
    }

    return {
      setState(state: string, opts: SetStateOptions) {
        const na = state === 'fixed-target-low' ? 1 : 0;
        const changed = na !== act;
        act = na;
        if (opts.immediate || ctx.reducedMotion) {
          aL = act === 0 ? 1 : 0.28;
          aR = act === 1 ? 1 : 0.28;
          gL = gR = gLT = gRT = 1;
        } else if (changed) {
          if (act === 0) gL = 0;
          else gR = 0;
        }
        c.animate = true;
        c.invalidate();
      },
      setProgress(p: number) {
        // scrub: track growth of the active panel
        if (act === 0) gL = gLT = clamp(p);
        else gR = gRT = clamp(p);
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

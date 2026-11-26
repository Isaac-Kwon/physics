/**
 * hi.collision — Canvas2D side view (reaction plane x–z, beam axis horizontal) of a Pb–Pb collision, with a clock in fm/c.
 *
 * Time model (fm/c, c = 1): nuclei move at ±c along z, centres at z = ±|t| before t = 0. `setProgress(p)` maps linearly to
 * physical time inside the current state:
 *   initial 0→0.3 · preeq 0.3→1 · qgp 1→10 · hadronization 10→13 · freezeout 13→20 · free-stream 20→50.
 * The first three states (approach, lorentz, impact) are eased steps at t = −18, −12, −2 fm/c.
 *
 * Simplifications (all schematic): Bjorken-like longitudinal growth |z| < 0.9 t, transverse half-width 4 fm → ~12 fm with a
 * saturating radial flow v_T → 0.55 c; ideal-fluid cooling T = T_c (10 fm/c / t)^(1/3) (so T = 2.2 T_c at 1 fm/c, T_c at 10 fm/c);
 * smooth crossover through T_c (no mixed phase), ~0.8 T_c at kinetic freeze-out (20 fm/c). Colour = temperature (inferno).
 */
import { interpolateInferno } from 'd3';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, gaussian, lerp, mulberry32, smooth } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS } from '../shared/plot';
import { HI } from '../../data/heavy-ion';
import { luminance, markParticipants, sampleNucleus, sciSeconds, type Nucleon } from './_s2-nuclei';

const STATES = ['approach', 'lorentz', 'impact', 'initial', 'preeq', 'qgp', 'hadronization', 'freezeout', 'free-stream'] as const;
type St = (typeof STATES)[number];

const R = HI.R_PB_FM.value as number; // 7 fm
const GAMMA = HI.GAMMA_LHC.value as number; // 2700
const B_FM = 6; // impact parameter drawn
const TF = 20; // kinetic freeze-out time
const T_END = 50;

/** (t0, t1) in fm/c for the states driven by progress. */
const RANGE: Partial<Record<St, [number, number]>> = {
  initial: [0, 0.3],
  preeq: [0.3, 1],
  qgp: [1, 10],
  hadronization: [10, 13],
  freezeout: [13, 20],
  'free-stream': [20, T_END],
};
const STEP_T: Partial<Record<St, number>> = { approach: -18, lorentz: -12, impact: -2 };

// ---- model ----------------------------------------------------------------
/** Half-extents in fm of the fireball ellipse: x (reaction plane) and z (beam). */
const axOf = (t: number) => 4 + 0.55 * (t - 5 * (1 - Math.exp(-t / 5)));
const azOf = (t: number) => Math.max(0.08, 0.9 * t);
const vxOf = (t: number) => 0.55 * (1 - Math.exp(-t / 5));
/** Mean temperature in units of T_c. */
function tempOf(t: number): number {
  // Smooth crossover at LHC energies (no mixed-phase plateau): one Bjorken-like law T ∝ t^(-1/3) throughout,
  // giving T_c at 10 fm/c and ~0.8 T_c at kinetic freeze-out (20 fm/c).
  return Math.cbrt(10 / Math.max(t, 0.3));
}
/** Perceptual colour for T/T_c ∈ [0.7, 3.4]; T_c is red-orange, 3 T_c pale yellow. */
const tColor = (tt: number) => interpolateInferno(0.45 + 0.52 * Math.pow(clamp((tt - 0.7) / 2.7), 0.7));

function timeOf(state: St, p: number): number {
  const r = RANGE[state];
  if (r) return lerp(r[0], r[1], p);
  return STEP_T[state] ?? 0;
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const fmt = (n: number, o?: Intl.NumberFormatOptions) => ctx.formatNumber(n, o);
    const lab = ctx.label;
    const th = ctx.theme;

    // --- seeded content ---
    const nucA = sampleNucleus(11);
    const nucB = sampleNucleus(29);
    const nPart = markParticipants(nucA, nucB, B_FM);
    const nTot = nucA.length + nucB.length;
    const rnd = mulberry32(5);
    const nH = Math.round(520 * ctx.quality);
    const hadrons = Array.from({ length: nH }, () => {
      const rho = Math.sqrt(rnd());
      const ph = 2 * Math.PI * rnd();
      const m = Math.hypot(gaussian(rnd), gaussian(rnd)) * 0.3;
      const a = 2 * Math.PI * rnd();
      return { rz: rho * Math.cos(ph), rx: rho * Math.sin(ph), rho, thz: m * Math.cos(a), thx: m * Math.sin(a) };
    });
    const nSeg = Math.round(170 * ctx.quality);
    const segs = Array.from({ length: nSeg }, () => {
      const rho = Math.sqrt(rnd());
      const ph = 2 * Math.PI * rnd();
      return { rz: rho * Math.cos(ph), rx: rho * Math.sin(ph), g: gaussian(rnd), flip: rnd() < 0.5 ? 1 : -1 };
    });
    const nFlash = Math.round(120 * ctx.quality);
    const flashes = Array.from({ length: nFlash }, () => ({
      k: Math.floor(rnd() * Math.max(1, nH)),
      t: 13.2 + 6.6 * rnd() * rnd(),
    }));

    // --- state ---
    let st: St = 'approach';
    let prog = 1;
    let t = STEP_T.approach!;
    let tT = t;
    let squeeze = 0; // u: contraction exponent, f = γ^-u
    let squeezeT = 0;
    let partsK = 0;
    let partsT = 0;
    let dims = 1;
    let dimsT = 1;
    let inset = 0;
    let insetT = 0;
    let first = true;

    const c = createCanvas2D(ctx, draw);

    function retarget(immediate = false) {
      tT = timeOf(st, prog);
      const i = STATES.indexOf(st);
      squeezeT = i >= 1 ? 1 : 0;
      partsT = i >= 2 ? 1 : 0;
      dimsT = i <= 1 ? 1 : 0;
      insetT = st === 'impact' ? 1 : 0;
      if (immediate || ctx.reducedMotion) {
        t = tT;
        squeeze = squeezeT;
        partsK = partsT;
        dims = dimsT;
        inset = insetT;
      }
      c.animate = true;
      c.invalidate();
    }

    // ---- drawing helpers ----
    function arrow(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, lw = 1.2) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const L = Math.hypot(dx, dy);
      if (L < 1) return;
      const ux = dx / L;
      const uy = dy / L;
      const hs = Math.min(6, L * 0.5);
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1 - ux * hs * 0.6, y1 - uy * hs * 0.6);
      g.stroke();
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x1 - ux * hs - uy * hs * 0.45, y1 - uy * hs + ux * hs * 0.45);
      g.lineTo(x1 - ux * hs + uy * hs * 0.45, y1 - uy * hs - ux * hs * 0.45);
      g.closePath();
      g.fill();
    }
    function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, o: { mono?: boolean; align?: CanvasTextAlign; alpha?: number; color?: string; size?: number; base?: CanvasTextBaseline } = {}) {
      g.font = (o.mono ? FONT_MONO : FONT_SANS).replace(/\d+px/, `${o.size ?? (o.mono ? 11 : 12)}px`);
      g.fillStyle = o.color ?? th.fg;
      g.globalAlpha = o.alpha ?? 0.85;
      g.textAlign = o.align ?? 'left';
      g.textBaseline = o.base ?? 'alphabetic';
      g.fillText(s, x, y);
      g.globalAlpha = 1;
    }

    function update(dt: number): boolean {
      // smoothing in time: stiff enough to follow scrub, soft enough to hide jumps between states
      t = approach(t, tT, dt, first ? 0 : 0.14);
      squeeze = approach(squeeze, squeezeT, dt, 0.5);
      partsK = approach(partsK, partsT, dt, 0.4);
      dims = approach(dims, dimsT, dt, 0.3);
      inset = approach(inset, insetT, dt, 0.35);
      first = false;
      return (
        Math.abs(t - tT) > 1e-3 * (1 + Math.abs(tT)) ||
        Math.abs(squeeze - squeezeT) > 1e-3 ||
        Math.abs(partsK - partsT) > 1e-3 ||
        Math.abs(dims - dimsT) > 1e-3 ||
        Math.abs(inset - insetT) > 1e-3
      );
    }

    function draw(g: CanvasRenderingContext2D, s: { w: number; h: number; dt: number }) {
      const { w, h } = s;
      c.animate = update(s.dt);
      const top = 86;
      const bot = h - 62;
      const cx = w / 2;
      const cy = (top + bot) / 2;
      const sc = Math.min((w - 24) / 60, (bot - top) / 24);
      const f = Math.pow(GAMMA, -squeeze);
      const gammaNow = Math.pow(GAMMA, squeeze);
      const dotR = clamp(0.3 * sc, 1.3, 2.3);

      // beam axis
      g.strokeStyle = th.fg;
      g.globalAlpha = 0.18;
      g.lineWidth = 1;
      g.setLineDash([4, 5]);
      g.beginPath();
      g.moveTo(10, cy);
      g.lineTo(w - 10, cy);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      text(g, lab('beamAxis'), 12, cy - 5, { alpha: 0.5 });

      // ---------- nuclei (before and during the collision) ----------
      const tPos = t; // centre of nucleus A is at z = t (left, moving right), B at −t
      const fadeParts = 1 - smooth(0.0, 0.25, t); // participants merge into the matter after t = 0
      const drawNuc = (nuc: Nucleon[], sign: 1 | -1) => {
        // sign +1: nucleus A (up, moves +z), −1: nucleus B (down, moves −z)
        const zc = sign * tPos;
        const xOff = sign * (B_FM / 2);
        const px = (n: Nucleon) => cx + (zc + n.z * f) * sc;
        const py = (n: Nucleon) => cy - (n.x + xOff) * sc;
        // outline of the nucleus (R = 7 fm sphere → ellipse contracted along z)
        const outA = (1 - smooth(0, 0.35, t)) * 0.5;
        if (outA > 0.01) {
          g.strokeStyle = th.fg;
          g.globalAlpha = outA * 0.6;
          g.lineWidth = 1.2;
          g.beginPath();
          g.ellipse(cx + zc * sc, cy - xOff * sc, Math.max(1.2, R * f * sc), R * sc, 0, 0, Math.PI * 2);
          g.stroke();
          g.globalAlpha = 1;
        }
        for (const n of nuc) {
          const spect = !n.part;
          let aFg = 0.78;
          let aAcc = 0;
          if (n.part) {
            aFg = 0.78 * (1 - partsK);
            aAcc = partsK;
          } else aFg = lerp(0.78, 0.38, partsK);
          if (n.part) {
            aFg *= fadeParts;
            aAcc *= fadeParts;
          }
          const x = px(n);
          const y = py(n);
          if (aFg > 0.01) {
            g.globalAlpha = aFg;
            g.fillStyle = th.fg;
            g.beginPath();
            g.arc(x, y, dotR, 0, Math.PI * 2);
            g.fill();
          }
          if (aAcc > 0.01) {
            g.globalAlpha = aAcc;
            g.fillStyle = th.accent;
            g.beginPath();
            g.arc(x, y, dotR, 0, Math.PI * 2);
            g.fill();
          }
          void spect;
        }
        g.globalAlpha = 1;
        // velocity arrow (before the collision)
        const arrA = (1 - smooth(-3, 0, t)) * 0.8;
        if (arrA > 0.02 && st !== 'impact') {
          const ax0 = cx + zc * sc + sign * (R * f * sc + 14);
          const ay = cy - xOff * sc - sign * 0;
          g.globalAlpha = arrA;
          arrow(g, ax0, ay, ax0 + sign * 26, ay, th.fg, 1.2);
          g.globalAlpha = 1;
        }
      };
      drawNuc(nucA, 1);
      drawNuc(nucB, -1);

      // dimension lines on nucleus A (approach, lorentz)
      if (dims > 0.02) {
        const zA = cx + tPos * sc;
        const yTop = cy - (B_FM / 2 + R) * sc;
        const hw = Math.max(1.2, R * f * sc);
        g.globalAlpha = dims * 0.8;
        g.strokeStyle = th.fg;
        g.lineWidth = 1;
        // thickness along the beam
        const yd = yTop - 12;
        g.beginPath();
        g.moveTo(zA - hw, yd - 4);
        g.lineTo(zA - hw, yd + 4);
        g.moveTo(zA + hw, yd - 4);
        g.lineTo(zA + hw, yd + 4);
        g.moveTo(zA - hw, yd);
        g.lineTo(zA + hw, yd);
        g.stroke();
        const thick = 2 * R * f;
        const thickTxt = thick >= 1 ? `${fmt(thick, { maximumFractionDigits: thick < 10 ? 1 : 0 })} fm` : `${fmt(thick, { maximumSignificantDigits: 1 })} fm`;
        g.globalAlpha = 1;
        text(g, thickTxt, zA, yd - 8, { mono: true, align: 'center', alpha: dims * 0.9 });
        // transverse diameter (unchanged by the boost)
        const xd = zA + hw + 14;
        const y0 = cy - (B_FM / 2 + R) * sc;
        const y1 = cy - (B_FM / 2 - R) * sc;
        g.globalAlpha = dims * 0.8;
        g.beginPath();
        g.moveTo(xd - 4, y0);
        g.lineTo(xd + 4, y0);
        g.moveTo(xd - 4, y1);
        g.lineTo(xd + 4, y1);
        g.moveTo(xd, y0);
        g.lineTo(xd, y1);
        g.stroke();
        g.globalAlpha = 1;
        text(g, '14 fm', xd + 8, (y0 + y1) / 2 + 4, { mono: true, alpha: dims * 0.9 });
        if (squeeze > 0.02) {
          const gt = squeeze > 0.985 ? `γ ≈ ${fmt(GAMMA, { useGrouping: false })}` : `γ = ${fmt(gammaNow, { maximumFractionDigits: gammaNow < 10 ? 1 : 0, useGrouping: false })}`;
          text(g, gt, w - 16, 46, { mono: true, align: 'right', alpha: dims * 0.95, size: 13 });
          if (squeeze > 0.9) text(g, lab('notToScale'), w - 16, 64, { align: 'right', alpha: dims * 0.6 });
        }
        text(g, lab('speed'), cx + (st === 'approach' ? 0 : 0), cy + (B_FM / 2 + R) * sc + 20, { align: 'center', alpha: dims * 0.55 });
      } else if (t < 24) {
        // scale bar
        const L = 10 * sc;
        g.strokeStyle = th.fg;
        g.globalAlpha = 0.6;
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(16, bot - 2);
        g.lineTo(16 + L, bot - 2);
        g.moveTo(16, bot - 6);
        g.lineTo(16, bot + 2);
        g.moveTo(16 + L, bot - 6);
        g.lineTo(16 + L, bot + 2);
        g.stroke();
        g.globalAlpha = 1;
        text(g, '10 fm', 16 + L + 8, bot + 2, { mono: true, alpha: 0.7 });
      }

      // ---------- fireball ----------
      if (t > 0) drawFireball(g, cx, cy, sc);

      // ---------- spectators fly on / pancake note ----------
      if (st === 'impact' || st === 'initial' || (st === 'preeq' && t < 0.7)) {
        text(g, lab('notToScale'), 16, bot - 12, { alpha: 0.5 });
      }

      // ---------- end-view inset (impact) ----------
      if (inset > 0.02) drawInset(g, w, h, inset);

      // ---------- clock, phase, key, timeline ----------
      drawClock(g, w);
      if (t > 0.2) drawKey(g, w, h, top, bot);
      drawTimeline(g, w, h);

      // free-stream pointer
      const fsA = smooth(26, 38, t);
      if (fsA > 0.01) {
        g.globalAlpha = fsA * 0.8;
        arrow(g, w - 70, bot - 4, w - 20, bot - 4, th.fg, 1.2);
        arrow(g, 70, bot - 4, 20, bot - 4, th.fg, 1.2);
        g.globalAlpha = 1;
        text(g, lab('toDetector'), cx, bot - 24, { align: 'center', alpha: fsA * 0.9 });
        text(g, lab('toDetector2'), cx, bot - 8, { align: 'center', alpha: fsA * 0.9, mono: true });
      }
    }

    function drawFireball(g: CanvasRenderingContext2D, cx: number, cy: number, sc: number) {
      const ax = axOf(t);
      const az = azOf(t);
      const T = tempOf(t);
      const h = smooth(10, 13, t); // hadronized fraction (radial)
      const rhoC = 1 - h; // QGP core radius in units of the ellipse
      const rz = Math.max(2.2, az * sc);
      const rx = ax * sc;
      // glow strength: bright slab at first, thermal glow takes over from the pre-equilibrium lines
      const glow = t < 0.3 ? 1 : 0.55 + 0.45 * smooth(0.3, 1, t);
      const coreA = glow;
      if (rhoC > 0.01) {
        g.save();
        g.translate(cx, cy);
        g.scale(rz * rhoC, rx * rhoC);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
        const prof = (r: number) => T * (1.3 - 0.3 * r * r);
        const prof2 = (r: number) => (t >= 10 ? 1 : prof(r));
        for (const r of [0, 0.35, 0.7, 0.93]) gr.addColorStop(r, tColor(prof2(r)));
        gr.addColorStop(0.97, tColor(prof2(1)));
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = coreA;
        g.fillStyle = gr;
        g.beginPath();
        g.arc(0, 0, 1, 0, Math.PI * 2);
        g.fill();
        g.restore();
        g.globalAlpha = 1;
      }

      // pre-equilibrium: disordered, mostly transverse lines inside the slab
      const segA = t < 0.3 ? 0 : 0.9 * (1 - smooth(0.45, 1, t));
      if (segA > 0.02 && t < 1.05) {
        const sigma = 0.25 + 3 * smooth(0.3, 1, t);
        const q = Math.floor(t * 40);
        g.lineWidth = 1;
        g.strokeStyle = 'rgba(12,10,14,0.9)';
        g.globalAlpha = segA;
        g.beginPath();
        for (let i = 0; i < segs.length; i++) {
          const sg = segs[i];
          const r2 = mulberry32(i * 977 + q);
          const ang = Math.PI / 2 + sigma * (sg.g * 0.6 + (r2() - 0.5) * 1.2) * sg.flip;
          const x0 = cx + sg.rz * rz;
          const y0 = cy - sg.rx * rx;
          const L = 3 + 5 * r2();
          g.moveTo(x0 - Math.cos(ang) * L, y0 - Math.sin(ang) * L);
          g.lineTo(x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L);
        }
        g.stroke();
        g.globalAlpha = 1;
      }

      // flow arrows (length ∝ local velocity: v_z = z/t, v_x = v_T(t) · x/x_edge)
      const arrA = smooth(1, 1.6, t) * (1 - smooth(9, 11, t));
      if (arrA > 0.02) {
        const KV = Math.min(40, 3.4 * sc);
        for (const gz of [-0.62, 0, 0.62]) {
          for (const gx of [-0.62, 0, 0.62]) {
            if (gz === 0 && gx === 0) continue;
            if (gz * gz + gx * gx > 0.85) continue;
            const x0 = cx + gz * rz;
            const y0 = cy - gx * rx;
            const vz = 0.9 * gz;
            const vx = vxOf(t) * gx;
            const col = luminance(tColor(prof3(gz, gx))) > 0.5 ? 'rgba(12,10,14,0.85)' : 'rgba(255,255,255,0.9)';
            g.globalAlpha = arrA;
            arrow(g, x0, y0, x0 + vz * KV, y0 - vx * KV, col, 1.1);
          }
        }
        g.globalAlpha = 1;
        // reference arrow
        const ra = arrA * 0.9;
        g.globalAlpha = ra;
        arrow(g, 16, h0(), 16 + 0.5 * KV, h0(), th.fg, 1.2);
        g.globalAlpha = 1;
        text(g, lab('flowRef'), 16 + 0.5 * KV + 8, h0() + 4, { mono: true, alpha: ra * 0.8 });
      }

      // hadrons: appear from the surface inward; comoving until freeze-out, then free streaming
      if (t >= 10) {
        const tH = tempOf(t);
        const col = tColor(tH);
        const tt = Math.min(t, TF);
        const azf = azOf(tt) * sc;
        const axf = axOf(tt) * sc;
        const flowZ = 0.9;
        const flowX = vxOf(TF);
        const dR = clamp(0.28 * sc, 1.6, 2.6);
        const streaming = t > TF;
        const dtS = Math.max(0, t - TF);
        // trails
        if (streaming) {
          g.strokeStyle = col;
          g.globalAlpha = 0.16;
          g.lineWidth = 1;
          g.beginPath();
          for (const hd of hadrons) {
            const x0 = cx + hd.rz * azOf(TF) * sc;
            const y0 = cy - hd.rx * axOf(TF) * sc;
            let vz = hd.rz * flowZ + hd.thz;
            let vx = hd.rx * flowX + hd.thx;
            const vm = Math.hypot(vz, vx);
            if (vm > 0.98) {
              vz *= 0.98 / vm;
              vx *= 0.98 / vm;
            }
            const d0 = Math.max(0, dtS - 5);
            g.moveTo(x0 + vz * d0 * sc, y0 - vx * d0 * sc);
            g.lineTo(x0 + vz * dtS * sc, y0 - vx * dtS * sc);
          }
          g.stroke();
        }
        g.fillStyle = col;
        for (const hd of hadrons) {
          const born = smooth(rhoC + 0.04, rhoC - 0.02, hd.rho) * (t < 13 ? 1 : 1);
          const vis = hd.rho >= rhoC ? 1 : 0;
          const al = Math.max(vis, born);
          if (al < 0.02) continue;
          let x = cx + hd.rz * azf;
          let y = cy - hd.rx * axf;
          if (streaming) {
            let vz = hd.rz * flowZ + hd.thz;
            let vx = hd.rx * flowX + hd.thx;
            const vm = Math.hypot(vz, vx);
            if (vm > 0.98) {
              vz *= 0.98 / vm;
              vx *= 0.98 / vm;
            }
            x += vz * dtS * sc;
            y -= vx * dtS * sc;
          }
          if (x < -10 || x > w0() + 10) continue;
          g.globalAlpha = al * 0.95;
          g.beginPath();
          g.arc(x, y, dR, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        // freeze-out: last scatterings
        if (t > 13 && t < TF + 0.5) {
          g.strokeStyle = th.fg;
          g.lineWidth = 1;
          for (const fl of flashes) {
            const d = Math.abs(t - fl.t);
            if (d > 0.45 || t > TF) continue;
            const hd = hadrons[fl.k];
            if (!hd) continue;
            g.globalAlpha = (1 - d / 0.45) * 0.9;
            g.beginPath();
            g.arc(cx + hd.rz * azf, cy - hd.rx * axf, dR + 3 + 4 * (d / 0.45), 0, Math.PI * 2);
            g.stroke();
          }
          g.globalAlpha = 1;
        }
      }
    }
    // small accessors so fireball helpers can see the latest canvas size
    let lw = 1;
    let lh = 1;
    const w0 = () => lw;
    const h0 = () => lh - 62 - 22;
    const prof3 = (gz: number, gx: number) => {
      const r2 = gz * gz + gx * gx;
      return tempOf(t) * (1.3 - 0.3 * r2);
    };

    function drawInset(g: CanvasRenderingContext2D, w: number, h: number, k: number) {
      const S = clamp(Math.min(w * 0.3, h * 0.42), 96, 170);
      const ix = w - S / 2 - 14;
      const iy = 86 + S / 2 + 12;
      const si = S / (2 * R + B_FM + 3);
      g.globalAlpha = k;
      text(g, lab('endView'), ix, iy - S / 2 - 8, { align: 'center', alpha: 0.7 * k });
      g.lineWidth = 1;
      g.strokeStyle = th.fg;
      for (const [nuc, sg] of [[nucA, 1], [nucB, -1]] as [Nucleon[], 1 | -1][]) {
        g.globalAlpha = 0.35 * k;
        g.beginPath();
        g.arc(ix, iy - sg * (B_FM / 2) * si, R * si, 0, Math.PI * 2);
        g.stroke();
        for (const n of nuc) {
          g.globalAlpha = k * (n.part ? 1 : 0.4);
          g.fillStyle = n.part ? th.accent : th.fg;
          g.beginPath();
          g.arc(ix + n.y * si, iy - (n.x + sg * B_FM / 2) * si, 1.2, 0, Math.PI * 2);
          g.fill();
        }
      }
      // b between the centres
      g.globalAlpha = 0.9 * k;
      g.strokeStyle = th.fg;
      g.lineWidth = 1;
      const bx = ix - R * si - 10;
      g.beginPath();
      g.moveTo(bx, iy - (B_FM / 2) * si);
      g.lineTo(bx, iy + (B_FM / 2) * si);
      g.moveTo(bx - 3, iy - (B_FM / 2) * si);
      g.lineTo(bx + 3, iy - (B_FM / 2) * si);
      g.moveTo(bx - 3, iy + (B_FM / 2) * si);
      g.lineTo(bx + 3, iy + (B_FM / 2) * si);
      g.stroke();
      text(g, `b = ${fmt(B_FM)} fm`, bx - 5, iy + 4, { mono: true, align: 'right', alpha: 0.9 * k });
      // legend
      const ly = iy + S / 2 + 14;
      g.globalAlpha = k;
      g.fillStyle = th.accent;
      g.beginPath();
      g.arc(ix - S / 2 + 4, ly - 4, 3, 0, Math.PI * 2);
      g.fill();
      text(g, `${lab('participants')} ${fmt(nPart)}`, ix - S / 2 + 12, ly, { alpha: 0.85 * k });
      g.fillStyle = th.fg;
      g.globalAlpha = 0.45 * k;
      g.beginPath();
      g.arc(ix - S / 2 + 4, ly + 12, 3, 0, Math.PI * 2);
      g.fill();
      text(g, `${lab('spectators')} ${fmt(nTot - nPart)}`, ix - S / 2 + 12, ly + 16, { alpha: 0.85 * k });
      g.globalAlpha = 1;
    }

    function phaseOf(tt: number): string {
      if (st === 'approach' || st === 'lorentz') return lab(st === 'approach' ? 'ph.approach' : 'ph.lorentz');
      if (tt < -0.2) return lab('ph.impact');
      if (tt < 0.3) return lab('ph.initial');
      if (tt < 1) return lab('ph.preeq');
      if (tt < 10) return lab('ph.qgp');
      if (tt < 13) return lab('ph.hadronization');
      if (tt < 20) return lab('ph.hadrongas');
      return lab('ph.free');
    }

    function drawClock(g: CanvasRenderingContext2D, w: number) {
      const i = STATES.indexOf(st);
      if (i <= 1) {
        text(g, phaseOf(t), w - 16, 28, { align: 'right', alpha: 0.9 });
        return;
      }
      const tt = Math.abs(t) < 0.0005 ? 0 : t;
      const digits = Math.abs(tt) < 1 ? 2 : Math.abs(tt) < 10 ? 1 : 0;
      const ts = `${tt < 0 ? '−' : ''}${fmt(Math.abs(tt), { minimumFractionDigits: tt === 0 ? 0 : digits, maximumFractionDigits: digits })}`;
      text(g, `t = ${ts} fm/c`, w - 16, 28, { align: 'right', mono: true, size: 13, alpha: 0.95 });
      text(g, tt === 0 ? '0 s' : `≈ ${sciSeconds(tt, fmt)}`, w - 16, 46, { align: 'right', mono: true, alpha: 0.55 });
      text(g, phaseOf(t), w - 16, 64, { align: 'right', alpha: 0.9 });
    }

    /** Temperature key (right edge): T/T_c from 0.7 to 3.4, ticks at T_c and 3 T_c. */
    function drawKey(g: CanvasRenderingContext2D, w: number, _h: number, top: number, bot: number) {
      const a = smooth(0.2, 0.6, t) * (st === 'free-stream' || t > 22 ? 0.5 : 1) * (1 - inset);
      if (a < 0.02) return;
      const kh = clamp((bot - top) * 0.45, 60, 110);
      const x = w - 22;
      const y0 = top + 4;
      g.globalAlpha = a;
      for (let i = 0; i < kh; i++) {
        g.fillStyle = tColor(3.4 - (2.7 * i) / kh);
        g.fillRect(x, y0 + i, 8, 1.5);
      }
      const yOf = (tt: number) => y0 + ((3.4 - tt) / 2.7) * kh;
      g.strokeStyle = th.fg;
      g.lineWidth = 1;
      g.globalAlpha = a * 0.8;
      for (const tt of [1, 3]) {
        g.beginPath();
        g.moveTo(x - 3, yOf(tt));
        g.lineTo(x, yOf(tt));
        g.stroke();
      }
      text(g, '3 T_c', x - 6, yOf(3) + 4, { mono: true, align: 'right', alpha: a * 0.8 });
      text(g, 'T_c', x - 6, yOf(1) + 4, { mono: true, align: 'right', alpha: a * 0.8 });
      text(g, lab('tempKey'), x + 8, y0 - 8, { align: 'right', alpha: a * 0.75 });
      g.globalAlpha = 1;
    }

    function drawTimeline(g: CanvasRenderingContext2D, w: number, h: number) {
      const a = smooth(-0.3, 0.2, t);
      if (a < 0.02) return;
      const x0 = 20;
      const x1 = w - 20;
      const y = h - 24;
      const L0 = Math.log10(0.1);
      const L1 = Math.log10(T_END);
      const X = (tt: number) => x0 + ((Math.log10(Math.max(0.1, tt)) - L0) / (L1 - L0)) * (x1 - x0);
      g.globalAlpha = a;
      // temperature along time: colour of the bar encodes T(t)
      const seg = (t0: number, t1: number, col: (tt: number) => string, dash = false) => {
        const xa = X(t0);
        const xb = X(t1);
        const n = Math.max(2, Math.round(xb - xa));
        for (let i = 0; i < n; i++) {
          const tt = t0 * Math.pow(t1 / t0, (i + 0.5) / n);
          g.fillStyle = col(tt);
          if (dash && i % 6 > 3) continue;
          g.fillRect(xa + (i * (xb - xa)) / n, y - 3, (xb - xa) / n + 0.5, 5);
        }
      };
      seg(0.1, 0.3, () => tColor(3.2), true);
      seg(0.3, 1, (tt) => tColor(tempOf(tt)));
      seg(1, 10, (tt) => tColor(tempOf(tt)));
      seg(10, 13, () => tColor(1));
      seg(13, 20, (tt) => tColor(tempOf(tt)));
      g.fillStyle = th.fg;
      g.globalAlpha = a * 0.35;
      for (let xx = X(20); xx < x1; xx += 6) g.fillRect(xx, y - 1, 3, 2);
      g.globalAlpha = a;
      // ticks
      g.strokeStyle = th.fg;
      g.lineWidth = 1;
      for (const tt of [0.1, 1, 10]) {
        g.globalAlpha = a * 0.6;
        g.beginPath();
        g.moveTo(X(tt), y + 4);
        g.lineTo(X(tt), y + 8);
        g.stroke();
        text(g, tt < 1 ? fmt(tt) : fmt(tt, { useGrouping: false }), X(tt), y + 20, { mono: true, align: 'center', alpha: a * 0.65 });
      }
      text(g, 'fm/c', x1, y + 20, { mono: true, align: 'right', alpha: a * 0.5 });
      // phase names where they fit
      const names: [number, number, string][] = [
        [0.1, 1, lab('tl.preeq')],
        [1, 10, lab('tl.qgp')],
        [13, 20, lab('tl.hadrons')],
        [20, T_END, lab('tl.free')],
      ];
      for (const [t0, t1, nm] of names) {
        const mid = (X(t0) + X(t1)) / 2;
        g.font = FONT_SANS;
        const tw = g.measureText(nm).width;
        if (tw < X(t1) - X(t0) - 6) text(g, nm, mid, y - 10, { align: 'center', alpha: a * 0.7 });
      }
      // cursor
      const xc = X(clamp(t, 0.1, T_END));
      g.fillStyle = th.fg;
      g.globalAlpha = a;
      g.beginPath();
      g.moveTo(xc, y - 5);
      g.lineTo(xc - 4, y - 12 + 0);
      g.lineTo(xc + 4, y - 12 + 0);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    }

    return {
      setState(state: string, opts: SetStateOptions) {
        if (!(STATES as readonly string[]).includes(state)) return;
        st = state as St;
        // default progress: final frame, unless the engine says it is entering from below / scrolling back
        prog = opts.direction === -1 ? 1 : opts.immediate ? 1 : 0;
        retarget(opts.immediate);
      },
      setProgress(p: number) {
        prog = clamp(p);
        retarget(false);
      },
      resize(w, h) {
        lw = w;
        lh = h;
        c.resize(w, h);
      },
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;

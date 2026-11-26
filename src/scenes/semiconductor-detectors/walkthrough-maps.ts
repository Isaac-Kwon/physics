/**
 * sc.walkthrough-maps — ALPIDE-like monolithic active pixel sensor (ALICE ITS2), drawn to scale in µm:
 *   epitaxial layer 25 µm (weak field, charge diffuses) · chip total 50 µm · pixel 30 µm · small n-well diode (collection electrode)
 *   · deep p-well shielding the in-pixel CMOS (amplifier, discriminator, memory) · circuits and metal on top.
 * y is depth below the silicon surface (the circuit side). Keyframes kf: 0 module/goal · 1 epi · 2 collect · 3 in-pixel · 4 thinning.
 * Diffusion paths are seeded random walks biased toward the diode (illustrative, not a simulation of the real field).
 */
import type { SceneModule } from '../shared/types';
import { clamp, gaussian, lerp, mulberry32, smooth } from '../shared/canvas2d';
import { SC } from '../../data/semiconductor';
import { arrow, box, createStage, dimH, dimV, dot, dualLayout, line, makeLayer, plate, txt, type G } from './_sc2-common';

const STATES = ['goal', 'epi-layer', 'collect', 'in-pixel', 'readout', 'trick'] as const;
type P = { kf: number; bars: number; cross: number; map: number; circ: number; l1: number; l2: number; l3: number; l4: number };
const mk = (kf: number, o: Partial<P>): P => ({ kf, bars: 0, cross: 0, map: 0, circ: 0, l1: 0, l2: 0, l3: 0, l4: 0, ...o });
const TARGETS: Record<string, P> = {
  goal: mk(1, { bars: 1 }),
  'epi-layer': mk(1, { cross: 1, l1: 1 }),
  collect: mk(2, { cross: 1, l2: 1 }),
  'in-pixel': mk(3, { cross: 1, circ: 1, l3: 1 }),
  readout: mk(3, { map: 1, circ: 1 }),
  trick: mk(4, { cross: 1, l4: 1 }),
};

const EPI = 25; // µm
const T_CHIP = 50; // µm, thinned chip
const T_THICK = 300; // µm, before thinning
const PIX = 30; // µm
const TOP = 9; // thickness of the drawn metal/circuit band above the surface (schematic, not to scale)
const TRK_X = 6; // track position (µm from the diode)
const HYBRID_UM = 320; // 150 sensor + 20 bumps + 150 chip

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const F = (v: number, o?: Intl.NumberFormatOptions) => ctx.formatNumber(v, o);
    const { accent, accent2, fg, bg } = ctx.theme;
    const rnd = mulberry32(17);
    const layMap = makeLayer();
    const layBars = makeLayer();
    const layCross = makeLayer();

    // Charge-carrier random walks from points along the track to the diode at (0, 1).
    const walks = Array.from({ length: 12 }, (_, i) => {
      let x = TRK_X + (rnd() - 0.5) * 1.2;
      let y = 3 + ((i + 0.5) / 12) * (EPI - 4);
      const pts: [number, number][] = [[x, y]];
      for (let n = 0; n < 220; n++) {
        const dx = -x;
        const dy = 1.2 - y;
        const d = Math.hypot(dx, dy) || 1;
        x += (dx / d) * 0.32 + gaussian(rnd) * 0.75;
        y += (dy / d) * 0.32 + gaussian(rnd) * 0.75;
        if (y > EPI - 0.4) y = 2 * (EPI - 0.4) - y; // reflect at the epi / substrate interface
        if (x > PIX / 2 - 0.5) x = PIX - 1 - x; // neighbouring pixel's boundary
        if (x < -PIX / 2 + 0.5) x = -PIX + 1 - x;
        if (y < 3.8 && Math.abs(x) > 2.4) y = 3.8 + (3.8 - y) * 0.5; // deep p-well: charge cannot enter
        if (y < 0.6) y = 0.6;
        pts.push([x, y]);
        if (Math.hypot(x, y - 1) < 1.1) break;
      }
      pts.push([0, 1]);
      return pts;
    });
    const pairsOnTrack = Array.from({ length: 22 }, (_, i) => 1.5 + ((i + 0.5) / 22) * (EPI - 2));

    const drawCross = (g: G, main: { x: number; y: number; w: number; h: number }, p: P, env: { ts: number; reduced: boolean; state: string }, alpha: number) => {
      const S1 = Math.min(main.w / 100, (main.h - 110) / (TOP + T_CHIP));
      const S2 = Math.min(main.w / 62, (main.h - 90) / 40);
      const S4 = (main.h - 100) / (T_THICK + TOP);
      const kfs = [
        { S: S1, fy: 20 },
        { S: S1, fy: 20 },
        { S: S2, fy: 13 },
        { S: S2, fy: 9 },
        { S: S4, fy: 150 },
      ];
      const i = Math.min(3, Math.floor(p.kf));
      const f = clamp(p.kf - i);
      const S = Math.exp(lerp(Math.log(kfs[i].S), Math.log(kfs[i + 1].S), f));
      const fy = lerp(kfs[i].fy, kfs[i + 1].fy, f);
      const cx0 = main.x + main.w / 2 - (p.kf < 3 ? 0 : 0);
      const cy0 = main.y + main.h / 2 + 4;
      const X = (u: number) => cx0 + u * S;
      const Y = (u: number) => cy0 + (u - fy) * S;
      // thinning animation: total thickness 300 → 50 µm in the trick state
      const thick = env.state === 'trick' ? (env.reduced ? T_CHIP : lerp(T_THICK, T_CHIP, smooth(0.5, 2.8, env.ts))) : p.kf > 3.5 ? T_CHIP : T_CHIP;
      const thickNow = p.kf > 3.01 && env.state !== 'trick' ? T_CHIP : thick;
      const hw = main.w / 2 / S + 2;
      const nk = Math.ceil(hw / PIX);

      g.save();
      g.globalAlpha = alpha;
      g.beginPath();
      g.rect(main.x, main.y, main.w, main.h);
      g.clip();
      const xl = X(-hw);
      const wm = 2 * hw * S;
      // silicon: epi on top of the substrate
      box(g, xl, Y(0), wm, EPI * S, { fill: accent, fa: 0.14 });
      box(g, xl, Y(EPI), wm, (thickNow - EPI) * S, { fill: fg, fa: 0.1 });
      line(g, xl, Y(0), xl + wm, Y(0), fg, { alpha: 0.5 });
      line(g, xl, Y(EPI), xl + wm, Y(EPI), fg, { alpha: 0.4, dash: [4, 3] });
      line(g, xl, Y(thickNow), xl + wm, Y(thickNow), fg, { alpha: 0.5 });
      // circuit / metal band above the surface
      box(g, xl, Y(-TOP), wm, TOP * S, { fill: accent2, fa: 0.06 });
      for (let m = 1; m <= 3; m++) line(g, xl, Y(-TOP + (m * TOP) / 4), xl + wm, Y(-TOP + (m * TOP) / 4), accent2, { alpha: 0.28 });

      for (let k = -nk; k <= nk; k++) {
        const cx = k * PIX;
        // collection diode (n-well) and deep p-wells on both sides
        box(g, X(cx - 1.4), Y(0), Math.max(4, 2.8 * S), Math.max(3, 2.2 * S), { fill: accent });
        for (const sgn of [-1, 1]) {
          const a = cx + sgn * 3.4;
          const b = cx + sgn * (PIX / 2 - 0.8);
          box(g, X(Math.min(a, b)), Y(0), Math.abs(b - a) * S, 3.4 * S, { fill: fg, fa: 0.3, stroke: fg, alpha: 0.5 });
        }
        if (k !== 0 && S > 3) line(g, X(cx - PIX / 2), Y(0), X(cx - PIX / 2), Y(Math.min(EPI, thickNow)), fg, { alpha: 0.3, dash: [2, 3] });
      }
      if (S > 3) line(g, X(PIX / 2), Y(0), X(PIX / 2), Y(EPI), fg, { alpha: 0.3, dash: [2, 3] });

      // circuits of pixel 0: amplifier → discriminator → memory (schematic blocks above the deep p-wells)
      if (p.circ > 0.01) {
        const bx = [-12.5, -3, 6.5];
        g.save();
        g.globalAlpha = p.circ * alpha;
        g.strokeStyle = accent2;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(X(bx[0]), Y(-8));
        g.lineTo(X(bx[0]), Y(-2.5));
        g.lineTo(X(bx[0] + 6), Y(-5.25));
        g.closePath();
        g.stroke();
        g.strokeRect(X(bx[1]), Y(-8), 6 * S, 5.5 * S);
        g.strokeRect(X(bx[2]), Y(-8), 6 * S, 5.5 * S);
        g.beginPath();
        g.moveTo(X(bx[0] + 6), Y(-5.25));
        g.lineTo(X(bx[1]), Y(-5.25));
        g.moveTo(X(bx[1] + 6), Y(-5.25));
        g.lineTo(X(bx[2]), Y(-5.25));
        // diode → amplifier input wire
        g.moveTo(X(0), Y(0));
        g.lineTo(X(0), Y(-1));
        g.lineTo(X(bx[0] - 1.5), Y(-1));
        g.lineTo(X(bx[0] - 1.5), Y(-5.25));
        g.lineTo(X(bx[0]), Y(-5.25));
        g.stroke();
        // output wire to the periphery
        g.beginPath();
        g.moveTo(X(bx[2] + 6), Y(-5.25));
        g.lineTo(X(PIX / 2 - 0.5), Y(-5.25));
        g.stroke();
        g.restore();
      }

      // the particle: track and pairs inside the epitaxial layer
      g.save();
      g.strokeStyle = fg;
      g.globalAlpha = 0.5 * alpha;
      g.setLineDash([5, 4]);
      g.beginPath();
      g.moveTo(X(TRK_X), Y(-TOP) - 24);
      g.lineTo(X(TRK_X), Y(Math.min(thickNow, 50)) + 10);
      g.stroke();
      g.restore();
      arrow(g, X(TRK_X), Y(-TOP) - 26, X(TRK_X), Y(-TOP) - 4, { color: fg, alpha: 0.8 * alpha, head: 6 });
      if (p.kf > 0.5 && p.kf < 3.6 && p.circ < 0.5) {
        for (const y of pairsOnTrack) dot(g, X(TRK_X), Y(y), Math.max(1.3, 0.28 * S), accent, p.l1 * 0.9 + (1 - p.l1) * 0.3);
      }

      // diffusion walks (collect) and bent paths (in-pixel)
      if (p.l2 > 0.01) {
        const prog = env.reduced ? 1 : clamp(env.ts / 3.2);
        g.save();
        g.lineWidth = 1;
        for (const w of walks) {
          const n = Math.max(1, Math.round(prog * (w.length - 1)));
          g.globalAlpha = 0.5 * p.l2 * alpha;
          g.strokeStyle = accent;
          g.beginPath();
          w.slice(0, n + 1).forEach(([x, y], q) => (q ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
          g.stroke();
          const [hx, hy] = w[n];
          dot(g, X(hx), Y(hy), Math.max(1.6, 0.3 * S), accent, p.l2 * alpha);
        }
        g.restore();
        // weakly depleted zone around the diode
        g.save();
        g.globalAlpha = 0.7 * p.l2 * alpha;
        g.strokeStyle = accent;
        g.setLineDash([4, 3]);
        g.beginPath();
        g.arc(X(0), Y(0), 5.2 * S, 0, Math.PI);
        g.stroke();
        g.restore();
      }
      if (p.l3 > 0.01) {
        g.save();
        g.lineWidth = 1.25;
        for (const x0 of [-11, -6, 6.5, 12]) {
          const sg = Math.sign(x0);
          g.globalAlpha = 0.65 * p.l3 * alpha;
          g.strokeStyle = accent;
          g.beginPath();
          g.moveTo(X(x0), Y(21));
          g.quadraticCurveTo(X(x0 * 0.35), Y(10), X(sg * 2.2), Y(4.4));
          g.lineTo(X(sg * 0.7), Y(2.8));
          g.stroke();
        }
        g.restore();
      }
      g.restore();

      // labels
      const lab = (s: string, u: number, v: number, o: { align?: CanvasTextAlign; a?: number; color?: string; mono?: boolean } = {}) =>
        plate(g, bg, s, X(u), Y(v), { align: o.align ?? 'left', alpha: (o.a ?? 1) * alpha, color: o.color, mono: o.mono });
      const rx = main.x + main.w - 6;
      if (p.l1 > 0.01) {
        const a = p.l1;
        dimV(g, X(-hw + 0.5) + 36, Y(0), Y(EPI), `${F(EPI)} µm`, fg, { side: 1, alpha: 0.8 * a * alpha });
        plate(g, bg, L('epi'), rx, Y(EPI / 2 - 4), { align: 'right', alpha: a * alpha, color: accent });
        plate(g, bg, L('substrate'), rx, Y(EPI + 12), { align: 'right', alpha: a * alpha });
        plate(g, bg, L('circuitsTop'), rx, Y(-TOP / 2), { align: 'right', alpha: a * alpha, color: accent2 });
        dimH(g, X(-PIX / 2), X(PIX / 2), Y(T_CHIP) + 22, `${F(PIX)} µm`, fg, { alpha: 0.8 * a * alpha });
        plate(g, bg, L('particle'), X(TRK_X) + 10, Y(-TOP) - 24, { alpha: a * alpha * 0.85 });
        plate(g, bg, L('pairsHere'), X(TRK_X) + 12, Y(EPI * 0.5), { alpha: a * alpha * 0.9, color: accent });
      }
      if (p.l2 > 0.01) {
        const a = p.l2;
        lab(L('diode'), 2.5, -0.5, { a: a * 0.9, color: accent, align: 'left' });
        plate(g, bg, L('diffusionThenCollection'), rx, Y(EPI * 0.55), { align: 'right', alpha: a * alpha });
        plate(g, bg, L('weakField'), rx, Y(EPI * 0.55) + 18, { align: 'right', alpha: a * alpha * 0.7 });
        lab(L('depletedPatch'), 6.4, 4.8, { a: a * 0.75, align: 'left' });
      }
      if (p.l3 > 0.01) {
        const a = p.l3;
        const lx = main.x + main.w - 8;
        const lines: [string, number][] = [
          [L('amplifier'), -8.2],
          [L('discriminator'), -5.2],
          [L('memory'), -2.2],
        ];
        // labels on the right with leaders to the blocks
        lines.forEach(([s, v], q) => {
          const bxs = [-6.5, 0, 12.5][q];
          line(g, X(bxs), Y(-5.25), lx - 112, Y(-12 + q * 3.2), fg, { alpha: 0.25 * a * alpha });
          plate(g, bg, s, lx, Y(-12 + q * 3.2), { align: 'right', alpha: a * alpha });
        });
        plate(g, bg, L('deepPwell'), lx, Y(2.2), { align: 'right', alpha: a * alpha, color: fg });
        plate(g, bg, L('shields'), lx, Y(2.2) + 18, { align: 'right', alpha: a * alpha * 0.75 });
        lab(L('diode'), 2.5, 1.2, { a: a * 0.9, color: accent });
      }
      if (p.l4 > 0.01) {
        const a = p.l4;
        g.save();
        g.globalAlpha = 0.45 * a * alpha;
        g.strokeStyle = fg;
        g.setLineDash([5, 4]);
        g.strokeRect(X(-hw), Y(0), 2 * hw * S, T_THICK * S);
        g.restore();
        plate(g, bg, `${F(T_THICK)} µm ${L('before')}`, X(-hw) + 12, Y(T_THICK) - 14, { alpha: 0.7 * a * alpha, mono: false });
        const bx = X(hw - 1) - 4;
        const yb = Y(thickNow);
        const yt = Y(-TOP);
        line(g, bx, yt, bx, yb, accent, { alpha: 0.85 * a * alpha, lw: 1.5 });
        line(g, bx - 5, yt, bx, yt, accent, { alpha: 0.85 * a * alpha });
        line(g, bx - 5, yb, bx, yb, accent, { alpha: 0.85 * a * alpha });
        plate(g, bg, `${F(Math.round(thickNow))} µm`, bx - 10, (yt + yb) / 2, { align: 'right', mono: true, alpha: a * alpha });
        plate(g, bg, L('onePiece'), X(-hw) + 12, Y(100), { alpha: a * alpha, color: accent });
        plate(g, bg, L('noBumps'), X(-hw) + 12, Y(100) + 18, { alpha: a * alpha * 0.75 });
        plate(g, bg, L('thinned'), X(-hw) + 12, Y(100) + 36, { alpha: a * alpha * 0.75 });
      }
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['collect'],
      anim: { collect: 3.4, trick: 3 },
      draw(g, s, p, env) {
        const { w, h } = s;
        const main = { x: 12, y: 8, w: w - 24, h: h - 16 };
        layCross(g, w, h, p.cross * (1 - p.map), (g2) => drawCross(g2, main, p, env, 1));

        // goal: silicon traversed by the particle, drawn to scale (hybrid vs MAPS), plus the material per ITS2 layer
        layBars(g, w, h, p.bars, (g2) => {
          const bw = Math.min(w - 120, 560);
          const x0 = (w - bw) / 2;
          const k = bw / HYBRID_UM;
          const rows = [
            { y: h * 0.28, title: L('hybridName'), seg: [[150, accent, 0.4], [20, accent2, 0.95], [150, fg, 0.3]] as [number, string, number][], tot: HYBRID_UM },
            { y: h * 0.58, title: L('mapsName'), seg: [[25, accent, 0.4], [25, fg, 0.3]] as [number, string, number][], tot: T_CHIP },
          ];
          for (const r of rows) {
            txt(g2, r.title, x0, r.y - 22, { alpha: 0.9 });
            let xx = x0;
            for (const [len, col, al] of r.seg) {
              box(g2, xx, r.y, len * k, 26, { fill: col, alpha: 1, fa: al });
              xx += len * k;
            }
            box(g2, x0, r.y, r.tot * k, 26, { stroke: fg, alpha: 0.5 });
            txt(g2, `≈ ${F(r.tot)} µm`, xx + 10, r.y + 13, { mono: true, alpha: 0.95 });
          }
          txt(g2, L('hybridParts'), x0, h * 0.28 + 44, { alpha: 0.65 });
          txt(g2, L('mapsParts'), x0, h * 0.58 + 44, { alpha: 0.65 });
          txt(g2, `${L('its2Layer')} ${F(SC.ITS2_X0_INNER_PCT.value as number)} % X₀`, x0, h * 0.58 + 74, { alpha: 0.9, color: accent });
          txt(g2, L('thicknessNote'), x0, h * 0.1, { alpha: 0.8 });
        });

        // readout: matrix with the addresses of the fired pixels only
        layMap(g, w, h, p.map, (g2) => {
          const cols = 12;
          const rows = 8;
          const c = Math.min(30, (w - 60) / cols, (h - 190) / rows);
          const gx = (w - cols * c) / 2;
          const gy = 46;
          const hits: [number, number][] = [
            [5, 3],
            [6, 3],
            [6, 4],
          ];
          for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) box(g2, gx + i * c, gy + j * c, c, c, { stroke: fg, alpha: 0.25 });
          for (const [i, j] of hits) box(g2, gx + i * c, gy + j * c, c, c, { fill: accent, fa: 0.85, stroke: fg, alpha: 0.8 });
          // bus to the periphery (copper), one arrow per fired pixel
          const by = gy + rows * c + 18;
          box(g2, gx, by, cols * c, 10, { fill: accent2, fa: 0.55 });
          for (const [i, j] of hits) {
            arrow(g2, gx + (i + 0.5) * c, gy + (j + 1) * c + 1, gx + (i + 0.5) * c, by - 1, { color: accent2, alpha: 0.9, head: 5 });
          }
          const out = hits.map(([i, j]) => `(${F(j)}, ${F(i)})`).join('  ');
          txt(g2, L('addresses'), gx, by + 28, { alpha: 0.85 });
          txt(g2, out, gx + cols * c, by + 28, { mono: true, align: 'right', alpha: 1, color: accent });
          txt(g2, L('periphery'), gx + cols * c, by + 52, { align: 'right', alpha: 0.65 });
          txt(g2, L('quiet'), gx, gy - 22, { alpha: 0.8 });
          dimH(g2, gx + (cols - 1) * c, gx + cols * c, gy - 12 + 1, `${F(PIX)} µm`, fg, { below: false, alpha: 0.7 });
        });
      },
    });
  },
};
export default mod;

/**
 * sc.band-gap — bands, pair-creation energy, doping.
 *   bands:       metal / silicon / diamond on one common energy scale (E_g: 0, 1.12, 5.5 eV). Silicon at 300 K has almost no
 *                electrons in the conduction band (n_i ≈ 10¹⁰ cm⁻³ against 5×10²² atoms/cm³: about 2 in 10¹³ atoms).
 *   pair-energy: w = 3.6 eV per pair = E_g (1.12) + ≈ 2.5 eV of lattice vibrations; gas ≈ 30 eV; to scale on one axis.
 *   n-type:      phosphorus (5 valence electrons) in the silicon lattice: one loosely bound extra electron;
 *                band picture: donor level just below the conduction band (≈ 0.045 eV, drawn exaggerated).
 *   p-type:      boron (3 valence electrons): a missing bond = hole; acceptor level just above the valence band.
 */
import type { SceneModule } from '../shared/types';
import { clamp, mulberry32 } from '../shared/canvas2d';
import { PH, wrapText, arrow, createStage, dimLine, electronDot, holeRing, line, txt, wiggle, type G } from './_sc1-common';

const STATES = ['bands', 'pair-energy', 'n-type', 'p-type'] as const;
type P = { bands: number; pair: number; doped: number; kind: number };
const TARGETS: Record<string, P> = {
  bands: { bands: 1, pair: 0, doped: 0, kind: 0 },
  'pair-energy': { bands: 0, pair: 1, doped: 0, kind: 0 },
  'n-type': { bands: 0, pair: 0, doped: 1, kind: 0 },
  'p-type': { bands: 0, pair: 0, doped: 1, kind: 1 },
};

const EG_DIAMOND = 5.5;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const rnd = mulberry32(77);
    const wander = Array.from({ length: 6 }, () => ({ ph: rnd() * 6.28, ph2: rnd() * 6.28, f: 0.35 + rnd() * 0.3, y: rnd() }));

    /* ------------------------------------------------ bands: metal | silicon | diamond */
    const drawBands = (g: G, w: number, h: number, a: number) => {
      if (a < 0.01) return;
      const bottom = h - 64;
      const ppe = Math.min(60, (bottom - 36) / (EG_DIAMOND + 1.0 + 1.2));
      const Y = (E: number) => bottom - (E + 1.0) * ppe;
      const small = w < 560;
      const colW = small ? w * 0.18 : Math.min(w * 0.26, 190);
      const cols = small ? [w * 0.17, w * 0.46, w * 0.75] : [w * 0.2, w * 0.5, w * 0.8];
      const band = (cx: number, E0: number, E1: number, filled: boolean, alpha = 0.07) => {
        g.fillStyle = fg;
        g.globalAlpha = alpha * a;
        g.fillRect(cx - colW / 2, Y(E1), colW, Y(E0) - Y(E1));
        g.globalAlpha = 1;
        void filled;
      };
      const edge = (cx: number, E: number, c = fg, al = 0.7) => line(g, cx - colW / 2, Y(E), cx + colW / 2, Y(E), c, al * a, 1.5);
      const dotsRow = (cx: number, E: number, n: number) => {
        for (let i = 0; i < n; i++) electronDot(g, cx - colW / 2 + (colW * (i + 0.5)) / n, Y(E), accent, 2.8, a);
      };
      // metal: one partly filled band
      band(cols[0], -1.0, 1.6, true);
      edge(cols[0], -1.0, fg, 0.4);
      edge(cols[0], 1.6, fg, 0.4);
      dotsRow(cols[0], 0.0, 8);
      dotsRow(cols[0], 0.55, 8);
      line(g, cols[0] - colW / 2, Y(0.9), cols[0] + colW / 2, Y(0.9), fg, 0.35 * a, 1, [3, 4]);
      txt(g, L('metal'), cols[0], h - 40, { align: 'center', alpha: 0.9 * a });
      txt(g, L('noGap'), cols[0], h - 22, { align: 'center', alpha: 0.7 * a });
      // silicon and diamond
      const two = (cx: number, Eg: number, name: string, gapStr: string, hi: boolean) => {
        band(cx, -1.0, 0, true);
        band(cx, Eg, Eg + 1.2, false);
        edge(cx, 0, fg, 0.7);
        edge(cx, Eg, fg, 0.7);
        dotsRow(cx, -0.2, 8);
        dotsRow(cx, -0.65, 8);
        if (hi) {
          g.fillStyle = accent;
          g.globalAlpha = 0.12 * a;
          g.fillRect(cx - colW / 2, Y(Eg), colW, Y(0) - Y(Eg));
          g.globalAlpha = 1;
        }
        const gx = cx + colW / 2 + 10;
        dimLine(g, gx, Y(0), gx, Y(Eg), hi ? accent : fg, 0.8 * a);
        txt(g, gapStr, gx + 8, Y(Eg / 2), { mono: true, color: hi ? accent : fg, alpha: 0.95 * a });
        txt(g, name, cx, h - 40, { align: 'center', alpha: 0.9 * a, color: hi ? accent : fg });
        txt(g, 'E_g', cx, h - 22, { align: 'center', mono: true, alpha: 0.7 * a });
      };
      two(cols[1], PH.EG, L('silicon'), `${ctx.formatNumber(PH.EG)} eV`, true);
      two(cols[2], EG_DIAMOND, L('diamond'), `${ctx.formatNumber(EG_DIAMOND)} eV`, false);
      // thermal population note (silicon, 300 K)
      txt(g, L('almostNone'), cols[1], Y(PH.EG + 0.55), { align: 'center', color: accent, alpha: 0.95 * a });
      if (!small) txt(g, L('thermal'), cols[1], Y(PH.EG + 0.55) + 16, { align: 'center', mono: true, alpha: 0.7 * a });
      txt(g, L('empty'), cols[2], Y(EG_DIAMOND + 0.6), { align: 'center', alpha: 0.7 * a });
      
    };

    /* ------------------------------------------------ pair-energy bars */
    const drawPair = (g: G, w: number, h: number, a: number) => {
      if (a < 0.01) return;
      const x0 = w < 560 ? 20 : 40;
      const ppe = (w - x0 - 28) / PH.W_GAS; // gas bar spans the width
      const bh = 22;
      const tiny = h < 260;
      const y1 = tiny ? 52 : h * 0.26 + 30;
      const y2 = y1 + (tiny ? 100 : 150);
      const wSi = PH.W_PAIR * ppe;
      const gSi = PH.EG * ppe;
      // silicon
      txt(g, L('silicon'), x0, y1 - (tiny ? 24 : 30), { alpha: 0.9 * a, color: accent });
      g.fillStyle = accent;
      g.globalAlpha = 0.85 * a;
      g.fillRect(x0, y1, gSi, bh);
      g.globalAlpha = 1;
      g.strokeStyle = fg;
      g.globalAlpha = 0.5 * a;
      g.lineWidth = 1;
      g.strokeRect(x0 + gSi, y1 + 0.5, wSi - gSi, bh - 1);
      g.globalAlpha = 1;
      wiggle(g, x0 + gSi + 3, y1 + bh / 2, x0 + wSi - 3, y1 + bh / 2, 5, fg, 0.7 * a, 4);
      dimLine(g, x0, y1 - 8, x0 + wSi, y1 - 8, fg, 0.7 * a);
      txt(g, `w = ${ctx.formatNumber(PH.W_PAIR)} eV`, x0 + wSi + 10, y1 - 8, { mono: true, alpha: 0.95 * a });
      line(g, x0 + gSi / 2, y1 + bh, x0 + gSi / 2, y1 + bh + 12, accent, 0.7 * a);
      txt(g, `${L('gap')} ${ctx.formatNumber(PH.EG)} eV`, x0 + gSi / 2 - 4, y1 + bh + 24, { mono: false, alpha: 0.85 * a, color: accent });
      line(g, x0 + wSi, y1 + bh / 2, x0 + wSi + 8, y1 + bh / 2, fg, 0.5 * a);
      txt(g, `${L('lattice')} ≈ ${ctx.formatNumber(PH.W_PAIR - PH.EG, { maximumFractionDigits: 1 })} eV`, x0 + wSi + 12, y1 + bh / 2, { alpha: 0.85 * a });
      // gas
      txt(g, L('gas'), x0, y2 - (tiny ? 24 : 30), { alpha: 0.9 * a });
      g.fillStyle = fg;
      g.globalAlpha = 0.3 * a;
      g.fillRect(x0, y2, PH.W_GAS * ppe, bh);
      g.globalAlpha = 1;
      dimLine(g, x0, y2 - 8, x0 + PH.W_GAS * ppe, y2 - 8, fg, 0.7 * a);
      txt(g, `≈ ${PH.W_GAS} eV`, x0 + PH.W_GAS * ppe, y2 - 20, { mono: true, align: 'right', alpha: 0.95 * a });
      // pairs per keV
      const nSi = Math.round(1000 / PH.W_PAIR);
      const nGas = Math.round(1000 / PH.W_GAS);
      txt(g, L('perKeV'), x0, y2 + (tiny ? 30 : 52), { alpha: 0.75 * a });
      txt(g, `${L('silicon')}: ${nSi} ${L('pairs')}`, x0, y2 + (tiny ? 48 : 72), { mono: false, color: accent, alpha: 0.95 * a });
      txt(g, `${L('gas')}: ${nGas} ${L('pairs')}`, x0 + Math.min(240, w * 0.45), y2 + (tiny ? 48 : 72), { alpha: 0.9 * a });
    };

    /* ------------------------------------------------ doping */
    const drawDoped = (g: G, w: number, h: number, a: number, kind: number, t: number, reduced: boolean) => {
      if (a < 0.01) return;
      const nA = a * (1 - kind);
      const pA = a * kind;
      const wide = w >= 600 || h < 260;
      const lat = wide ? { x: 0, y: 0, w: w < 600 ? w * 0.42 : w * 0.46, h } : { x: 0, y: 0, w, h: h * 0.46 };
      const bd = wide ? { x: w < 600 ? w * 0.44 : w * 0.5, y: 0, w: w < 600 ? w * 0.56 : w * 0.5, h } : { x: 0, y: h * 0.48, w, h: h * 0.52 };

      // ---- lattice
      const cols = 5;
      const rows = 4;
      const sp = Math.min((lat.w - 30) / cols, (lat.h - (h < 260 ? 76 : 90)) / rows, 52);
      const lx = lat.x + (lat.w - sp * (cols - 1)) / 2;
      const ly = lat.y + (lat.h - sp * (rows - 1)) / 2 - 8;
      const P = (i: number, j: number): [number, number] => [lx + i * sp, ly + j * sp];
      g.strokeStyle = fg;
      g.lineWidth = 1;
      g.globalAlpha = 0.28 * a;
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const [x, y] = P(i, j);
          if (i < cols - 1) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + sp, y);
            g.stroke();
          }
          if (j < rows - 1) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x, y + sp);
            g.stroke();
          }
        }
      g.globalAlpha = 1;
      const di = 2;
      const dj = 1;
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const [x, y] = P(i, j);
          const dop = i === di && j === dj;
          g.beginPath();
          g.arc(x, y, sp * (dop ? 0.3 : 0.24), 0, Math.PI * 2);
          g.fillStyle = dop ? accent2 : fg;
          g.globalAlpha = (dop ? 0.3 : 0.12) * a;
          g.fill();
          g.globalAlpha = (dop ? 0.9 : 0.4) * a;
          g.strokeStyle = dop ? accent2 : fg;
          g.stroke();
          g.globalAlpha = 1;
          if (!dop) txt(g, 'Si', x, y, { align: 'center', alpha: 0.5 * a });
        }
      const [dx, dy] = P(di, dj);
      txt(g, 'P', dx, dy, { align: 'center', color: accent2, alpha: nA });
      txt(g, 'B', dx, dy, { align: 'center', color: accent2, alpha: pA });
      // n: extra electron wandering through the lattice
      if (nA > 0.01) {
        const tt = reduced ? 0 : t;
        const ex = dx + Math.cos(tt * 0.9) * sp * 1.55 + (reduced ? sp * 0.5 : 0);
        const ey = dy + Math.sin(tt * 1.3) * sp * 0.85 + (reduced ? sp * 0.4 : 0);
        electronDot(g, ex, ey, accent, 3.6, nA);
        if (h >= 260) txt(g, L('freeElectron'), lat.x + lat.w / 2, ly + (rows - 1) * sp + 34, { align: 'center', color: accent, alpha: nA });
      }
      // p: hole hopping between atoms around the boron
      if (pA > 0.01) {
        const path: [number, number][] = [[di + 1, dj], [di + 1, dj + 1], [di + 2, dj + 1], [di + 2, dj], [di + 2, dj - 1], [di + 1, dj - 1]].map(([i, j]) => [Math.min(cols - 1, i), j] as [number, number]);
        const k = reduced ? 1 : Math.floor(t * 0.7);
        const f = reduced ? 0 : Math.min(1, (t * 0.7 - k) * 2.5);
        const a0 = P(...path[k % path.length]);
        const a1 = P(...path[(k + 1) % path.length]);
        holeRing(g, a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f, accent2, 5, pA, 1.6);
        if (h >= 260) txt(g, L('mobileHole'), lat.x + lat.w / 2, ly + (rows - 1) * sp + 34, { align: 'center', color: accent2, alpha: pA });
      }
      if (h < 260) {
        wrapText(g, L('pCaption'), lat.x + 10, lat.y + lat.h - 30, lat.w - 14, 14, { alpha: 0.8 * nA });
        wrapText(g, L('bCaption'), lat.x + 10, lat.y + lat.h - 30, lat.w - 14, 14, { alpha: 0.8 * pA });
      } else {
        txt(g, L('pCaption'), lat.x + lat.w / 2, lat.y + lat.h - 38, { align: 'center', alpha: 0.8 * nA });
        txt(g, L('bCaption'), lat.x + lat.w / 2, lat.y + lat.h - 38, { align: 'center', alpha: 0.8 * pA });
        txt(g, L('ratio'), lat.x + lat.w / 2, lat.y + lat.h - 18, { align: 'center', mono: true, alpha: 0.7 * a });
      }

      // ---- band diagram
      const gapPx = Math.min(120, bd.h * 0.3);
      const bx0 = bd.x + 30;
      const bx1 = bd.x + bd.w - 24;
      const Ev = bd.y + bd.h * 0.64;
      const Ec = Ev - gapPx;
      g.fillStyle = fg;
      g.globalAlpha = 0.07 * a;
      g.fillRect(bx0, bd.y + 20, bx1 - bx0, Ec - bd.y - 20);
      g.fillRect(bx0, Ev, bx1 - bx0, bd.y + bd.h - Ev - 28);
      g.globalAlpha = 1;
      line(g, bx0, Ec, bx1, Ec, fg, 0.7 * a, 1.5);
      line(g, bx0, Ev, bx1, Ev, fg, 0.7 * a, 1.5);
      txt(g, L('conduction'), bx0 + 6, bd.y + 32, { alpha: 0.65 * a });
      txt(g, L('valence'), bx0 + 6, bd.y + bd.h - 40, { alpha: 0.65 * a });
      dimLine(g, bx0 - 12, Ec, bx0 - 12, Ev, fg, 0.7 * a);
      txt(g, `${ctx.formatNumber(PH.EG)} eV`, bx0 + 8, (Ec + Ev) / 2 + (h < 260 ? 12 : 0), { mono: true, alpha: 0.85 * a });
      const lvl = gapPx * 0.16; // exaggerated; real value ≈ 0.045 eV ≈ 4 % of E_g
      const nSite = 5;
      const sx = (i: number) => bx0 + 50 + ((bx1 - bx0 - 80) * i) / (nSite - 1);
      // donors (n)
      if (nA > 0.01) {
        line(g, bx0, Ec + lvl, bx1, Ec + lvl, accent2, 0.8 * nA, 1, [4, 4]);
        txt(g, L(h < 260 ? 'donorShort' : 'donor'), bx1 - 4, Ec + lvl + 14, { align: 'right', color: accent2, alpha: nA });
        for (let i = 0; i < nSite; i++) {
          const x = sx(i);
          g.fillStyle = accent2;
          g.globalAlpha = nA;
          g.fillRect(x - 3, Ec + lvl - 3, 6, 6);
          g.globalAlpha = 1;
          const wv = wander[i];
          const ex = x + Math.sin((reduced ? 0 : t) * wv.f + wv.ph) * 22;
          const ey = Ec - 10 - wv.y * Math.max(8, Ec - bd.y - 62);
          electronDot(g, ex, ey, accent, 3, nA);
          arrow(g, x, Ec + lvl - 6, x, Ec + 4, { color: accent, alpha: 0.5 * nA, width: 1, head: 4 });
        }
        if (h >= 260) txt(g, L('ionized'), bx1 - 4, Ec + lvl + 30, { align: 'right', alpha: 0.65 * nA });
      }
      // acceptors (p)
      if (pA > 0.01) {
        line(g, bx0, Ev - lvl, bx1, Ev - lvl, accent2, 0.8 * pA, 1, [4, 4]);
        txt(g, L(h < 260 ? 'acceptorShort' : 'acceptor'), bx1 - 4, Ev - lvl - 14, { align: 'right', color: accent2, alpha: pA });
        for (let i = 0; i < nSite; i++) {
          const x = sx(i);
          g.fillStyle = accent2;
          g.globalAlpha = pA;
          g.fillRect(x - 3, Ev - lvl - 3, 6, 6);
          g.globalAlpha = 1;
          const wv = wander[i];
          const hx = x + Math.sin((reduced ? 0 : t) * wv.f + wv.ph) * 22;
          const hy = Ev + 12 + wv.y * Math.max(8, bd.y + bd.h - 70 - Ev);
          holeRing(g, hx, hy, accent2, 3.2, pA, 1.3);
          arrow(g, x, Ev - lvl + 6, x, Ev - 4, { color: accent2, alpha: 0.5 * pA, width: 1, head: 4 });
        }
        if (h >= 260) txt(g, L('ionized'), bx1 - 4, Ev - lvl - 30, { align: 'right', alpha: 0.65 * pA });
      }
      txt(g, L('notToScale'), bd.x + bd.w - 24, bd.y + bd.h - 12, { align: 'right', alpha: 0.5 * a });
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['n-type', 'p-type'],
      draw(g, s, p, env) {
        drawBands(g, s.w, s.h, p.bands);
        drawPair(g, s.w, s.h, p.pair);
        drawDoped(g, s.w, s.h, p.doped, clamp(p.kind), s.t, env.reduced);
      },
    });
  },
};
export default mod;

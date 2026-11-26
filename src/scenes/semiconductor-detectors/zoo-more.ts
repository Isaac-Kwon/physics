/**
 * sc.zoo-more — one schematic illustration per state, drawn with the numbers of src/data/semiconductor.ts:
 *   hpge     coaxial Ge crystal at 77 K; ⁶⁰Co lines 1173/1332 keV, FWHM 2 keV (SC.HPGE_RES_FWHM_KEV) vs ≈65 keV for a NaI scintillator
 *   ccd      charge packets shifted row by row into a serial register and one output amplifier
 *   skipper  the same packet re-measured N times: σ = σ₁/√N, σ₁ = 3.5 e⁻ (illustrative); packets of 0, 1, 2, 3 e⁻ resolved at N = 100
 *   sipm     array of Geiger-mode cells; k photons → k cells fire → output ∝ k (gain ≈ 10⁶ per cell, SC.SIPM_GAIN)
 *   3d       columns through the bulk: drift distance ≤ column spacing (50 µm) instead of the thickness (200 µm)
 *   wide-gap band gap and energy per pair: Ge 0.67/2.96, Si 1.12/3.6 (SC), SiC 3.3/7.8 and diamond 5.5/13 eV (textbook values, order of magnitude)
 */
import type { SceneModule } from '../shared/types';
import { clamp, mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { SC } from '../../data/semiconductor';
import { arrow, box, createStage, dimH, dimV, dot, dualLayout, line, makeLayer, plate, sci, sup, txt, type G } from './_sc2-common';

const STATES = ['hpge', 'ccd', 'skipper', 'sipm', '3d', 'wide-gap'] as const;
type P = Record<(typeof STATES)[number], number>;
const TARGETS: Record<string, P> = Object.fromEntries(STATES.map((s) => [s, Object.fromEntries(STATES.map((q) => [q, q === s ? 1 : 0])) as P]));

const MATERIALS = [
  { key: 'Ge', eg: SC.EG_GE_EV.value as number, w: SC.W_PAIR_GE_EV.value as number },
  { key: 'Si', eg: SC.EG_SI_EV.value as number, w: SC.W_PAIR_SI_EV.value as number },
  { key: 'SiC', eg: 3.3, w: 7.8 },
  { key: 'diamond', eg: SC.EG_DIAMOND_EV.value as number, w: 13 },
];

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const F = (v: number, o?: Intl.NumberFormatOptions) => ctx.formatNumber(v, o);
    const { accent, accent2, fg, bg } = ctx.theme;
    const rnd = mulberry32(99);
    const lay = STATES.map(() => makeLayer());

    // CCD image: charge per pixel (0..1)
    const COLS = 8;
    const ROWS = 6;
    const img = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        const star = Math.exp(-((c - 5) ** 2 + (r - 2) ** 2) / 2.2) + 0.6 * Math.exp(-((c - 1.5) ** 2 + (r - 4) ** 2) / 1.2);
        return clamp(star * 0.95 + rnd() * 0.12);
      }),
    );
    // SiPM events: k photons (1, 2, 3, …) hitting distinct cells
    const SC_COLS = 10;
    const SC_ROWS = 7;
    const events = Array.from({ length: 12 }, (_, j) => {
      const k = 1 + (j % 3);
      const cells: [number, number][] = [];
      while (cells.length < k) {
        const c: [number, number] = [Math.floor(rnd() * SC_COLS), Math.floor(rnd() * SC_ROWS)];
        if (!cells.some((q) => q[0] === c[0] && q[1] === c[1])) cells.push(c);
      }
      return { t: 0.7 + 1.9 * j, k, cells };
    });
    const sipmOut = (t: number) => {
      let v = 0;
      for (const e of events) if (t >= e.t + 0.3) v += e.k * Math.exp(-(t - e.t - 0.3) / 0.28);
      return v;
    };

    // ---------------- HPGe ----------------
    const drawHpge = (g: G, w: number, h: number, t: number, reduced: boolean) => {
      const d = dualLayout(w, h, 0.5);
      const m = d.main;
      const cw = Math.min(m.w - 40, 240);
      const cx = m.x + m.w / 2 - 4;
      const top = m.y + 38;
      const ch = Math.min(m.h * 0.52, 190);
      const x0 = cx - cw / 2;
      // cryostat housing and dewar
      box(g, x0 - 16, top - 16, cw + 32, ch + 32, { stroke: fg, alpha: 0.4, dash: [5, 4] });
      box(g, cx - 28, top + ch + 16, 56, 44, { stroke: fg, alpha: 0.5 });
      box(g, cx - 28, top + ch + 36, 56, 24, { fill: accent, fa: 0.25 });
      txt(g, L('dewar'), cx + 36, top + ch + 44, { alpha: 0.8 });
      // coaxial crystal (cross-section) with a bore from below
      box(g, x0, top, cw, ch, { fill: accent, fa: 0.16, stroke: fg, alpha: 0.65, lw: 1.25 });
      const bw = cw * 0.22;
      const bh = ch * 0.72;
      box(g, cx - bw / 2, top + ch - bh, bw, bh, { fill: bg, stroke: accent2, alpha: 1, lw: 1.75 });
      box(g, cx - 3, top + ch - bh + 4, 6, bh + 18 + 20, { fill: accent2, alpha: 0.9 }); // cold finger
      // interaction: gamma → pairs
      const ix = x0 + cw * 0.2;
      const iy = top + ch * 0.4;
      arrow(g, ix - 38, iy - 54, ix, iy, { color: fg, alpha: 0.85, head: 6 });
      txt(g, L('gamma'), ix - 40, iy - 62, { alpha: 0.85, align: 'center' });
      for (let q = 0; q < 14; q++) {
        const a = (q / 14) * Math.PI * 2;
        dot(g, ix + Math.cos(a) * (4 + (q % 3) * 2), iy + Math.sin(a) * (4 + (q % 3) * 2), 1.6, q % 2 ? accent : fg, 0.9, q % 2 === 0);
      }
      // holes toward the bore (p⁺), electrons toward the outer surface (n⁺)
      const ph = reduced ? 0.55 : (t % 2) / 2;
      arrow(g, ix, iy, ix - 26 * 0 - 0 + (cx - bw / 2 - ix) * 0.9, iy + 10, { color: fg, alpha: 0.5, head: 5, dash: [3, 3] });
      arrow(g, ix, iy, x0 + 3, iy - 6, { color: accent, alpha: 0.7, head: 5, dash: [3, 3] });
      dot(g, ix + (x0 + 3 - ix) * ph, iy - 6 * ph, 2.4, accent);
      dot(g, ix + (cx - bw / 2 - ix) * 0.9 * ph, iy + 10 * ph, 2.6, fg, 1, true);
      txt(g, L('nContact'), x0 + cw, top - 24, { align: 'right', alpha: 0.75 });
      txt(g, L('pContact'), cx + bw / 2 + 6, top + ch - bh * 0.5, { alpha: 0.85, color: accent2 });
      txt(g, `≈ 77 K`, x0 - 12, top + ch + 24, { mono: true, align: 'left', alpha: 0.95 });
      if (w >= 520) txt(g, L('crystal'), x0 + cw + 18, top + 14, { alpha: 0.7, align: 'left' });

      // spectrum: ⁶⁰Co lines, equal peak heights
      const a = d.aux;
      const r = { x: a.x + 14, y: a.y + 44, w: a.w - 28, h: a.h * 0.55 };
      const pl = plot(g, ctx, r, { min: 1050, max: 1450, label: L('energyKeV'), ticks: [{ v: 1173, label: '1173' }, { v: 1332, label: '1332' }] }, { min: 0, max: 1.12, label: L('counts'), ticks: [] });
      pl.axes();
      const spec = (fwhm: number, col: string, wd: number, al: number) => {
        const sg = fwhm / 2.355;
        g.save();
        g.strokeStyle = col;
        g.globalAlpha = al;
        g.lineWidth = wd;
        g.beginPath();
        const n = 1200;
        for (let q = 0; q <= n; q++) {
          const e = 1050 + (400 * q) / n;
          const v = Math.exp(-((e - 1173) ** 2) / (2 * sg * sg)) + 0.9 * Math.exp(-((e - 1332) ** 2) / (2 * sg * sg));
          q ? g.lineTo(pl.X(e), pl.Y(v)) : g.moveTo(pl.X(e), pl.Y(v));
        }
        g.stroke();
        g.restore();
      };
      const fw = SC.HPGE_RES_FWHM_KEV.value as number;
      spec(65, fg, 1.25, 0.8);
      spec(fw, accent, 1.75, 1);
      const yh = pl.Y(0.45);
      line(g, pl.X(1332 - 32), yh, pl.X(1332 + 32), yh, fg, { alpha: 0.8 });
      plate(g, bg, `≈ ${F(65)} keV`, pl.X(1332 + 38), yh + 1, { mono: true, alpha: 0.9 });
      plate(g, bg, `${F(fw)} keV`, pl.X(1332) + 10, pl.Y(0.97), { mono: true, color: accent, alpha: 1 });
      txt(g, L('hpgeName'), pl.X(1173) - 10, pl.Y(1.07), { align: 'right', color: accent, alpha: 1 });
      txt(g, L('scintName'), pl.X(1050) + 8, pl.Y(0.2), { color: fg, alpha: 0.85 });
      txt(g, L('normalised'), r.x, r.y + r.h + 40, { alpha: 0.6 });
      txt(g, L('co60'), r.x + r.w, r.y - 18, { align: 'right', alpha: 0.7 });
    };

    // ---------------- CCD ----------------
    const drawCcd = (g: G, w: number, h: number, t: number) => {
      const narrow = w < 520;
      const cell = Math.min((w - (narrow ? 70 : 190)) / COLS, (h - 130) / (ROWS + 1.2), 52);
      const gx = narrow ? 36 : Math.max(46, (w - COLS * cell - 140) / 2);
      const gy = 50;
      const Tc = 0.7 + COLS * 0.2 + 0.3;
      const m = Math.floor(t / Tc);
      const u = t - m * Tc;
      const mm = m % (ROWS + 1);
      const sp = smooth(0, 0.6, u);
      // storage cells
      for (let r = 0; r < ROWS + 1; r++) for (let c = 0; c < COLS; c++) box(g, gx + c * cell, gy + r * cell + (r === ROWS ? 6 : 0), cell, cell, { stroke: fg, alpha: r === ROWS ? 0.6 : 0.28, lw: r === ROWS ? 1.25 : 1 });
      // packets of rows that have not been read yet
      for (let r = 0; r < ROWS; r++) {
        if (r > ROWS - 1 - mm) continue; // already read
        const pos = r + mm + (mm < ROWS ? sp : 0); // row position, 0 … ROWS (serial register)
        for (let c = 0; c < COLS; c++) {
          const q = img[r][c];
          const isSerial = r === ROWS - 1 - mm;
          let px = gx + (c + 0.5) * cell;
          if (isSerial && u >= 0.7) {
            const st = (u - 0.7) / 0.2;
            const i = Math.floor(st);
            const q2 = Math.min(COLS, i + smooth(0, 0.6, st - i));
            px = gx + (c + q2 + 0.5) * cell;
            if (c + q2 >= COLS - 0.2) continue;
          }
          const py = gy + (isSerial && u >= 0.6 ? ROWS : pos) * cell + (isSerial && u >= 0.6 ? 6 : 0) + cell / 2;
          dot(g, px, py, Math.sqrt(q) * cell * 0.4 + 1, accent, 0.9);
        }
      }
      // output amplifier (copper) at the right end of the serial register
      const ay = gy + ROWS * cell + 6 + cell / 2;
      const ax = gx + COLS * cell + 18;
      g.save();
      g.strokeStyle = accent2;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(ax, ay - 12);
      g.lineTo(ax, ay + 12);
      g.lineTo(ax + 22, ay);
      g.closePath();
      g.stroke();
      g.restore();
      line(g, gx + COLS * cell, ay, ax, ay, accent2, { alpha: 0.8 });
      txt(g, L('outputAmp'), ax + 28, ay, { alpha: 0.85, color: accent2 });
      // clocks
      arrow(g, gx - 16, gy + 6, gx - 16, gy + ROWS * cell - 6, { color: fg, alpha: 0.6, head: 6 });
      txt(g, L('vClock'), gx - 22, gy + 2, { align: 'left', alpha: 0.75 });
      arrow(g, gx + 6, gy + ROWS * cell + 6 + cell + 12, gx + COLS * cell - 6, gy + ROWS * cell + 6 + cell + 12, { color: fg, alpha: 0.6, head: 6 });
      txt(g, L('hClock'), gx + 6, gy + ROWS * cell + cell + 34, { alpha: 0.75 });
      txt(g, L('packetSize'), gx, 20, { alpha: 0.75 });
      txt(g, L('serial'), gx + COLS * cell - 4, gy + ROWS * cell + 6 + cell + 34, { align: 'right', alpha: 0.6 });
      // pixel values leaving the amplifier (bars appear as each packet is read)
      if (!narrow) {
        const bx = ax + 28;
        const by = gy + 10;
        txt(g, L('outSignal'), bx, by - 2, { alpha: 0.7 });
        if (mm < ROWS && u >= 0.7) {
          const rowQ = img[ROWS - 1 - mm];
          const st = (u - 0.7) / 0.2;
          const done = Math.min(COLS, Math.floor(st + 0.5));
          for (let k = 0; k < done; k++) {
            const q = rowQ[COLS - 1 - k];
            box(g, bx + k * 9, by + 70 - q * 56, 6, q * 56, { fill: accent, fa: 0.85 });
          }
        }
      }
    };

    // ---------------- Skipper CCD ----------------
    const SIG1 = 3.5; // e⁻, single-measurement read noise (illustrative)
    const weights = [0.5, 0.3, 0.15, 0.05];
    const drawSkipper = (g: G, w: number, h: number, t: number, reduced: boolean) => {
      const d = dualLayout(w, h, 0.45);
      const m = d.main;
      const ph = reduced ? 1 : Math.min(1, (t % 9) / 6.5);
      const N = Math.max(1, Math.round(Math.exp(Math.log(100) * smooth(0, 1, ph))));
      // output stage: gate – sense node – gate, packet moved back and forth
      const by = m.y + m.h * 0.4;
      const gwid = Math.min(60, m.w / 4);
      const x0 = m.x + (m.w - 3 * gwid - 20) / 2;
      const xs = [x0, x0 + gwid + 10, x0 + 2 * gwid + 20];
      const names = [L('gateA'), L('senseNode'), L('gateB')];
      for (let i = 0; i < 3; i++) {
        box(g, xs[i], by, gwid, 34, { stroke: i === 1 ? accent2 : fg, alpha: i === 1 ? 1 : 0.5, lw: i === 1 ? 1.75 : 1 });
        txt(g, names[i], xs[i] + gwid / 2, by + 52, { align: 'center', alpha: 0.8, color: i === 1 ? accent2 : fg });
      }
      // sense-node amplifier symbol (copper) above the node
      g.save();
      g.strokeStyle = accent2;
      g.lineWidth = 1.5;
      const ax = xs[1] + gwid / 2;
      g.beginPath();
      g.moveTo(ax, by);
      g.lineTo(ax, by - 14);
      g.stroke();
      g.beginPath();
      g.moveTo(ax - 10, by - 14);
      g.lineTo(ax - 10, by - 38);
      g.lineTo(ax + 12, by - 26);
      g.closePath();
      g.stroke();
      g.restore();
      txt(g, L('readOut'), ax + 22, by - 28, { alpha: 0.8, color: accent2 });
      // packet of 2 e⁻ shuttling between gates; read each time it sits on the node
      const cyc = reduced ? 0.5 : (t * (0.4 + 0.5 * ph)) % 1;
      const px = reduced ? xs[1] + gwid / 2 : xs[1] + gwid / 2 + Math.sin(cyc * Math.PI * 2) * (gwid + 10);
      for (let q = 0; q < 2; q++) dot(g, px + (q ? 5 : -5), by + 17, 2.8, accent, 1);
      arrow(g, xs[1] - 4, by + 80, xs[0] + gwid / 2, by + 80, { color: fg, alpha: 0.5, head: 5 });
      arrow(g, xs[1] + gwid + 4, by + 80, xs[2] + gwid / 2, by + 80, { color: fg, alpha: 0.5, head: 5 });
      txt(g, L('sameCharge'), m.x + m.w / 2, by + 104, { align: 'center', alpha: 0.85 });
      txt(g, `N = ${F(N)}`, m.x + m.w / 2, by - 70, { mono: true, align: 'center', alpha: 1 });

      // histogram of the averaged readings of many pixels
      const a = d.aux;
      const r = { x: a.x + 18, y: a.y + 40, w: a.w - 36, h: a.h * 0.58 };
      const sg = SIG1 / Math.sqrt(N);
      const pl = plot(g, ctx, r, { min: -2, max: 5, label: L('chargeE'), ticks: [0, 1, 2, 3, 4].map((v) => ({ v, label: F(v) })) }, { min: 0, max: 1.1, label: L('pixelsAxis'), ticks: [] });
      pl.axes();
      const f = (x: number) => weights.reduce((acc, wt, k) => acc + (wt * Math.exp(-((x - k) ** 2) / (2 * sg * sg))) / sg, 0);
      let mx = 0;
      for (let q = 0; q <= 400; q++) mx = Math.max(mx, f(-2 + (7 * q) / 400));
      for (let k = 0; k < 5; k++) line(g, pl.X(k), r.y + r.h, pl.X(k), r.y + r.h - 6, fg, { alpha: 0.4 });
      pl.curve((x) => (f(x) / mx) * 1.02, { color: accent, width: 1.75 }, 400);
      txt(g, `σ = ${F(SIG1, { minimumFractionDigits: 1 })} e⁻ / √${F(N)} = ${F(sg, { maximumFractionDigits: 2 })} e⁻`, r.x, r.y + r.h + 40, { mono: true, alpha: 0.95 });
      txt(g, sg < 0.5 ? L('resolved') : L('notResolved'), r.x + r.w, r.y - 14, { align: 'right', alpha: 0.9, color: sg < 0.5 ? accent : fg });
    };

    // ---------------- SiPM ----------------
    const drawSipm = (g: G, w: number, h: number, t0: number, reduced: boolean) => {
      const t = reduced ? events[2].t + 0.55 : t0 % (events[events.length - 1].t + 1.2);
      const d = dualLayout(w, h, 0.5);
      const m = d.main;
      const c = Math.min((m.w - 8) / SC_COLS, (m.h - 80) / SC_ROWS, 40);
      const gx = m.x + (m.w - SC_COLS * c) / 2;
      const gy = m.y + 46;
      for (let j = 0; j < SC_ROWS; j++) for (let i = 0; i < SC_COLS; i++) box(g, gx + i * c, gy + j * c, c, c, { stroke: fg, alpha: 0.3 });
      for (let i = 0; i <= SC_COLS; i++) line(g, gx + i * c, gy, gx + i * c, gy + SC_ROWS * c, accent2, { alpha: 0.28 });
      // fired cells fade as the cell recharges
      for (const e of events) {
        const dt = t - (e.t + 0.25);
        if (dt < -0.3 || dt > 1.4) continue;
        for (const [ci, cj] of e.cells) {
          const x = gx + ci * c;
          const y = gy + cj * c;
                    if (dt >= 0) box(g, x + 1, y + 1, c - 2, c - 2, { fill: accent, alpha: 0.9 * Math.exp(-dt / 0.55) });
        }
        // photons arriving
        if (dt > -0.3 && dt < 0) {
          for (const [ci, cj] of e.cells) {
            const x = gx + ci * c + c / 2;
            const y = gy + cj * c;
            const f = (dt + 0.3) / 0.3;
            dot(g, x, gy - 20 + f * (y - gy + 20 - c * 0.3), 2.4, fg, 1);
          }
        }
      }
      txt(g, L('cells'), gx, m.y + 12, { alpha: 0.75 });
      txt(g, L('quench'), gx + SC_COLS * c, m.y + 12, { align: 'right', alpha: 0.75, color: accent2 });
      txt(g, `${L('cellGain')} ≈ 10${sup(6)}`, gx, gy + SC_ROWS * c + 22, { mono: false, alpha: 0.9 });

      // output: stripchart of the summed pulse; each level = one more fired cell
      const a = d.aux;
      const r = { x: a.x + 30, y: a.y + 40, w: a.w - 46, h: a.h * 0.55 };
      const unit = r.h / 4.2;
      const tw = 6;
      line(g, r.x, r.y + r.h, r.x + r.w, r.y + r.h, fg, { alpha: 0.45 });
      for (let k = 1; k <= 3; k++) {
        line(g, r.x, r.y + r.h - k * unit, r.x + r.w, r.y + r.h - k * unit, fg, { alpha: 0.28, dash: [3, 4] });
        txt(g, F(k), r.x - 8, r.y + r.h - k * unit, { mono: true, align: 'right', alpha: 0.8 });
      }
      g.save();
      g.strokeStyle = accent;
      g.lineWidth = 1.75;
      g.beginPath();
      const n = 300;
      for (let q = 0; q <= n; q++) {
        const tt = t - tw + (tw * q) / n;
        const v = tt < 0 ? 0 : sipmOut(tt);
        const x = r.x + (r.w * q) / n;
        const y = r.y + r.h - v * unit;
        q ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.restore();
      txt(g, L('firedCells'), r.x, r.y - 14, { alpha: 0.8 });
      txt(g, L('time'), r.x + r.w, r.y + r.h + 16, { align: 'right', alpha: 0.7 });
      txt(g, L('sumIsCount'), r.x, r.y + r.h + 42, { alpha: 0.8 });
    };

    // ---------------- 3D sensor ----------------
    const drawThreeD = (g: G, w: number, h: number, t: number, reduced: boolean) => {
      const T = 200; // µm
      const S = Math.min((h - 130) / T, (w - 90) / 330, 1.6);
      const y0 = 62;
      const gap = 36;
      const wp = 100 * S;
      const w3 = 200 * S;
      const xA = (w - (wp + w3 + gap)) / 2;
      const xB = xA + wp + gap;
      const ph = reduced ? 0.5 : (t % 2.4) / 2.4;
      // planar
      box(g, xA, y0, wp, T * S, { fill: accent, fa: 0.1, stroke: fg, alpha: 0.5 });
      box(g, xA, y0 - 3, wp, 3, { fill: accent2 });
      box(g, xA + wp * 0.3, y0 + T * S, wp * 0.4, 3, { fill: accent2 });
      txt(g, L('planar'), xA, y0 - 26, { alpha: 0.9 });
      const tx = xA + wp / 2;
      line(g, tx, y0 - 10, tx, y0 + T * S, fg, { alpha: 0.45, dash: [4, 4] });
      for (let q = 0; q < 6; q++) {
        const y = y0 + ((q + 0.5) / 6) * T * S * 0.9;
        const ye = Math.min(y0 + T * S, y + ph * T * S);
        arrow(g, tx, y, tx, y + (T * S - (y - y0)) * 0.9, { color: accent, alpha: 0.4, head: 4 });
        dot(g, tx, ye, 2.4, accent, ye < y0 + T * S ? 1 : 0);
      }
      dimV(g, xA - 12, y0, y0 + T * S, `${F(T)} µm`, fg, { side: -1 });
      txt(g, `${L('driftUpTo')} ${F(T)} µm`, xA + wp / 2, y0 + T * S + 22, { align: 'center', alpha: 0.85, mono: false });
      // 3D: columns through the bulk, alternating n⁺ / p⁺, spacing 50 µm
      box(g, xB, y0, w3, T * S, { fill: accent, fa: 0.1, stroke: fg, alpha: 0.5 });
      txt(g, L('threeD'), xB, y0 - 26, { alpha: 0.9 });
      const cols = [25, 75, 125, 175];
      cols.forEach((cx, i) => {
        box(g, xB + cx * S - 3.5, y0 - 3, 7, T * S + 3, { fill: accent2, alpha: i % 2 ? 0.95 : 0.55 });
        txt(g, i % 2 ? 'n⁺' : 'p⁺', xB + cx * S, y0 - 12, { mono: true, align: 'center', alpha: 0.8 });
      });
      const px = xB + 100 * S; // track midway between an n⁺ (75) and a p⁺ (125) column… charges go sideways
      line(g, px, y0 - 24, px, y0 + T * S, fg, { alpha: 0.45, dash: [4, 4] });
      arrow(g, px, y0 - 34, px, y0 - 20, { color: fg, alpha: 0.8, head: 5 });
      for (let q = 0; q < 6; q++) {
        const y = y0 + ((q + 0.5) / 6) * T * S;
        const f = reduced ? 0.55 : Math.min(1, ph * 1.6);
        arrow(g, px, y, px - 22 * S, y, { color: accent, alpha: 0.35, head: 4 });
        dot(g, px - 22 * S * f, y, 2.4, accent, 1);
        arrow(g, px, y, px + 22 * S, y, { color: fg, alpha: 0.3, head: 4 });
        dot(g, px + 22 * S * f, y, 2.4, fg, 0.9, true);
      }
      dimH(g, xB + 75 * S, xB + 125 * S, y0 + T * S + 12, `50 µm`, fg, { below: true });
      txt(g, `${L('driftUpTo')} 50 µm`, xB + w3 / 2, y0 + T * S + 40, { align: 'center', alpha: 0.85 });
    };

    // ---------------- wide gap ----------------
    const drawWide = (g: G, w: number, h: number) => {
      const x0 = 84;
      const bw = w - x0 - (w < 520 ? 100 : 150);
      const X = (v: number) => x0 + (v / (w < 520 ? 19 : 15)) * bw;
      const rowH = Math.min(72, (h - 120) / 4);
      txt(g, L('barNote'), x0, 22, { alpha: 0.7 });
      MATERIALS.forEach((mt, i) => {
        const y = 52 + i * rowH;
        txt(g, L(`mat_${mt.key}`), x0 - 12, y + 18, { align: 'right', alpha: 1 });
        box(g, x0, y, X(mt.eg) - x0, 14, { fill: accent, fa: 0.75 });
        box(g, x0, y + 18, X(mt.w) - x0, 14, { fill: fg, fa: 0.4 });
        txt(g, `E_g ${F(mt.eg)} eV`, X(mt.eg) + 8, y + 7, { mono: true, alpha: 0.95, color: accent });
        txt(g, `w ${F(mt.w)} eV`, X(mt.w) + 8, y + 25, { mono: true, alpha: 0.85 });
        const pairs = 1e6 / mt.w;
        txt(g, `${sci(pairs, 2)}`, w - 14, y + 16, { mono: true, align: 'right', alpha: 0.95 });
      });
      txt(g, L('pairsPerMeV'), w - 14, 22, { align: 'right', alpha: 0.7 });
      txt(g, L('hotNote'), x0, 52 + 4 * rowH + 6, { alpha: 0.8 });
    };

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: ['hpge', 'ccd', 'skipper', 'sipm', '3d'],
      draw(g, s, p, env) {
        const { w, h } = s;
        const R = env.reduced;
        lay[0](g, w, h, p.hpge, (g2) => drawHpge(g2, w, h, s.t, R));
        lay[1](g, w, h, p.ccd, (g2) => drawCcd(g2, w, h, R ? 0 : s.t));
        lay[2](g, w, h, p.skipper, (g2) => drawSkipper(g2, w, h, s.t, R));
        lay[3](g, w, h, p.sipm, (g2) => drawSipm(g2, w, h, s.t, R));
        lay[4](g, w, h, p['3d'], (g2) => drawThreeD(g2, w, h, s.t, R));
        lay[5](g, w, h, p['wide-gap'], (g2) => drawWide(g2, w, h));
      },
    });
  },
};
export default mod;

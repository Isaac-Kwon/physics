/**
 * det.matter-block drawings, part A: ionization, bremsstrahlung, and the three photon processes.
 * Each function draws one state into the rectangle A (CSS px). `e.ts` is seconds since the state was entered (1e3 = final frame).
 */
import type { SceneContext } from '../shared/types';
import { clamp, smooth } from '../shared/canvas2d';
import { betaOf, dEdx } from '../../components/widgets/_physics';
import { DET } from '../../data/detectors';
import { arcPoints, arrow, dot, fieldMark, hash01, line, poly, rgba, txt, wavy, type Env, type G, type Rect } from './_d1-common';

const ME = 0.511; // MeV

export function makeA(ctx: SceneContext) {
  const { accent, accent2, fg } = ctx.theme;
  const L = (k: string) => ctx.label(k);
  const f1 = (v: number, d = 2) => ctx.formatNumber(v, { maximumFractionDigits: d, minimumFractionDigits: d });
  const prog = (e: Env, dur: number) => (e.reduced ? 1 : clamp(e.ts / dur));

  // ------------------------------------------------------------------ ionization: pair spacing ∝ dE/dx(β)
  const ionization = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 2.4);
    const compact = A.h < 420;
    const x0 = A.x + 24;
    const x1 = A.x + A.w - 24;
    const Lpx = x1 - x0; // 4 mm of gas
    const mmPx = Lpx / 4;
    const mip = dEdx(0.5, 0.13957);
    const lanes = [
      { y: A.y + A.h * (compact ? 0.3 : 0.27), m: 0.13957, p: 0.5, name: 'π', col: accent, seed: 3 },
      { y: A.y + A.h * (compact ? 0.74 : 0.7), m: 0.93827, p: 0.4, name: 'p', col: accent2, seed: 9 },
    ];
    const half = compact ? 40 : 52;
    for (const ln of lanes) {
      const ratio = dEdx(ln.p, ln.m) / mip;
      const beta = betaOf(ln.p, ln.m);
      g.strokeStyle = rgba(fg, 0.3);
      g.lineWidth = 1;
      g.strokeRect(x0, ln.y - half, Lpx, 2 * half);
      txt(g, `${ln.name}, p = ${f1(ln.p, 1)} GeV/c, β = ${f1(beta)}`, x0, ln.y - half - 22, { alpha: 0.9, bold: true });
      txt(g, `dE/dx = ${f1(ratio, 1)} × MIP · ${ctx.formatNumber((DET.PAIRS_PER_CM_GAS.value as number) * ratio, { maximumSignificantDigits: 2 })} ${L('pairsPerCm')}`, x0, ln.y - half - 8, { mono: true, alpha: 0.75 });
      const mean = mmPx / 10 / ratio; // 100 pairs/cm for a MIP in argon
      let x = x0 + mean * 0.5;
      let i = 0;
      const xHead = x0 + Lpx * k;
      line(g, x0, ln.y, xHead, ln.y, ln.col, 0.7, 1.25);
      dot(g, xHead, ln.y, 2.6, ln.col, 0.95);
      const pairs: number[] = [];
      while (x < x1) {
        pairs.push(x);
        x += Math.max(mean * 0.25, -Math.log(1 - 0.999 * hash01(ln.seed * 1000 + i++)) * mean);
      }
      for (const px of pairs) {
        if (px > xHead) break;
        dot(g, px, ln.y - 3, 1.3, fg, 0.9); // electron
        g.strokeStyle = rgba(fg, 0.75);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(px, ln.y + 3, 1.5, 0, Math.PI * 2); // ion
        g.stroke();
      }
      if (ln.name === 'π') {
        // one rare, large-energy delta electron: a short track of its own
        const px = pairs[Math.floor(pairs.length * 0.62)];
        if (xHead > px) {
          const a = -0.95;
          const dl = Math.min(1, (xHead - px) / 30) * (half * 1.05);
          line(g, px, ln.y - 3, px + Math.cos(a) * dl, ln.y - 3 + Math.sin(a) * dl, fg, 0.65, 1);
          for (let s = 4; s < dl; s += 5) dot(g, px + Math.cos(a) * s, ln.y - 3 + Math.sin(a) * s, 1, fg, 0.7);
          if (k > 0.97) txt(g, L('delta'), px + Math.cos(a) * dl + 8, ln.y - 3 + Math.sin(a) * dl, { alpha: 0.85 });
        }
      }
    }
    // scale bar
    const by = A.y + A.h - 14;
    line(g, x0, by, x0 + mmPx, by, fg, 0.8, 1);
    line(g, x0, by - 3, x0, by + 3, fg, 0.8, 1);
    line(g, x0 + mmPx, by - 3, x0 + mmPx, by + 3, fg, 0.8, 1);
    txt(g, '1 mm', x0 + mmPx + 8, by, { mono: true, alpha: 0.8 });
    // legend
    dot(g, x1 - 118, by, 1.3, fg, 0.9);
    txt(g, L('electron'), x1 - 110, by, { alpha: 0.75 });
    g.strokeStyle = rgba(fg, 0.75);
    g.beginPath();
    g.arc(x1 - 52, by, 1.5, 0, Math.PI * 2);
    g.stroke();
    txt(g, L('ion'), x1 - 45, by, { alpha: 0.75 });
  };

  // ------------------------------------------------------------------ bremsstrahlung
  const XK = [0.25, 0.7, 1.3, 2.1, 2.9, 3.7];
  const brems = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 2.6);
    const compact = A.h < 440;
    const x0 = A.x + 30;
    const x1 = A.x + A.w - 30;
    const u = (x1 - x0) / 4; // px per X0
    const yE = A.y + A.h * (compact ? 0.17 : 0.18);
    const yM = A.y + A.h * (compact ? 0.4 : 0.38);
    const slabTop = yE - 40;
    const slabBot = yM + 26;
    g.strokeStyle = rgba(fg, 0.3);
    g.lineWidth = 1;
    g.strokeRect(x0, slabTop, x1 - x0, slabBot - slabTop);
    txt(g, L('bremsElectron'), x0, slabTop - 11, { alpha: 0.9, bold: true });
    // electron path with deflections; energy after the k-th radiation E_k = exp(−x_k)
    const ang0 = 0.0;
    const defl = [0.14, -0.12, 0.13, -0.15, 0.14, -0.12];
    let x = x0;
    let y = yE;
    let a = ang0;
    let xPrev = x0;
    const xHead = x0 + (x1 - x0) * k;
    const clipG = () => {
      g.save();
      g.beginPath();
      g.rect(x0, slabTop, x1 - x0, slabBot - slabTop);
      g.clip();
    };
    for (let i = 0; i <= XK.length; i++) {
      const xe = i < XK.length ? x0 + XK[i] * u : x1;
      const Efrac = i === 0 ? 1 : Math.exp(-XK[i - 1]);
      const ye = y + Math.tan(a) * (xe - xPrev);
      const xs = Math.min(xe, xHead);
      if (xs > xPrev) {
        const yy = y + Math.tan(a) * (xs - xPrev);
        line(g, xPrev, y, xs, yy, accent, 0.4 + 0.6 * Efrac, 1.5);
      }
      if (i < XK.length && xe <= xHead) {
        // radiation event: nucleus on the side the electron bends toward, photon continues forward
        const sgn = Math.sign(defl[i]);
        dot(g, xe, ye + sgn * 12, 2.4, fg, 0.9);
        const Eafter = Math.exp(-XK[i]);
        const Ephot = Efrac - Eafter;
        clipG();
        wavy(g, xe, ye, xe + (x1 - xe) * 1, ye + Math.tan(a) * (x1 - xe), { color: fg, wl: 9, amp: 2.6, alpha: 0.3 + 1.4 * Ephot, width: 1.1 });
        g.restore();
        if (i === 0) {
          txt(g, L('photon'), xe + 20, ye - 22, { alpha: 0.85 });
          txt(g, L('nucleus'), xe + 8, ye + sgn * 12 + (sgn > 0 ? 12 : -12), { alpha: 0.7 });
        }
        a += defl[i];
      }
      xPrev = xe;
      y = ye;
      x = xe;
    }
    void x;
    // muon: same material, straight and quiet
    line(g, x0, yM, x0 + (x1 - x0) * k, yM, accent2, 0.85, 1.5);
    txt(g, L('bremsMuon'), x0 + 4, yM - 12, { alpha: 0.85, bold: true });
    txt(g, `≈ ${(DET.MUON_BREMS_SUPPRESSION.value / 1e4).toFixed(0)}×10⁴ ${L('bremsLess')}`, x1 - 4, yM + 12, { align: 'right', alpha: 0.7 });
    // X0 ruler and the energy left after k X0
    const yR = slabBot + 22;
    line(g, x0, yR, x1, yR, fg, 0.7, 1);
    for (let i = 0; i <= 4; i++) {
      line(g, x0 + i * u, yR - 4, x0 + i * u, yR + 4, fg, 0.7, 1);
      txt(g, String(i), x0 + i * u, yR + 14, { mono: true, align: 'center', alpha: 0.75 });
      txt(g, i === 0 ? '1' : ctx.formatNumber(Math.exp(-i), { maximumSignificantDigits: 2 }), x0 + i * u, yR + 30, { mono: true, align: 'center', alpha: 0.9, color: accent });
    }
    txt(g, '/X₀', x1 + 6, yR + 14, { mono: true, alpha: 0.6 });
    txt(g, 'E/E₀', x1 + 6, yR + 30, { mono: true, alpha: 0.6, color: accent });
    txt(g, L('bremsE'), x0 - 0, yR + 48, { alpha: 0.65 });
    const mats = [
      ['lead', DET.X0_LEAD_CM.value as number],
      ['silicon', DET.X0_SILICON_CM.value as number],
      ['water', DET.X0_WATER_CM.value as number],
    ] as const;
    const line1 = mats.map(([n, v]) => `${L(n)} ${ctx.formatNumber(v, { maximumFractionDigits: 2 })} cm`).join(' · ');
    txt(g, `1 X₀ = ${line1}`, x0, yR + 66, { alpha: 0.85 });
  };

  // ------------------------------------------------------------------ photoelectric effect
  const pe = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 2.4);
    const cx = A.x + A.w * 0.56;
    const cy = A.y + A.h * 0.5;
    const rK = Math.min(26, A.h * 0.07);
    const rL = rK * 2.1;
    g.strokeStyle = rgba(fg, 0.3);
    g.lineWidth = 1;
    g.strokeRect(A.x + 16, A.y + 36, A.w - 32, A.h - 72);
    for (const r of [rK, rL]) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    }
    dot(g, cx, cy, 4, fg, 0.95);
    const aK = -0.6;
    const kx = cx + Math.cos(aK) * rK;
    const ky = cy + Math.sin(aK) * rK;
    // shell electrons
    const shell = (r: number, n: number, off: number, skipFirst = false) => {
      for (let i = 0; i < n; i++) {
        if (skipFirst && i === 0 && k > 0.45) continue;
        const ang = off + (i * Math.PI * 2) / n;
        dot(g, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2, fg, 0.85);
      }
    };
    shell(rK, 2, aK, true);
    shell(rL, 6, 0.3);
    // photon travels to the atom, then disappears
    const xs = A.x + 36;
    const t1 = clamp(k / 0.42);
    if (k < 0.45) wavy(g, xs, ky, xs + (kx - xs - 3) * t1, ky, { color: fg, wl: 12, amp: 4.5, alpha: 0.95, width: 1.4 });
    if (k >= 0.45) {
      g.strokeStyle = rgba(fg, 0.7);
      g.setLineDash([2, 3]);
      g.beginPath();
      g.arc(kx, ky, 3.2, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      const t2 = smooth(0.45, 1, k);
      const a = -0.55;
      const len = 120 * t2;
      line(g, kx, ky, kx + Math.cos(a) * len, ky + Math.sin(a) * len, accent, 0.9, 1.5);
      dot(g, kx + Math.cos(a) * len, ky + Math.sin(a) * len, 2.8, accent, 1);
      if (t2 > 0.9) txt(g, `${L('peElectron')} T = 100 − 88 = 12 keV`, kx + Math.cos(a) * 120 + 8, ky + Math.sin(a) * 120 - 6, { color: accent, alpha: 0.95 });
    }
    txt(g, `${L('photon')}, E = 100 keV`, xs, ky - 22, { alpha: 0.9 });
    txt(g, L('peShell'), cx, cy + rL + 18, { align: 'center', alpha: 0.75 });
    txt(g, L('peAbsorbed'), A.x + 24, A.y + A.h - 26, { alpha: 0.75 });
  };

  // ------------------------------------------------------------------ Compton scattering
  const compton = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 2.4);
    const E = 1.0; // MeV
    const th = Math.PI / 3;
    const Ep = E / (1 + (E / ME) * (1 - Math.cos(th)));
    const T = E - Ep;
    const phi = Math.atan(1 / Math.tan(th / 2) / (1 + E / ME));
    const cx = A.x + A.w * 0.4;
    const cy = A.y + A.h * 0.52;
    const wl0 = 13;
    const wl1 = wl0 * (E / Ep); // wavelength ∝ 1/E
    const Lp = Math.min(A.w * 0.4, 190);
    const t1 = clamp(k / 0.35);
    const xs = cx - Lp;
    wavy(g, xs, cy, xs + Lp * t1, cy, { color: fg, wl: wl0, amp: 4, alpha: 0.95, width: 1.4 });
    dot(g, cx, cy, 2.6, fg, 0.95);
    txt(g, `${L('photon')}, E = ${f1(E)} MeV`, xs, cy - 24, { alpha: 0.9 });
    if (k > 0.35) {
      const t2 = smooth(0.35, 0.95, k);
      wavy(g, cx, cy, cx + Math.cos(-th) * Lp, cy + Math.sin(-th) * Lp, { color: fg, wl: wl1, amp: 4, alpha: 0.55, width: 1.3, frac: t2 });
      const le = Lp * 0.55 * Math.sqrt(T / E) * 1.2;
      line(g, cx, cy, cx + Math.cos(phi) * le * t2, cy + Math.sin(phi) * le * t2, accent, 0.95, 1.6);
      dot(g, cx + Math.cos(phi) * le * t2, cy + Math.sin(phi) * le * t2, 2.8, accent, 1);
      if (t2 > 0.95) {
        // angles
        g.save();
        g.strokeStyle = rgba(fg, 0.55);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx, cy, 44, -th, 0);
        g.stroke();
        g.beginPath();
        g.arc(cx, cy, 30, 0, phi);
        g.stroke();
        g.restore();
        txt(g, `θ = ${Math.round((th * 180) / Math.PI)}°`, cx + 50, cy - 24, { mono: true, alpha: 0.85 });
        txt(g, `φ = ${f1((phi * 180) / Math.PI, 0)}°`, cx + 36, cy + 20, { mono: true, alpha: 0.85, color: accent });
        const ex = cx + Math.cos(-th) * Lp;
        const ey = cy + Math.sin(-th) * Lp;
        txt(g, `E′ = ${f1(Ep)} MeV`, ex + 10, ey - 4, { mono: true, alpha: 0.85 });
        txt(g, L('comptonLonger'), ex + 10, ey + 12, { alpha: 0.7 });
        txt(g, `T = E − E′ = ${f1(T)} MeV`, cx + Math.cos(phi) * le + 10, cy + Math.sin(phi) * le + 4, { mono: true, color: accent, alpha: 0.95 });
      }
    }
    txt(g, 'E′ = E / [1 + (E / mₑc²)(1 − cos θ)]', A.x + 24, A.y + A.h - 22, { mono: true, alpha: 0.8 });
  };

  // ------------------------------------------------------------------ pair production
  const pair = (g: G, A: Rect, e: Env) => {
    const k = prog(e, 2.6);
    const E = 10;
    const avail = E - 2 * ME;
    const Tm = 0.5 * avail * 1.1; // e−  (uneven share)
    const Tp = avail - Tm; // e+
    const pm = Math.sqrt(Tm * (Tm + 2 * ME));
    const pp = Math.sqrt(Tp * (Tp + 2 * ME));
    const cx = A.x + A.w * 0.34;
    const cy = A.y + A.h * 0.42;
    const Lp = cx - (A.x + 40);
    const t1 = clamp(k / 0.3);
    wavy(g, cx - Lp, cy, cx - Lp + (Lp - 4) * t1, cy, { color: fg, wl: 10, amp: 3.5, alpha: 0.95, width: 1.4 });
    dot(g, cx, cy, 3.4, fg, 0.95);
    txt(g, `${L('photon')}, E = ${f1(E, 0)} MeV`, cx - Lp, cy - 24, { alpha: 0.9 });
    txt(g, L('nucleus'), cx - 6, cy + 18, { align: 'right', alpha: 0.7 });
    fieldMark(g, A.x + A.w - 24, A.y + 40, true, fg);
    txt(g, L('pairField'), A.x + A.w - 38, A.y + 40, { align: 'right', alpha: 0.7 });
    if (k > 0.3) {
      const t2 = smooth(0.3, 0.95, k);
      const kpx = 30; // px of radius per MeV/c
      const len = Math.min(A.w * 0.5, 240) * t2;
      const em = arcPoints(cx, cy, -0.1, -kpx * pm, len, 1.5); // e−: bends up (counter-clockwise on screen) for B out of the page
      const ep = arcPoints(cx, cy, 0.1, kpx * pp, len, 1.5); // e+: bends down
      poly(g, em, accent, 0.95, 1.5);
      poly(g, ep, accent2, 0.95, 1.5);
      if (t2 > 0.9) {
        const a = em[em.length - 1];
        const b = ep[ep.length - 1];
        txt(g, `e⁻  p = ${f1(pm, 1)} MeV/c`, a[0] + 8, a[1] - 2, { color: accent, alpha: 0.95, mono: true });
        txt(g, `e⁺  p = ${f1(pp, 1)} MeV/c`, b[0] + 8, b[1] + 2, { color: accent2, alpha: 0.95, mono: true });
      }
    }
    // energy budget bar
    const bx = A.x + 24;
    const bw = A.w - 48;
    const by = A.y + A.h - 38;
    const seg = [
      { v: 2 * ME, col: rgba(fg, 0.35), lab: '2mₑc² = 1.022', al: 'left' as CanvasTextAlign },
      { v: Tm, col: rgba(accent, 0.7), lab: `T(e⁻) = ${f1(Tm, 1)}`, al: 'center' as CanvasTextAlign },
      { v: Tp, col: rgba(accent2, 0.7), lab: `T(e⁺) = ${f1(Tp, 1)}`, al: 'center' as CanvasTextAlign },
    ];
    let xx = bx;
    seg.forEach((s2, i) => {
      const wseg = (s2.v / E) * bw;
      g.fillStyle = s2.col;
      g.fillRect(xx, by, wseg - 1, 9);
      if (i === 0) txt(g, s2.lab, xx, by - 11, { mono: true, alpha: 0.8 });
      else txt(g, s2.lab, xx + wseg / 2, by + 22, { mono: true, align: 'center', alpha: 0.85 });
      xx += wseg;
    });
    txt(g, L('pairBudget'), bx, by - 28, { alpha: 0.75 });
    txt(g, `E = ${f1(E, 0)} MeV`, bx + bw, by - 11, { mono: true, align: 'right', alpha: 0.8 });
    txt(g, L('pairThreshold'), A.x + 16, A.y + 10, { alpha: 0.7 });
    void arrow;
  };

  return { ionization, brems, pe, compton, pair };
}

/**
 * hi.geometry — Canvas2D side views (beam axis horizontal) of the two ways to collide.
 *
 * collider: two beams meet, the CM frame is the lab frame, pions are emitted isotropically and fly through a barrel
 *   (tracker inside a solenoid, B = 0.5 T along the beam: tracks bend in the transverse plane).
 * fixed-target: the CM frame moves forward (γ_cm = 4.0, √s_NN ≈ 7.5 GeV): the same isotropic emission is boosted into a
 *   forward cone, cone angle measured from the sample; a dipole (B = 1 T, out of the page) bends tracks in the drawn plane.
 * Tracks are simulated (seeded), coloured by charge, grown from the vertex when a state is entered. Not to scale.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, mulberry32 } from '../shared/canvas2d';
import { HI } from '../../data/heavy-ion';
import { arrow, CHARGE_NEG, CHARGE_POS, label } from './_s2-draw';
import { coneAngle, sampleBoosted, trace, type Track } from './_s2-tracks';

const STATES = ['collider', 'fixed-target'] as const;
const B_BARREL = HI.B_FIELD_BARREL_T.value as number;
const GAMMA_CM = 4.0; // √s_NN ≈ 7.5 GeV (SPS-like)
const NMAX = 130;

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const lab = ctx.label;
    const fmt = ctx.formatNumber;
    const rnd = mulberry32(2026);
    const nC = Math.round(120 * ctx.quality);
    const nF = Math.round(90 * ctx.quality);

    const collider = sampleBoosted(rnd, nC, 1, 0.6);
    for (const t of collider) trace(t, () => [0, 0, B_BARREL], (x, y, z) => Math.hypot(x, y) < 1.5 && Math.abs(z) < 2.4, 0.04, NMAX);
    const fixed = sampleBoosted(rnd, nF, GAMMA_CM, 0.45);
    const dip = (x: number, y: number, z: number): [number, number, number] => (z > 0.9 && z < 1.9 ? [0, 1, 0] : [0, 0, 0]);
    for (const t of fixed) trace(t, dip, (x, y, z) => z < 4.0 && Math.abs(x) < 1.8 && Math.abs(y) < 1.8, 0.04, NMAX);
    const theta90 = coneAngle(fixed, 0.9);

    let k = 0; // 0 collider … 1 fixed target
    let kT = 0;
    let gr = 1;
    let grT = 1;
    const c = createCanvas2D(ctx, draw);

    function tracks(g: CanvasRenderingContext2D, ts: Track[], P: (x: number, z: number) => [number, number], growth: number, alpha: number) {
      const cnt = Math.floor(growth * NMAX) + 1;
      for (const [col, q] of [[CHARGE_POS, 1], [CHARGE_NEG, -1]] as const) {
        g.strokeStyle = col;
        g.globalAlpha = alpha * 0.75;
        g.lineWidth = 1;
        g.beginPath();
        for (const t of ts) {
          if (t.q !== q) continue;
          const n = Math.min(t.pts.length / 3, cnt);
          for (let i = 0; i < n; i++) {
            const [px, py] = P(t.pts[i * 3], t.pts[i * 3 + 2]);
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    function drawCollider(g: CanvasRenderingContext2D, w: number, h: number, a: number) {
      const compact = h < 340;
      const sc = Math.min((w - 50) / 9.2, (h - (compact ? 56 : 120)) / 4.0);
      const ox = w / 2;
      const oy = h / 2 - 8;
      const P = (x: number, z: number): [number, number] => [ox + z * sc, oy - x * sc];
      g.lineWidth = 1;
      // beam pipe
      g.strokeStyle = th.fg;
      g.globalAlpha = a * 0.3;
      g.beginPath();
      g.moveTo(ox - 4.4 * sc, oy);
      g.lineTo(ox + 4.4 * sc, oy);
      g.stroke();
      // detector: tracker and solenoid
      g.globalAlpha = a * 0.55;
      g.strokeRect(ox - 2.4 * sc, oy - 1.5 * sc, 4.8 * sc, 3 * sc);
      g.globalAlpha = a * 0.3;
      g.strokeRect(ox - 2.6 * sc, oy - 1.78 * sc, 5.2 * sc, 3.56 * sc);
      g.globalAlpha = 1;
      tracks(g, collider, P, gr, a);
      // beams
      const by = oy;
      arrow(g, ox - 4.4 * sc, by, ox - 3.1 * sc, by, th.fg, 1.4, a * 0.9);
      arrow(g, ox + 4.4 * sc, by, ox + 3.1 * sc, by, th.fg, 1.4, a * 0.9);
      label(g, lab('beam'), ox - 3.75 * sc, by - 8, th.fg, { align: 'center', alpha: a * 0.8 });
      label(g, lab('beam'), ox + 3.75 * sc, by - 8, th.fg, { align: 'center', alpha: a * 0.8 });
      // labels
      label(g, lab('solenoid'), ox - 2.6 * sc, oy - 1.78 * sc - 7, th.fg, { alpha: a * 0.75 });
      if (!compact) label(g, lab('tracker'), ox - 2.35 * sc, oy - 1.5 * sc + 16, th.fg, { alpha: a * 0.75 });
      // field arrow along z
      arrow(g, ox + 0.7 * sc, oy + 1.28 * sc, ox + 1.9 * sc, oy + 1.28 * sc, th.fg, 1.2, a * 0.9);
      label(g, `B = ${fmt(B_BARREL)} T`, ox + 1.0 * sc, oy + 1.28 * sc - 6, th.fg, { mono: true, alpha: a * 0.85 });
      // notes
      if (!compact) label(g, lab('colNote1'), ox, oy + 1.78 * sc + 24, th.fg, { align: 'center', alpha: a * 0.85 });
      if (!compact) label(g, lab('colNote2'), ox, oy + 1.78 * sc + 40, th.fg, { align: 'center', alpha: a * 0.6 });
    }

    function drawFixed(g: CanvasRenderingContext2D, w: number, h: number, a: number) {
      const compact = h < 340;
      const sc = Math.min((w - 60) / 5.0, (h - (compact ? 56 : 120)) / 3.9);
      const ox = (w - 5.0 * sc) / 2 + 0.7 * sc;
      const oy = h / 2 - 8;
      const P = (x: number, z: number): [number, number] => [ox + z * sc, oy - x * sc];
      g.lineWidth = 1;
      g.strokeStyle = th.fg;
      // beam axis
      g.globalAlpha = a * 0.25;
      g.beginPath();
      g.moveTo(ox - 0.7 * sc, oy);
      g.lineTo(ox + 4.2 * sc, oy);
      g.stroke();
      // cone from the sample (90 % of tracks within theta90)
      const tw = Math.tan(theta90);
      g.setLineDash([4, 5]);
      g.globalAlpha = a * 0.55 * gr;
      for (const s of [1, -1]) {
        g.beginPath();
        g.moveTo(ox, oy);
        const zEnd = Math.min(3.9, 1.75 / tw);
        g.lineTo(ox + zEnd * sc, oy - s * tw * zEnd * sc);
        g.stroke();
      }
      g.setLineDash([]);
      // dipole magnet
      g.globalAlpha = a * 0.6;
      g.strokeRect(ox + 0.9 * sc, oy - 0.8 * sc, 1.0 * sc, 1.6 * sc);
      g.globalAlpha = a * 0.07;
      g.fillStyle = th.fg;
      g.fillRect(ox + 0.9 * sc, oy - 0.8 * sc, 1.0 * sc, 1.6 * sc);
      // silicon stations (thin planes, height grows with the cone)
      g.globalAlpha = a * 0.75;
      g.lineWidth = 2;
      const planes: [number, number][] = [[0.15, 0.22], [0.35, 0.3], [0.6, 0.45], [2.3, 1.0], [2.8, 1.2], [3.3, 1.4]];
      for (const [z, hh] of planes) {
        g.beginPath();
        g.moveTo(...P(hh, z));
        g.lineTo(...P(-hh, z));
        g.stroke();
      }
      g.lineWidth = 4;
      g.globalAlpha = a * 0.55;
      g.beginPath();
      g.moveTo(...P(1.7, 4.0));
      g.lineTo(...P(-1.7, 4.0));
      g.stroke();
      g.lineWidth = 1;
      g.globalAlpha = 1;
      tracks(g, fixed, P, gr, a);
      // target
      g.fillStyle = th.fg;
      g.globalAlpha = a;
      g.fillRect(ox - 1.5, oy - 0.07 * sc, 3, 0.14 * sc);
      g.globalAlpha = 1;
      arrow(g, ox - 0.7 * sc, oy, ox - 0.12 * sc, oy, th.fg, 1.4, a * 0.9);
      label(g, lab('beam'), ox - 0.4 * sc, oy - 8, th.fg, { align: 'center', alpha: a * 0.8 });
      label(g, lab('target'), ox, oy + 0.35 * sc + 14, th.fg, { align: 'center', alpha: a * 0.8 });
      if (!compact) label(g, lab('siStations'), ox + 0.3 * sc, oy - 0.62 * sc, th.fg, { align: 'center', alpha: a * 0.75 });
      if (!compact) label(g, lab('dipole'), ox + 1.4 * sc, oy - 0.8 * sc - 7, th.fg, { align: 'center', alpha: a * 0.8 });
      if (!compact) label(g, lab('stations2'), ox + 2.8 * sc, oy - 1.2 * sc - 8, th.fg, { align: 'center', alpha: a * 0.75 });
      if (!compact) label(g, lab('tof'), ox + 4.0 * sc, oy - 1.7 * sc - 7, th.fg, { align: 'right', alpha: a * 0.75 });
      // B out of the page (⊙)
      g.strokeStyle = th.fg;
      g.fillStyle = th.fg;
      g.globalAlpha = a * 0.8;
      for (const [zz, xx] of [[1.15, -0.5], [1.65, -0.5], [1.15, 0.5], [1.65, 0.5]]) {
        const [px, py] = P(xx, zz);
        g.beginPath();
        g.arc(px, py, 4, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(px, py, 1.2, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      if (!compact) label(g, 'B = 1 T', ox + 1.4 * sc, oy + 0.8 * sc + 14, th.fg, { mono: true, align: 'center', alpha: a * 0.8 });
      // cone label
      const deg = Math.round((theta90 * 180) / Math.PI);
      label(g, `${lab('cone')} ${fmt(deg)}°`, ox + 2.35 * sc, oy - Math.min(1.7, tw * 2.35 + 0.12) * sc - 4 - 0.0 * sc, th.fg, { mono: true, align: 'center', alpha: a * 0.8 * gr });
      // notes
      if (!compact) label(g, `${lab('ftNote1')} γ ≈ ${fmt(GAMMA_CM)}),`, w / 2, oy + 1.9 * sc + 22, th.fg, { align: 'center', alpha: a * 0.85 });
      if (!compact) label(g, lab('ftNote2'), w / 2, oy + 1.9 * sc + 38, th.fg, { align: 'center', alpha: a * 0.6 });
    }

    function draw(g: CanvasRenderingContext2D, s: { w: number; h: number; dt: number }) {
      k = approach(k, kT, s.dt, 0.3);
      gr = approach(gr, grT, s.dt, 0.55);
      const moving = Math.abs(k - kT) > 0.002 || Math.abs(gr - grT) > 0.002 || gr < 0.999 && grT === 1;
      c.animate = moving;
      if (!moving) {
        k = kT;
        gr = grT;
      }
      const a0 = 1 - k;
      const a1 = k;
      if (a0 > 0.01) drawCollider(g, s.w, s.h, a0);
      if (a1 > 0.01) drawFixed(g, s.w, s.h, a1);
      // charge key
      for (const [i, col, txt] of [[0, CHARGE_POS, lab('pos')], [1, CHARGE_NEG, lab('neg')]] as const) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(18, (s.h - 36) + i * 15, 3, 0, Math.PI * 2);
        g.fill();
        label(g, txt, 28, (s.h - 32) + i * 15, th.fg, { alpha: 0.75 });
      }
      label(g, lab('sim'), s.w - 14, 22, th.fg, { align: 'right', alpha: 0.55 });
    }

    return {
      setState(state: string, opts: SetStateOptions) {
        const nk = state === 'fixed-target' ? 1 : 0;
        const changed = nk !== kT;
        kT = nk;
        if (opts.immediate || ctx.reducedMotion) {
          k = kT;
          gr = grT = 1;
        } else if (changed) {
          gr = 0;
          grT = 1;
        }
        c.animate = true;
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;
void clamp;

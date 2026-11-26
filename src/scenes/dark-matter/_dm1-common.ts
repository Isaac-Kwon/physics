/**
 * Private helpers for bundle DM1 (dm.hook, dm.evidence, dm.rotation, dm.candidates, dm.channels, dm.indirect).
 * Not a scene (leading underscore). No window/document access at module top level.
 */
import { gaussian, mulberry32 } from '../shared/canvas2d';
import { MW, vTotal } from './_dm1-rotation';

export { arrow, createStage, makeLayer, txt, type G } from '../heavy-ion/_s3-common';
export { interpolateInferno } from 'd3-scale-chromatic';

/** Parse '#rrggbb' / '#rgb' / 'rgb(a)(...)' into [r, g, b]. */
export function rgbOf(c: string): [number, number, number] {
  if (c.startsWith('#')) {
    const h = c.length === 4 ? c.slice(1).replace(/./g, (x) => x + x) : c.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = c.match(/[\d.]+/g) ?? ['255', '255', '255'];
  return [+m[0], +m[1], +m[2]];
}
export const rgba = (c: string, a: number) => {
  const [r, g, b] = rgbOf(c);
  return `rgba(${r},${g},${b},${a})`;
};

export const R_DISC = 15; // kpc, visible disc radius (DM.GALAXY_RADIUS_KPC)
export const KMS_PER_KPC_TO_RAD_PER_MYR = 1.0227e-3;

export interface Star {
  r: number; // kpc
  phi: number; // rad
  a: number; // alpha 0..1
}

/** Seeded stars: exponential disc (R_d = 3 kpc), two logarithmic spiral arms, a small bulge. */
export function makeStars(n: number, seed: number): Star[] {
  const rnd = mulberry32(seed);
  const out: Star[] = [];
  const pitch = Math.tan((16 * Math.PI) / 180);
  while (out.length < n) {
    const bulge = rnd() < 0.12;
    let r: number;
    if (bulge) r = Math.abs(gaussian(rnd)) * 0.9;
    else r = -MW.rd * (Math.log(1 - rnd()) + Math.log(1 - rnd()));
    if (r > R_DISC) continue;
    const phi = rnd() * Math.PI * 2;
    if (!bulge) {
      const arm = 1 + 0.85 * Math.cos(2 * (phi - Math.log(Math.max(r, 0.3) / 0.3) / pitch));
      if (rnd() * 1.85 > arm * Math.min(1, r / 2)) continue;
    }
    out.push({ r, phi, a: 0.35 + 0.6 * rnd() });
  }
  return out;
}

/** Angular speed (rad/s of scene time) for a star at radius r, with `myrPerS` Myr of galactic time per second. */
export const omega = (r: number, myrPerS = 30) => (vTotal(Math.max(r, 0.25)) / Math.max(r, 0.25)) * KMS_PER_KPC_TO_RAD_PER_MYR * myrPerS;

/** NFW-like halo (dark-matter density, arbitrary units): used only for the density map and indirect-detection emissivity. */
export const nfw = (r: number, rs = 20) => 1 / ((r / rs) * (1 + r / rs) ** 2);

export const sup = (n: number) => String(n).replace(/[-0-9]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
export const pow10 = (n: number) => `10${sup(n)}`;

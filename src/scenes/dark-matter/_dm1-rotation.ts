/**
 * Rotation-curve model for dm.hook, dm.evidence, dm.rotation: a thin adapter over the shared model in
 * src/components/widgets/_physics3.ts (also used by the RotationCurve widget), so figure and widget cannot disagree.
 * Milky-Way-like defaults: M_disc = 6e10 M_sun, R_d = 3 kpc, v_flat = 200 km/s, r_c = 5 kpc.
 */
import { G_KPC, ROT, vDisc as vD, vHalo as vH, vTotal as vT } from '../../components/widgets/_physics3';

export { G_KPC };
export interface RotModel {
  mDisc: number;
  rd: number;
  vFlat: number;
  rc: number;
}
export const MW: RotModel = { mDisc: ROT.MdDefault, rd: ROT.aKpc, vFlat: ROT.vFlatDefault, rc: ROT.rcKpc };

export const vDisc = (r: number, m: RotModel = MW) => vD(r, m.mDisc, m.rd);
export const vHalo = (r: number, m: RotModel = MW) => vH(r, m.vFlat, m.rc);
export const vTotal = (r: number, m: RotModel = MW) => vT(r, m.mDisc, m.vFlat, m.rd, m.rc);
/** Keplerian guide v ∝ r^(−1/2), anchored at r0 on the disc curve. */
export const vKepler = (r: number, r0: number, m: RotModel = MW) => vDisc(r0, m) * Math.sqrt(r0 / r);

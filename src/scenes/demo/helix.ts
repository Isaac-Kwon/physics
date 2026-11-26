/**
 * demo.helix — three.js on the shared renderer. A charged particle crossing a uniform magnetic field B (along z):
 * the Lorentz force bends it into a helix of radius r = p_T / (0.3 B) [m, GeV/c, T]. States change B; the trail is
 * integrated step by step (rotating the transverse velocity), so straight line -> wide helix -> tight helix is physical.
 */
import * as THREE from 'three';
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createThreeView } from '../shared/three-view';

const STATES = ['off', 'weak', 'strong'] as const;
const B_OF: Record<string, number> = { off: 0, weak: 1, strong: 3 };
const PT = 0.9; // GeV/c transverse momentum
const PZ = 0.6; // GeV/c longitudinal
const MAX_PTS = 1400;
const Z_END = 4;
const DS = 0.02; // path step (scene units)

const mod: SceneModule = {
  states: STATES,
  async mount(ctx): Promise<SceneInstance> {
    const view = await createThreeView(ctx);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(4.2, 3.0, 6.5);
    camera.lookAt(0, 0, 2);

    const pos = new Float32Array(MAX_PTS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(ctx.theme.accent) }));
    line.frustumCulled = false;
    scene.add(line);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(ctx.theme.accent2) }));
    scene.add(head);
    // beam axis and end rings for depth cues
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.2), new THREE.Vector3(0, 0, Z_END + 0.2)]),
        new THREE.LineBasicMaterial({ color: new THREE.Color(ctx.theme.fg), transparent: true, opacity: 0.35 }),
      ),
    );
    const ringGeo = new THREE.RingGeometry(1.45, 1.5, 64);
    for (const z of [0, Z_END]) {
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(ctx.theme.fg), transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
      ring.position.z = z;
      scene.add(ring);
    }

    const label = document.createElement('div');
    label.style.cssText = 'position:absolute;left:12px;bottom:10px;font:12px monospace;color:var(--fg-muted,#9aa);pointer-events:none';
    ctx.container.appendChild(label);

    let B = 0;
    let targetB = 0;
    let n = 0;
    let active = true;
    let raf = 0;
    let vx = 0;
    let vy = 0;
    let px = 0;
    let py = 0;
    let pz = 0;
    const vz = PZ / Math.hypot(PT, PZ);

    function push() {
      if (n >= MAX_PTS) return;
      pos[n * 3] = px;
      pos[n * 3 + 1] = py;
      pos[n * 3 + 2] = pz;
      n++;
      geo.setDrawRange(0, n);
      geo.attributes.position.needsUpdate = true;
      head.position.set(px, py, pz);
    }
    function reset() {
      n = 0;
      px = py = pz = 0;
      vx = PT / Math.hypot(PT, PZ);
      vy = 0;
      push();
    }
    function step() {
      // transverse direction rotates at dphi/ds = 0.3 B / p_T  (radius r = p_T / 0.3B)
      const a = ((0.3 * B) / PT) * DS * 4;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nvx = vx * c - vy * s;
      vy = vx * s + vy * c;
      vx = nvx;
      px += vx * DS;
      py += vy * DS;
      pz += vz * DS;
      push();
    }
    function updateLabel() {
      const r = B > 0.01 ? PT / (0.3 * B) : Infinity;
      label.textContent = `B = ${ctx.formatNumber(B, { maximumFractionDigits: 1 })} T   |   r = ${Number.isFinite(r) ? ctx.formatNumber(r, { maximumFractionDigits: 1 }) + ' m' : '∞'}`;
    }
    function frame() {
      raf = 0;
      B = Math.abs(targetB - B) > 0.01 ? B + (targetB - B) * 0.08 : targetB;
      for (let i = 0; i < 4; i++) {
        if (pz >= Z_END || n >= MAX_PTS - 1) reset();
        step();
      }
      updateLabel();
      view.render(scene, camera);
      if (active) raf = requestAnimationFrame(frame);
    }
    function still() {
      B = targetB;
      reset();
      while (pz < Z_END && n < MAX_PTS - 1) step();
      updateLabel();
      view.render(scene, camera);
    }
    reset();

    return {
      setState(state: string, opts: SetStateOptions) {
        targetB = B_OF[state] ?? 0;
        if (ctx.reducedMotion || opts.immediate) {
          if (ctx.reducedMotion) still();
          else {
            B = targetB;
            reset();
            if (active && !raf) raf = requestAnimationFrame(frame);
          }
        } else if (active && !raf) raf = requestAnimationFrame(frame);
      },
      resize(w, h) {
        view.resize(w, h);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
        if (!raf) view.render(scene, camera);
      },
      setActive(a) {
        active = a;
        if (a && !ctx.reducedMotion && !raf) raf = requestAnimationFrame(frame);
        if (!a && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      dispose() {
        cancelAnimationFrame(raf);
        geo.dispose();
        view.dispose();
        label.remove();
      },
    };
  },
};
export default mod;

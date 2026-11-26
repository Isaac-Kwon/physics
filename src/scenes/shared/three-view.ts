/**
 * Helper for three.js scenes that share the page's single renderer.
 * The view owns a plain 2D <canvas> inside ctx.container; render() draws into the shared renderer and blits the result.
 * (devicePixelRatio is capped at 2 here.)
 *
 *   const view = await createThreeView(ctx);
 *   view.resize(w, h);              // from SceneInstance.resize
 *   view.render(scene, camera);     // each frame
 *   view.dispose();
 */
import type { Camera, Scene, WebGLRenderer } from 'three';
import type { SceneContext } from './types';
import { dprCap } from '../../lib/device';

export interface ThreeView {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  resize(width: number, height: number): void;
  render(scene: Scene, camera: Camera): void;
  dispose(): void;
}

export async function createThreeView(ctx: SceneContext): Promise<ThreeView> {
  const renderer = await ctx.getRenderer();
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  ctx.container.appendChild(canvas);
  const c2d = canvas.getContext('2d')!;
  let pw = 1;
  let ph = 1;
  return {
    canvas,
    renderer,
    resize(width, height) {
      const dpr = dprCap();
      pw = Math.max(1, Math.round(width * dpr));
      ph = Math.max(1, Math.round(height * dpr));
      canvas.width = pw;
      canvas.height = ph;
    },
    render(scene, camera) {
      renderer.setPixelRatio(1);
      if (renderer.domElement.width !== pw || renderer.domElement.height !== ph) renderer.setSize(pw, ph, false);
      renderer.render(scene, camera);
      c2d.clearRect(0, 0, pw, ph);
      c2d.drawImage(renderer.domElement, 0, 0, pw, ph);
    },
    dispose() {
      canvas.remove();
    },
  };
}

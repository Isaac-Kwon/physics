/**
 * ONE shared WebGLRenderer per page (PLAN §4.3). Created lazily on first getRenderer() call, never attached to the DOM.
 * Scenes draw into it and copy the result into their own 2D canvas — see three-view.ts.
 */
import type { WebGLRenderer } from 'three';

let shared: Promise<WebGLRenderer> | null = null;

export function getSharedRenderer(): Promise<WebGLRenderer> {
  shared ??= import('three').then(({ WebGLRenderer }) => {
    const r = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setClearColor(0x000000, 0);
    r.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      shared = null; // next scene mount gets a fresh renderer
    });
    return r;
  });
  return shared;
}

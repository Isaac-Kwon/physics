/**
 * Scene registry: id → lazy loader. Every scene module must be listed here.
 * Also exported as SCENE_IDS for scripts/check-content.mjs.
 *
 * Add entries like:
 *   'hi.collision': () => import('./heavy-ion/collision'),
 */
import type { SceneLoader } from './shared/types';

export const scenes: Record<string, SceneLoader> = {
  // Track A demo scenes (lab page)
  'demo.decay': () => import('./demo/decay'),
  'demo.helix': () => import('./demo/helix'),
};

export const SCENE_IDS = Object.keys(scenes);

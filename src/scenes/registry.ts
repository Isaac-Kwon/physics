/**
 * Scene registry: id → lazy loader. Every scene module must be listed here.
 * Also exported as SCENE_IDS for scripts/check-content.mjs.
 *
 * Add entries like:
 *   'hi.collision': () => import('./heavy-ion/collision'),
 */
import type { SceneLoader } from './shared/types';

export const scenes: Record<string, SceneLoader> = {};

export const SCENE_IDS = Object.keys(scenes);

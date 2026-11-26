/**
 * Scene registry — auto-discovered, no manual entries (so parallel scene work never edits a shared file).
 *
 *   src/scenes/<dir>/<name>.ts  →  scene id "<prefix>.<name>"
 *
 * Files starting with "_" are private helpers and are not registered. src/scenes/shared/ holds the runtime only;
 * cross-topic scenes (TPC, magnetic track, silicon sensor …) live in src/scenes/common/ with prefix "shared".
 * scripts/lib/registry.mjs mirrors this mapping for the content checker.
 */
import type { SceneLoader } from './shared/types';

export const SCENE_DIR_PREFIX: Record<string, string> = {
  'heavy-ion': 'hi',
  'dark-matter': 'dm',
  neutrinos: 'nu',
  'semiconductor-detectors': 'sc',
  detectors: 'det',
  hub: 'hub',
  common: 'shared',
  demo: 'demo',
};

const modules = import.meta.glob<{ default: import('./shared/types').SceneModule }>([
  './*/*.ts',
  '!./shared/**',
  '!./*/_*.ts',
]);

export const scenes: Record<string, SceneLoader> = {};
for (const [path, loader] of Object.entries(modules)) {
  const [, dir, file] = path.split('/');
  const prefix = SCENE_DIR_PREFIX[dir];
  if (!prefix) continue;
  scenes[`${prefix}.${file.replace(/\.ts$/, '')}`] = loader;
}

export const SCENE_IDS = Object.keys(scenes);

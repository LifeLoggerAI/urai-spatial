// A visible in-world assistant panel owns its keyboard input before world controls.
// Closed launchers are intentionally excluded: only an open panel claims input.
export const LIFE_MAP_FOREGROUND_INPUT_SELECTOR = '[data-urai-adam-presence], [data-urai-chalk-presence]';
export function lifeMapForegroundControlsOwnKeys(doc) {
  if (!doc || typeof doc.querySelector !== 'function') return false;
  try { return Boolean(doc.querySelector(LIFE_MAP_FOREGROUND_INPUT_SELECTOR)); }
  catch { return true; } // Fail closed rather than accidentally moving a private world.
}

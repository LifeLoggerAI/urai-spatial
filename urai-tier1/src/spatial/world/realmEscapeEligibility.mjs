// A realm Escape is a navigation request only when no inner interaction
// (dialog, editor, ADAM or active transition) owns the key. Shared between
// Focus and Life Map so neither route can steal dialog dismissal.
// This is a pure, deliberately dependency-free predicate for Node 22 tests.
export function shouldHandleRealmEscape(event, documentRef = typeof document === 'undefined' ? undefined : document) {
  if (event.key !== 'Escape' || event.defaultPrevented || event.repeat || event.isComposing) return false
  const target = event.target
  if (target && typeof target.closest === 'function' && target.closest(
    'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="dialog"], [role="menu"], [data-urai-adam-presence], [data-urai-escape-owner]'
  )) return false
  if (documentRef?.querySelector?.('[role="dialog"][aria-modal="true"], [data-urai-escape-owner="active"]')) return false
  const phase = documentRef?.querySelector?.('.urai-world-transition[data-phase]')?.getAttribute?.('data-phase')
  if (phase && phase !== 'idle') return false
  return true
}

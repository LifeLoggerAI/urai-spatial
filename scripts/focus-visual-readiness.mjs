// Serializable predicate for Playwright: a shell or Suspense frame is not a rendered Focus world.
export function focusVisualReady() {
  const root = document.querySelector('[data-testid="urai-final-focus-chamber"]')
  if (!root || root.getAttribute('data-memory-status') !== 'demo'
    || root.getAttribute('data-memory-id') !== 'demo:quiet-reset'
    || root.getAttribute('data-manifest-id') !== 'replay-recovery-thread'
    || root.getAttribute('data-webgl-state') !== 'ready'
    || root.querySelector('.focusFallback')) return false
  const canvas = root.querySelector('canvas')
  const rect = canvas?.getBoundingClientRect()
  return Boolean(rect && rect.width >= 240 && rect.height >= 240 && canvas.width > 0 && canvas.height > 0)
}

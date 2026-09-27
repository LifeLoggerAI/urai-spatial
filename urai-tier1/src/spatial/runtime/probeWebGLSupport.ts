/**
 * Probe WebGL support without reserving one of the browser's context slots.
 * Several launch surfaces mount real R3F canvases after this capability check;
 * a detached test canvas must release its context immediately.
 */
let cachedWebGLSupport: boolean | null = null

export function probeWebGLSupport(): boolean {
  if (cachedWebGLSupport === true) return true
  if (typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!context) return false

    try {
      context.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      // Capability remains known even when the browser blocks explicit cleanup.
    }

    canvas.width = 1
    canvas.height = 1
    cachedWebGLSupport = true
    return true
  } catch {
    return false
  }
}

// Conservatively reduce runtime workload only for positively identified CPU/software
// WebGL. Unknown and privacy-masked renderers retain their normal device tier.
export function isSoftwareWebGLRenderer(vendor: string | null, renderer: string | null): boolean {
  const identity = [vendor ?? '', renderer ?? ''].join(' ').trim()
  return /swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render|mesa offscreen/i.test(identity)
}

// Bound CPU raster surfaces at extreme window sizes; never lower hardware
// fidelity or treat software frames as GPU performance certification.
export function softwareWebGLPixelRatioForViewport(width: number, height: number, maxPixels = 1440 * 900): number {
  if (![width, height, maxPixels].every(value => Number.isFinite(value) && value > 0)) return 1
  return Math.min(1, Math.sqrt(maxPixels / (width * height)))
}

export function detectSoftwareWebGLRenderer(): boolean {
  if (typeof document === 'undefined') return false
  let context: WebGLRenderingContext | WebGL2RenderingContext | null = null
  try {
    const canvas = document.createElement('canvas')
    context = canvas.getContext('webgl2', { powerPreference: 'high-performance' }) ??
      canvas.getContext('webgl', { powerPreference: 'high-performance' })
    if (!context) return false
    const identity = context.getExtension('WEBGL_debug_renderer_info')
    const renderer = identity
      ? String(context.getParameter(identity.UNMASKED_RENDERER_WEBGL) ?? '')
      : String(context.getParameter(context.RENDERER) ?? '')
    const vendor = identity
      ? String(context.getParameter(identity.UNMASKED_VENDOR_WEBGL) ?? '')
      : String(context.getParameter(context.VENDOR) ?? '')
    return isSoftwareWebGLRenderer(vendor, renderer)
  } catch {
    return false
  } finally {
    // Do not retain a detached probe context in addition to the live scene.
    try { context?.getExtension('WEBGL_lose_context')?.loseContext() } catch {}
  }
}

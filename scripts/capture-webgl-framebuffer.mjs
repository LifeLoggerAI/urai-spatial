// Self-contained so Playwright can serialize this function into the page.
// Read during an animation frame, before the default framebuffer is discarded.
export async function captureWebGLFramebuffer(canvas) {
  return new Promise((resolve, reject) => requestAnimationFrame(() => {
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl || gl.isContextLost()) throw new Error('WebGL framebuffer unavailable')
      const width = gl.drawingBufferWidth
      const height = gl.drawingBufferHeight
      if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 16_777_216) throw new Error('Invalid or oversized WebGL framebuffer')
      if (gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null) throw new Error('Default WebGL framebuffer is not bound')
      if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL error before framebuffer read')
      const pixels = new Uint8Array(width * height * 4)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL framebuffer read failed')
      const surface = document.createElement('canvas')
      surface.width = width
      surface.height = height
      const context = surface.getContext('2d')
      if (!context) throw new Error('PNG encoding surface unavailable')
      const image = context.createImageData(width, height)
      const rowBytes = width * 4
      for (let y = 0; y < height; y += 1) image.data.set(pixels.subarray((height - y - 1) * rowBytes, (height - y) * rowBytes), y * rowBytes)
      context.putImageData(image, 0, 0)
      resolve({ dataUrl: surface.toDataURL('image/png'), width, height, source: 'webgl-default-framebuffer-readPixels' })
    } catch (error) { reject(error) }
  }))
}

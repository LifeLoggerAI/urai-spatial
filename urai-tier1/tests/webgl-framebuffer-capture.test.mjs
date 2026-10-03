import test from 'node:test'
import assert from 'node:assert/strict'
import { captureWebGLFramebuffer } from '../../scripts/capture-webgl-framebuffer.mjs'

function harness({ lost = false, binding = null, error = 0, width = 1, height = 2, blankFrames = 0 } = {}) {
  let image, reads = 0
  const oldFrame = globalThis.requestAnimationFrame, oldDocument = globalThis.document
  globalThis.requestAnimationFrame = fn => queueMicrotask(fn)
  globalThis.document = { createElement: () => ({ getContext: () => ({ createImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData: value => { image = value }, }), toDataURL: () => 'data:image/png;base64,cG5n' }) }
  const gl = { drawingBufferWidth: width, drawingBufferHeight: height, FRAMEBUFFER_BINDING: 1, NO_ERROR: 0, RGBA: 2, UNSIGNED_BYTE: 3, isContextLost: () => lost, getParameter: () => binding, getError: () => error, readPixels: (...args) => { reads++; if (reads > blankFrames) args[6].set([10,20,30,255,40,50,60,255]) } }
  return { canvas: { getContext: type => type === 'webgl2' ? gl : null }, image: () => image, reads: () => reads, restore() { globalThis.requestAnimationFrame = oldFrame; globalThis.document = oldDocument } }
}
test('retained framebuffer pixels exclude DOM overlays and preserve upright row order', async () => {
  const h = harness()
  try {
    const result = await captureWebGLFramebuffer(h.canvas)
    assert.equal(result.source, 'webgl-default-framebuffer-readPixels')
    assert.deepEqual([result.width,result.height], [1,2])
    assert.deepEqual([...h.image().data], [40,50,60,255,10,20,30,255])
    assert.equal(h.reads(), 1)
  } finally { h.restore() }
})
test('unavailable, non-default, oversized and errored framebuffers cannot produce a receipt', async () => {
  for (const spec of [{ lost:true }, { binding:{} }, { width:0 }, { width:8192,height:8192 }, { error:1282 }]) {
    const h = harness(spec)
    try { await assert.rejects(captureWebGLFramebuffer(h.canvas)); assert.equal(h.reads(), 0) } finally { h.restore() }
  }
})
test('initial blank frames retry actual GPU reads and persist only the painted frame', async () => {
  const h = harness({ blankFrames: 2 })
  try { await captureWebGLFramebuffer(h.canvas); assert.equal(h.reads(), 3); assert.deepEqual([...h.image().data], [40,50,60,255,10,20,30,255]) } finally { h.restore() }
})
test('permanently blank framebuffers fail after the bounded wait', async () => {
  const h = harness({ blankFrames: 100 })
  try { await assert.rejects(captureWebGLFramebuffer(h.canvas), /remained blank for 60 frames/); assert.equal(h.reads(), 60); assert.equal(h.image(), undefined) } finally { h.restore() }
})

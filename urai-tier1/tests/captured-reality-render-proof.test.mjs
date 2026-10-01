import assert from 'node:assert/strict'
import test from 'node:test'
import { capturedRealityFrameHasMeaningfulPixels } from '../src/spatial/captured-reality/capturedRealityRenderProof.ts'

function fakeContext(samples, lost = false) {
  let index = 0
  return {
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    isContextLost: () => lost,
    readPixels(_x, _y, _w, _h, _format, _type, target) {
      target.set(samples[Math.min(index++, samples.length - 1)])
    },
  }
}

test('blank framebuffer never certifies Gaussian render', () => {
  const context = fakeContext([[0, 0, 0, 255]])
  assert.equal(capturedRealityFrameHasMeaningfulPixels({
    context, width: 100, height: 100, background: [0, 0, 0, 255],
  }), false)
})

test('two materially different samples certify technical Gaussian render', () => {
  const background = [5, 7, 11, 255]
  const samples = Array.from({ length: 35 }, () => [...background])
  samples[4] = [90, 40, 20, 255]
  samples[18] = [12, 80, 30, 255]
  const context = fakeContext(samples)
  assert.equal(capturedRealityFrameHasMeaningfulPixels({
    context, width: 100, height: 100, background,
  }), true)
})

test('lost context and invalid dimensions fail closed', () => {
  const context = fakeContext([[255, 255, 255, 255]], true)
  assert.equal(capturedRealityFrameHasMeaningfulPixels({ context, width: 100, height: 100, background: [0, 0, 0, 255] }), false)
  const live = fakeContext([[255, 255, 255, 255]])
  assert.equal(capturedRealityFrameHasMeaningfulPixels({ context: live, width: 0, height: 100, background: [0, 0, 0, 255] }), false)
})

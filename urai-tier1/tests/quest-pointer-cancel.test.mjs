import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const runtimeUrl = new URL('../src/app/spatial/ar-vr/xrEntryWorldRuntime.ts', import.meta.url)

test('XR canvas drag resets after pointer cancellation, capture loss and blur', async () => {
  const source = await readFile(runtimeUrl, 'utf8')

  assert.match(source, /cancelPointerDrag/)
  assert.match(source, /hasPointerCapture/)
  assert.match(source, /addEventListener\('pointercancel'/)
  assert.match(source, /addEventListener\('lostpointercapture'/)
  assert.match(source, /addEventListener\('blur', this\.windowBlur\)/)
  assert.match(source, /removeEventListener\('pointercancel'/)
  assert.match(source, /removeEventListener\('lostpointercapture'/)
  assert.match(source, /removeEventListener\('blur', this\.windowBlur\)/)
})

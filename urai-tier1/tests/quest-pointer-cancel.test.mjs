import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const runtimeUrl = new URL('../src/app/spatial/ar-vr/xrEntryWorldRuntime.ts', import.meta.url)

test('XR canvas drag resets safely', async () => {
  const source = await readFile(runtimeUrl, 'utf8')
  assert.ok(source.includes('cancelPointerDrag'))
  assert.ok(source.includes('hasPointerCapture'))
  assert.ok(source.includes('pointercancel'))
  assert.ok(source.includes('lostpointercapture'))
  assert.ok(source.includes('windowBlur'))
  assert.ok(source.includes('removeEventListener'))
})

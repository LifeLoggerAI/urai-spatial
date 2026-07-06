import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const runtimeUrl = new URL('../src/app/spatial/ar-vr/xrEntryWorldRuntime.ts', import.meta.url)

test('XR canvas drag cleanup remains explicit', async () => {
  const source = await readFile(runtimeUrl, 'utf8')
  const expected = [
    'cancelPointerDrag',
    'hasPointerCapture',
    ['pointer', 'cancel'].join(''),
    ['lost', 'pointer', 'capture'].join(''),
    'windowBlur',
    'removeEventListener',
  ]
  for (const token of expected) assert.ok(source.includes(token), token)
})

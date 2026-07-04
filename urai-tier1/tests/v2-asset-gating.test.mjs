import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const files = [
  '../src/app/v2-memory-states.css',
  '../src/app/v2-accessibility-states.css',
  '../src/app/v2-realm-states.css',
  '../src/app/v2-ground-states.css',
  '../src/app/v2-ground-council.css',
  '../src/app/v2-ground-objects.css',
]

test('V2 asset references remain behind the verified handoff gate', async () => {
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8')
    const blocks = [...source.matchAll(/([^{}]+)\{([^{}]*\/assets\/urai\/v2\/[^{}]*)\}/g)]
    assert.ok(blocks.length > 0)
    for (const block of blocks) assert.match(block[1], /html\.urai-v2-assets-ready/)
  }
})

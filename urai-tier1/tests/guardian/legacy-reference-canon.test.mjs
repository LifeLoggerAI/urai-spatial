import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../../src/spatial/legacy/LegacyArchiveWorld.tsx', import.meta.url), 'utf8')
const capture = fs.readFileSync(new URL('../../../scripts/capture-reference-estate.mjs', import.meta.url), 'utf8')

test('Legacy reference estate covers all ten states with semantic fallback', () => {
  assert.match(source, /data-legacy-review-state/)
  assert.match(source, /urai-legacy-spatial-fallback/)
  assert.match(source, /no invented lineage or family record/)
  assert.match(source, /review-low/)
  for (let index = 1; index <= 10; index += 1) {
    const id = \`LEGACY-\${String(index).padStart(3, '0')}\`
    assert.ok(capture.includes(\`id:'\${id}'\`), \`missing \${id}\`)
  }
})

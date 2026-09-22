import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../../src/spatial/council/CouncilRealm.tsx', import.meta.url), 'utf8')
const capture = fs.readFileSync(new URL('../../../scripts/capture-reference-estate.mjs', import.meta.url), 'utf8')

test('Council reference review preserves preview-human truth and all written state IDs', () => {
  assert.match(source, /human-makehuman-v4-preview/)
  assert.match(source, /REFERENCE REVIEW — selected speaker is visually identified/)
  assert.match(source, /transcript is authoritative/)
  assert.match(source, /data-council-reduced-stimulation/)
  assert.match(source, /urai-council-spatial-fallback/)
  for (let index = 1; index <= 14; index += 1) {
    const id = `COUNCIL-\${String(index).padStart(3, '0')}`
    assert.ok(capture.includes(`id:'\${id}'`), `missing \${id}`)
  }
})

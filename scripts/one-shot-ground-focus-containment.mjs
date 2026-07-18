import fs from 'node:fs'

const replaceOnce = (path, before, after) => {
  const source = fs.readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const ground = 'urai-tier1/src/app/GroundSpatialWorldClean.tsx'
replaceOnce(
  ground,
  'transition:max-width .22s ease,border-color .18s ease,background .18s ease,transform .18s ease,color .18s ease',
  'transition:border-color .18s ease,background .18s ease,transform .18s ease,color .18s ease',
)
replaceOnce(
  ground,
  'transition:opacity .16s ease,max-width .22s ease',
  'transition:opacity .16s ease',
)

const contract = 'urai-tier1/tests/accessibility-performance-source-contract.test.mjs'
replaceOnce(
  contract,
  "  requireText(ground, 'min-height:48px')",
  "  requireText(ground, 'min-height:48px')\n  assert.doesNotMatch(ground, /transition:max-width/, 'Ground focus expansion must be synchronous before scroll containment is measured')\n  assert.doesNotMatch(ground, /transition:opacity \\.16s ease,max-width/, 'Ground destination labels must not expand width after focus scrolling')",
)

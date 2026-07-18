import fs from 'node:fs'

const path = 'urai-tier1/tests/persistent-world-doorway-regression.test.mjs'
const source = fs.readFileSync(path, 'utf8')
const before = `  assert.match(visualAudit, /check\\.name === 'life-map-to-focus'/)
  assert.match(visualAudit, /summary:has-text\\("Map controls"\\)/)
  assert.match(visualAudit, /\\.life-map-accessibility-menu button/)
  assert.match(visualAudit, /check\\.name !== 'life-map-to-focus'/)`
const after = `  assert.match(visualAudit, /button\\[data-world-target="focus"\\]/)
  assert.match(visualAudit, /a\\[data-urai-audit-action="life-map-focus"\\]/)
  assert.match(visualAudit, /let found = await firstVisible\\(page, check\\.selectors\\)/)
  assert.match(visualAudit, /found = await firstVisible\\(page, check\\.selectors\\)/)`

if (!source.includes(before)) throw new Error(`Expected legacy doorway audit assertions not found in ${path}`)
if (source.indexOf(before) !== source.lastIndexOf(before)) throw new Error(`Legacy doorway audit assertion cluster duplicated in ${path}`)
fs.writeFileSync(path, source.replace(before, after))

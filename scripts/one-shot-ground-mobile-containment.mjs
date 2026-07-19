import fs from 'node:fs'

// Final current-head trigger: the publisher must certify and push from this unchanged transient authority.
const replaceExact = (path, before, after, expectedCount, label) => {
  const source = fs.readFileSync(path, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expectedCount) throw new Error(`Expected ${expectedCount} ${label} occurrence(s) in ${path}, found ${count}`)
  const next = source.split(before).join(after)
  if (next === source) throw new Error(`No change while applying ${label} in ${path}`)
  fs.writeFileSync(path, next)
  console.log(`Applied ${label}`)
}

const ground = 'urai-tier1/src/app/GroundSpatialWorldClean.tsx'
replaceExact(
  ground,
  'scrollIntoView({ block: "nearest", inline: "center" })',
  'scrollIntoView({ block: "nearest", inline: "nearest" })',
  2,
  'nearest-edge Ground focus reveal',
)
replaceExact(
  ground,
  'padding-inline:12px 210px;scroll-padding-inline:12px 210px',
  'padding-inline:max(14px,env(safe-area-inset-left)) max(14px,env(safe-area-inset-right));scroll-padding-inline-start:max(14px,env(safe-area-inset-left));scroll-padding-inline-end:max(14px,env(safe-area-inset-right))',
  1,
  'symmetric Ground mobile safe-area gutters',
)
replaceExact(
  ground,
  '.ground-destination-compass :is(a,button){min-height:48px;max-width:46px;padding:7px 10px;font-size:9px}.ground-destination-compass :is(a,button):hover',
  '.ground-destination-compass :is(a,button){min-height:48px;max-width:46px;padding:7px 10px;font-size:9px;transition:none}.ground-destination-compass :is(a,button) strong{transition:none}.ground-destination-compass :is(a,button):hover',
  1,
  'deterministic Ground mobile focus expansion',
)

const sourceContract = 'urai-tier1/tests/accessibility-performance-source-contract.test.mjs'
replaceExact(
  sourceContract,
  String.raw`requireNormalizedPattern(ground, /inline:\s*'center'/, 'Ground focus reveal must center the destination inline')`,
  String.raw`requireNormalizedPattern(ground, /inline:\s*'nearest'/, 'Ground focus reveal must use the nearest inline boundary')`,
  1,
  'Ground nearest-edge source contract',
)
replaceExact(
  sourceContract,
  "  requireText(ground, 'min-height:48px')\n",
  "  requireText(ground, 'min-height:48px')\n  requireText(ground, 'padding-inline:max(14px,env(safe-area-inset-left)) max(14px,env(safe-area-inset-right))')\n  requireText(ground, 'scroll-padding-inline-start:max(14px,env(safe-area-inset-left))')\n  requireText(ground, 'scroll-padding-inline-end:max(14px,env(safe-area-inset-right))')\n  requireText(ground, 'font-size:9px;transition:none')\n  requireText(ground, '.ground-destination-compass :is(a,button) strong{transition:none}')\n  assert.equal(ground.includes('padding-inline:12px 210px'), false, 'Ground must not reserve a hard-coded mobile right gutter')\n",
  1,
  'Ground safe-area source contract',
)

const restorationContract = 'urai-tier1/tests/continuous-spatial-restoration-contract.test.mjs'
replaceExact(
  restorationContract,
  String.raw`  assert.match(groundCanonical, /scrollIntoView\(\{\s*block:\s*'nearest',\s*inline:\s*'nearest',?\s*\}\)/)`,
  String.raw`  // Ground nearest-edge focus reveal is canonical and prevents mobile rail overflow.
  assert.match(groundCanonical, /scrollIntoView\(\{\s*block:\s*'nearest',\s*inline:\s*'nearest',?\s*\}\)/)
  assert.match(groundCanonical, /@media\(max-width:700px\)[\s\S]*?font-size:\s*9px;\s*transition:\s*none[\s\S]*?strong\{\s*transition:\s*none\s*\}/)`,
  1,
  'Ground nearest-edge restoration contract',
)

console.log('Applied bounded Ground mobile containment repair')

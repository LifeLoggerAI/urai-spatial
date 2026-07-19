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

// The unified publisher runs the Life Map transform first and this Ground transform second.
// In that lane only, strengthen the generated route-owned mobile action geometry. The
// Ground-only diagnostic sees the untransformed CSS and safely skips this conditional block.
const selectedCss = 'urai-tier1/src/spatial/world/lifeMapSelectedCinematic.css'
const selectedCssSource = fs.readFileSync(selectedCss, 'utf8')
if (selectedCssSource.includes('  position: fixed;\n  z-index: 90;')) {
  replaceExact(
    selectedCss,
    '  position: fixed;\n  z-index: 90;\n  left: max(20px, env(safe-area-inset-left));',
    '  position: fixed;\n  z-index: 2147482000;\n  isolation: isolate;\n  left: max(20px, env(safe-area-inset-left));',
    1,
    'Life Map route-action stacking ownership',
  )
  replaceExact(
    selectedCss,
    '  transform: none;\n  pointer-events: auto;\n}',
    '  transform: none;\n  pointer-events: auto !important;\n}',
    1,
    'Life Map route-action pointer ownership',
  )
  replaceExact(
    selectedCss,
    `  .life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals button {
    min-height: 48px;
    padding-inline: 6px;
    font-size: 10px;
    letter-spacing: 0;
  }`,
    `  .life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals button {
    position: relative;
    z-index: 2;
    min-width: 48px;
    min-height: 52px !important;
    padding-inline: 6px;
    font-size: 10px;
    letter-spacing: 0;
    pointer-events: auto !important;
    touch-action: manipulation;
  }`,
    1,
    'Life Map mobile Focus touch and pointer target',
  )

  const deepLinkContract = 'urai-tier1/tests/lifemap-deep-link-controls-contract.test.mjs'
  replaceExact(
    deepLinkContract,
    '  assert.match(selectedCinematic, /z-index: 90/)\n',
    "  assert.match(selectedCinematic, /z-index: 2147482000/)\n  assert.match(selectedCinematic, /isolation: isolate/)\n  assert.match(selectedCinematic, /pointer-events: auto !important/)\n",
    1,
    'Life Map route-action stacking contract',
  )
  replaceExact(
    deepLinkContract,
    "  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-height: 48px/)\n",
    "  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-width: 48px/)\n  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-height: 52px !important/)\n  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*pointer-events: auto !important/)\n  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*touch-action: manipulation/)\n",
    1,
    'Life Map mobile pointer target contract',
  )

  const finalContract = 'urai-tier1/tests/final-aaa-world-convergence-contract.test.mjs'
  replaceExact(
    finalContract,
    '  assert.match(lifeMapSelectedCinematic, /position: fixed/)\n',
    "  assert.match(lifeMapSelectedCinematic, /position: fixed/)\n  assert.match(lifeMapSelectedCinematic, /z-index: 2147482000/)\n  assert.match(lifeMapSelectedCinematic, /pointer-events: auto !important/)\n",
    1,
    'final AAA route-action stacking contract',
  )
  replaceExact(
    finalContract,
    "  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-height: 48px/)\n",
    "  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-width: 48px/)\n  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-height: 52px !important/)\n  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*pointer-events: auto !important/)\n",
    1,
    'final AAA mobile pointer target contract',
  )

  console.log('Applied bounded Life Map mobile pointer-ownership repair')
}

console.log('Applied bounded Ground mobile containment repair')

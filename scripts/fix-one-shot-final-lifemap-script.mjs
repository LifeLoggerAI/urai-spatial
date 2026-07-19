import fs from 'node:fs'

const path = 'scripts/one-shot-final-lifemap-deterministic-repair.mjs'
const source = fs.readFileSync(path, 'utf8')
const lines = source.split('\n')
let templateAssertions = 0
let readinessExpression = 0

let next = lines.map((line) => {
  if (line.includes('assert.match(source, /key={\\\\`memory-main-')) {
    templateAssertions += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-main-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  if (line.includes('assert.match(source, /key={\\\\`memory-left-')) {
    templateAssertions += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-left-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  if (line.includes('assert.match(source, /key={\\\\`memory-right-')) {
    templateAssertions += 1
    return "  assert.equal(source.includes('key={' + String.fromCharCode(96) + 'memory-right-\\${textureKey}' + String.fromCharCode(96) + '}'), true);"
  }
  if (line.includes('const visualGenerationKey = \\`${webglState}:')) {
    readinessExpression += 1
    return line.replace('${webglState}', '\\${webglState}')
  }
  return line
}).join('\n')

const bt = String.fromCharCode(96)
const genericOverview = [
  'replaceOnce(proof,',
  bt + "      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)" + bt + ',',
  bt + "      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)",
  "      const visualReadyMarked = await page.evaluate(() => performance.getEntriesByName('urai:life-map-visual-ready').length > 0)" + bt + ')',
].join('\n')
const uniqueOverview = [
  'replaceOnce(proof,',
  bt + "      const overlayOpacities = await page.locator('[data-testid=\"urai-r3f-canonical-lifemap\"] > div[aria-hidden=\"true\"]').evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).opacity || '1')))",
  "      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)" + bt + ',',
  bt + "      const overlayOpacities = await page.locator('[data-testid=\"urai-r3f-canonical-lifemap\"] > div[aria-hidden=\"true\"]').evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).opacity || '1')))",
  "      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)",
  "      const visualReadyMarked = await page.evaluate(() => performance.getEntriesByName('urai:life-map-visual-ready').length > 0)" + bt + ')',
].join('\n')

if (!next.includes(genericOverview)) throw new Error('Expected generic overview readiness insertion was not found')
next = next.replace(genericOverview, uniqueOverview)

const completionMarker = "console.log('Applied deterministic Life Map visual readiness, composition, and accessibility repair.')"
const permanentContractPatches = [
  "const restorationContract = 'urai-tier1/tests/continuous-spatial-restoration-contract.test.mjs'",
  'replaceOnce(restorationContract,',
  'String.raw' + bt + "  assert.match(groundCanonical, /scrollIntoView\\(\\{\\s*block:\\s*'nearest',\\s*inline:\\s*'center',?\\s*\\}\\)/)" + bt + ',',
  'String.raw' + bt + "  assert.match(groundCanonical, /scrollIntoView\\(\\{\\s*block:\\s*'nearest',\\s*inline:\\s*'nearest',?\\s*\\}\\)/)" + bt + ')',
  '',
  "const postDeployGroundContract = 'urai-tier1/tests/post-deploy-ground-smoke-contract.test.mjs'",
  'replaceOnce(postDeployGroundContract,',
  'String.raw' + bt + "  assert.match(canonicalGround, /scrollIntoView\\(\\{\\s*block:\\s*'nearest',\\s*inline:\\s*'center',?\\s*\\}\\)/)" + bt + ',',
  'String.raw' + bt + "  assert.match(canonicalGround, /scrollIntoView\\(\\{\\s*block:\\s*'nearest',\\s*inline:\\s*'nearest',?\\s*\\}\\)/)" + bt + ')',
  '',
  "const sceneBehaviorContract = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'",
  'replaceOnce(sceneBehaviorContract,',
  bt + "  assert.ok(canonical.includes('opacity: .78'), 'The authored universe must not regress to a nearly invisible decorative tint.')" + bt + ',',
  'String.raw' + bt + `  assert.ok(canonical.includes('data-life-map-seam-blended="true"'), 'The authored universe must explicitly blend its baked source seam.')
  assert.ok(canonical.includes('opacity: .56'), 'The authored universe must remain visible without overpowering committed memory surfaces.')
  assert.ok(canonical.includes('WebkitMaskImage: "linear-gradient(to bottom'), 'The authored universe must preserve its center crossfade in WebKit.')
  const continuityBlock = source.match(/function ContinuityNexus[\\s\\S]*?\\n}\\n\\nfunction ChapterRegions/)?.[0] ?? ''
  assert.ok(continuityBlock.includes('<octahedronGeometry args={[1, 0]} />'), 'The continuity nexus must use restrained shard geometry.')
  assert.doesNotMatch(continuityBlock, /<boxGeometry/, 'The continuity nexus must not regress to rectangular debug slabs.')` + bt + ')',
  '',
].join('\n')
if (!next.includes(completionMarker)) throw new Error('Expected completion marker was not found')
next = next.replace(completionMarker, permanentContractPatches + completionMarker)

if (templateAssertions !== 3) throw new Error(`Expected three nested-template assertions; replaced ${templateAssertions}`)
if (readinessExpression !== 1) throw new Error(`Expected one generated readiness expression; replaced ${readinessExpression}`)
fs.writeFileSync(path, next)
console.log('Normalized generator syntax and aligned permanent Ground and Life Map composition contracts.')

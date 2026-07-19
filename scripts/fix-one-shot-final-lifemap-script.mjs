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

if (templateAssertions !== 3) throw new Error(`Expected three nested-template assertions; replaced ${templateAssertions}`)
if (readinessExpression !== 1) throw new Error(`Expected one generated readiness expression; replaced ${readinessExpression}`)
fs.writeFileSync(path, next)
console.log('Normalized nested assertions, generated readiness expression, and unique overview proof insertion.')

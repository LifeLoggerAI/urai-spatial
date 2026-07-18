import fs from 'node:fs'

const path = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'
let source = fs.readFileSync(path, 'utf8')

const startMarker = "  assert.match(source, /:\\s*80;"
const endMarker = "  assert.doesNotMatch(source, /canvas\\.width"
const start = source.indexOf(startMarker)
const end = source.indexOf(endMarker, start)
if (start < 0 || end < 0) {
  throw new Error(`Texture ownership contract markers missing: start=${start} end=${end}`)
}

const replacement = [
  "  assert.match(source, /:\\s*80;\\s*const texture = useMemo\\(\\(\\) => createMemorySurface\\(node, textureResolution\\)/, 'Non-related memories must retain the smallest allocation under synchronous texture ownership.')",
  "  assert.ok(source.includes('const texture = useMemo(() => createMemorySurface(node, textureResolution), [node, textureResolution])'), 'Texture creation must be memoized by node and allocation tier.')",
  "  assert.doesNotMatch(source, /setTexture\\(|useState<THREE\\.CanvasTexture \\| null>/, 'Synchronous texture ownership must not use delayed React texture state.')",
  "  assert.ok(source.includes('const dispose = () => texture?.dispose()'), 'Texture replacements must retain deterministic disposal ownership.')",
  "  assert.ok(source.includes('window.requestAnimationFrame(dispose)'), 'Replaced textures must remain alive through the replacement paint.')",
  "  assert.ok(source.includes('opacity={texture ? selected ? 1 : overview ? 0.82 : related ? 0.42 : 0.11 : 0}'), 'Unavailable textures must stay transparent rather than exposing a white fallback.')",
  "  assert.ok(source.includes('name=\"life-map-memory-lens-hit-target\"'), 'Memory lenses must retain stable interaction ownership.')",
  "  assert.ok(source.includes('if (!/^[0-9a-f]{6}$/i.test(normalized))'), 'Invalid aura metadata must fall back before RGB bitwise conversion.')",
  "  assert.ok(source.includes('return `rgba(138, 223, 255, ${alpha})`'), 'Invalid aura metadata must use the canonical cyan fallback.')",
  "  assert.match(source, /useMemo\\(\\(\\) => createMemorySurface/, 'CanvasTexture allocation must use bounded synchronous memoization.')",
  '',
].join('\n')

source = source.slice(0, start) + replacement + source.slice(end)

const lines = source.split('\n')
let keyAssertionCount = 0
for (let index = 0; index < lines.length; index += 1) {
  if (lines[index].includes('assert.match(source, /key=') && lines[index].includes('textureKey')) {
    lines[index] = '  assert.match(source, /key=\\{textureKey \\+ "-main"\\}/)'
    keyAssertionCount += 1
  }
}
if (keyAssertionCount !== 1) {
  throw new Error(`Expected one texture remount assertion, found ${keyAssertionCount}`)
}

fs.writeFileSync(path, lines.join('\n'))
console.log('Reconciled synchronous Life Map texture ownership and remount contracts.')

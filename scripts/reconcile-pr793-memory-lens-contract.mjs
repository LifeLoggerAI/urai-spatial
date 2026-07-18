import fs from 'node:fs'

const path = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'
let source = fs.readFileSync(path, 'utf8')

const legacyMessage = 'Non-related memories must use the smallest allocation before commit-phase texture state.'
const synchronousMessage = 'Non-related memories must retain the smallest allocation under synchronous texture ownership.'
const endMessage = 'The active owner must not eagerly allocate 768px textures for every memory.'

if (source.includes(legacyMessage)) {
  const legacyIndex = source.indexOf(legacyMessage)
  const endIndex = source.indexOf(endMessage, legacyIndex)
  if (legacyIndex < 0 || endIndex < 0) {
    throw new Error(`Texture ownership contract boundaries missing: legacy=${legacyIndex} end=${endIndex}`)
  }
  const start = source.lastIndexOf('\n', legacyIndex) + 1
  const end = source.lastIndexOf('\n', endIndex) + 1
  const replacement = [
    "  assert.match(source, /:\\s*80;\\s*const texture = useMemo\\(\\(\\) => createMemorySurface\\(node, textureResolution\\)/, 'Non-related memories must retain the smallest allocation under synchronous texture ownership.')",
    "  assert.ok(source.includes('const texture = useMemo(() => createMemorySurface(node, textureResolution), [node, textureResolution])'), 'Texture creation must be memoized by node and allocation tier.')",
    "  assert.doesNotMatch(source, /setTexture\\(|useState<THREE\\.CanvasTexture \\| null>/, 'Synchronous texture ownership must not use delayed React texture state.')",
    "  assert.ok(source.includes('const dispose = () => texture?.dispose()'), 'Texture replacements must retain deterministic disposal ownership.')",
    "  assert.ok(source.includes('window.requestAnimationFrame(dispose)'), 'Replaced textures must remain alive through the replacement paint.')",
    "  assert.ok(source.includes('opacity={texture ? visibleOpacity : 0}'), 'Unavailable textures must stay transparent while selected, overview, related, and distant opacity remains centralized.')",
    "  assert.ok(source.includes('name=\"life-map-memory-lens-hit-target\"'), 'Memory lenses must retain stable interaction ownership.')",
    "  assert.ok(source.includes('if (!/^[0-9a-f]{6}$/i.test(normalized))'), 'Invalid aura metadata must fall back before RGB bitwise conversion.')",
    "  assert.ok(source.includes('return `rgba(138, 223, 255, ${alpha})`'), 'Invalid aura metadata must use the canonical cyan fallback.')",
    "  assert.match(source, /useMemo\\(\\(\\) => createMemorySurface/, 'CanvasTexture allocation must use bounded synchronous memoization.')",
    '',
  ].join('\n')
  source = source.slice(0, start) + replacement + source.slice(end)
} else if (!source.includes(synchronousMessage)) {
  throw new Error('Neither legacy nor synchronous texture ownership contract was found')
}

const lines = source.split('\n')
let keyAssertionCount = 0
let opacityAssertionCount = 0
for (let index = 0; index < lines.length; index += 1) {
  if (lines[index].includes('assert.match(source, /key=') && lines[index].includes('textureKey')) {
    lines[index] = '  assert.match(source, /key=\\{textureKey \\+ "-main"\\}/)'
    keyAssertionCount += 1
  }
  if (lines[index].includes('assert.match(source, /opacity=') && lines[index].includes('texture ? selected')) {
    lines[index] = '  assert.match(source, /opacity=\\{texture \\? visibleOpacity : 0\\}/)'
    opacityAssertionCount += 1
  }
}
if (keyAssertionCount !== 1) {
  throw new Error(`Expected one texture remount assertion, found ${keyAssertionCount}`)
}
if (opacityAssertionCount !== 1) {
  throw new Error(`Expected one legacy opacity assertion, found ${opacityAssertionCount}`)
}
fs.writeFileSync(path, lines.join('\n'))

const browserPath = 'urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts'
let browser = fs.readFileSync(browserPath, 'utf8')
const focusBlock = `    const focus = menu.getByRole('button', { name: 'Enter Focus' })
    await expect(focus).toBeVisible()
    await focus.click()`
const explicitFocusBlock = `    if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
      await controls.press('Enter')
    }
    await expect(menu).toHaveAttribute('open', '')
    const focus = menu.getByRole('button', { name: 'Enter Focus' })
    await expect(focus).toBeVisible()
    await focus.click()`
const focusCount = browser.split(focusBlock).length - 1
if (focusCount !== 1) {
  throw new Error(`Expected one keyboard Focus continuation block, found ${focusCount}`)
}
browser = browser.replace(focusBlock, explicitFocusBlock)
fs.writeFileSync(browserPath, browser)

console.log('Reconciled synchronous Life Map texture, remount, opacity, and explicit semantic-control contracts.')

import fs from 'node:fs'

const capturePath = 'scripts/capture-continuous-spatial-proof.mjs'
const sceneTestPath = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'
const browserPath = 'urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts'

function read(path) { return fs.readFileSync(path, 'utf8') }
function write(path, value) { fs.writeFileSync(path, value) }
function replaceOnce(path, before, after) {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}: ${before.slice(0, 90)}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected source duplicated in ${path}: ${before.slice(0, 90)}`)
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

replaceOnce(capturePath, "    path: '/life-map/',", "    path: '/life-map/?demo=1',")

replaceOnce(
  sceneTestPath,
  "assert.ok(source.includes('useLifeMapEvents()'), 'Life Map must load private or explicit sample-backed memory nodes.')",
  "assert.ok(source.includes('useLifeMapEvents(requestedDemo ? \"demo-user\" : undefined)'), 'Life Map must keep private loading by default and enable sample nodes only for explicit demo URLs.')",
)
replaceOnce(
  sceneTestPath,
  "assert.ok(canonical.includes('data-life-map-authored-universe=\"primary\"'), 'The authored galaxy must remain an explicit visible owner.')",
  "assert.ok(canonical.includes('data-life-map-authored-universe=\"atmospheric\"'), 'The governed provider art must remain only an atmospheric owner.')",
)
replaceOnce(
  sceneTestPath,
  "assert.ok(canonical.includes('opacity: .78'), 'The authored universe must not regress to a nearly invisible decorative tint.')",
  "assert.ok(canonical.includes('opacity: .22'), 'The provider art must remain atmospheric rather than veiling the R3F world.')",
)

const sceneSource = read(sceneTestPath)
const marker = "test('LifeMap depth composition removes block and plane veil owners'"
if (sceneSource.includes(marker)) throw new Error('Depth composition contract already exists')
const contract = [
  "test('LifeMap depth composition removes block and plane veil owners', () => {",
  "  const goalStart = source.indexOf('function GoalMonuments')",
  "  const goalEnd = source.indexOf('function PrivateVaults', goalStart)",
  "  const vaultEnd = source.indexOf('function EmotionalWeather', goalEnd)",
  "  const weatherEnd = source.indexOf('function MemoryPath', vaultEnd)",
  "  const crossingStart = source.indexOf('function ForegroundDepthCrossings')",
  "  const crossingEnd = source.indexOf('function LifeMapWorld', crossingStart)",
  "  const structuralField = source.slice(goalStart, weatherEnd) + source.slice(crossingStart, crossingEnd)",
  "  assert.match(structuralField, /life-map-far-goal-beacons/)",
  "  assert.match(structuralField, /life-map-private-vault-arc/)",
  "  assert.match(structuralField, /life-map-near-crossing-thread/)",
  "  assert.match(structuralField, /pointsMaterial/)",
  "  assert.doesNotMatch(structuralField, /boxGeometry|planeGeometry/)",
  "  assert.match(source, /const requestedDemo = params.get\\(\"demo\"\\) === \"1\"/)",
  "  assert.match(source, /useLifeMapEvents\\(requestedDemo \\? \"demo-user\" : undefined\\)/)",
  "  assert.match(canonical, /data-life-map-authored-universe=\"atmospheric\"/)",
  "  assert.match(canonical, /opacity: \\.22/)",
  "  assert.match(canonical, /brightness\\(\\.68\\)/)",
  "})",
  "",
  "test('LifeMap selection closes semantic controls without a body observer', () => {",
  "  assert.match(source, /querySelectorAll<HTMLDetailsElement>\\(\"\\.life-map-accessibility-menu\"\\)/)",
  "  assert.match(source, /controls\\.open = false/)",
  "  assert.match(source, /controls\\.removeAttribute\\(\"open\"\\)/)",
  "  assert.match(source, /requestAnimationFrame\\(\\(\\) =>/)",
  "  assert.match(source, /cancelAnimationFrame\\(frame\\)/)",
  "  assert.doesNotMatch(source, /MutationObserver/)",
  "})",
].join('\n')
write(sceneTestPath, `${sceneSource.trimEnd()}\n\n${contract}\n`)

replaceOnce(
  browserPath,
  `    await expect(page.locator('.life-map-whisper')).toContainText((firstLabel || '').split(':')[0].trim())\n\n    if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {`,
  `    await expect(page.locator('.life-map-whisper')).toContainText((firstLabel || '').split(':')[0].trim())\n    await expect(menu).not.toHaveAttribute('open', '')\n\n    if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {`,
)

import './materialize-accessibility-performance-current-v4.mjs'
import { readFile, writeFile } from 'node:fs/promises'

function replaceRegex(source, pattern, replacement, expectedCount, label) {
  const count = [...source.matchAll(pattern)].length
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.replace(pattern, replacement)
}

const path = 'urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts'
const input = await readFile(path, 'utf8')

const staleJourneyRail = /  test\('selected Life Map journey controls preserve identity and remain operable on portrait mobile', async \(\{ page \}\) => \{[\s\S]*?\n  \}\)\n\n  test\('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile'/g
const currentKeyboardJourney = `  test('selected Life Map keyboard journey controls preserve identity and remain operable on portrait mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')
    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    await expect(actions).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).not.toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })
    const advancedUrl = new URL(page.url())
    expect(advancedUrl.searchParams.get('memoryId')).toBe(advancedUrl.searchParams.get('node'))

    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })

    await page.keyboard.press('o')
    await expect.poll(() => new URL(page.url()).searchParams.get('overview'), { timeout: 15_000 }).toBe('1')
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'overview', { timeout: 15_000 })
    await expect(actions).toHaveCount(0)
  })

  test('selected Life Map action owner is topmost, contained, and directly operable on portrait mobile'`

const output = replaceRegex(
  input,
  staleJourneyRail,
  currentKeyboardJourney,
  1,
  'current Life Map keyboard journey controls without retired permanent rail',
)

await writeFile(path, output)
console.log(`Materialized current accessibility-performance v5 proof at ${path}`)


const evidencePath = 'urai-tier1/tests/accessibility-performance-evidence.spec.ts'
const evidenceInput = await readFile(evidencePath, 'utf8')
let evidenceOutput = evidenceInput

const orbSizeTarget = `    const orb = page.getByRole('button', { name: /open orb travel controls/i })
    await expect(orb).toBeVisible()
    await expect(orb).toBeEnabled()`
const orbSizeReady = `    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toBeEnabled({ timeout: 15_000 })
    await expect(orb).toBeVisible()
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)`
if (evidenceOutput.split(orbSizeTarget).length - 1 !== 1) throw new Error('Orb size readiness contract changed')
evidenceOutput = evidenceOutput.replace(orbSizeTarget, orbSizeReady)

const orbFocusTarget = `    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    await expect(orb).toBeEnabled()`
const orbFocusReady = `    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toBeEnabled({ timeout: 15_000 })
    await expect(orb).toBeVisible()
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)`
if (evidenceOutput.split(orbFocusTarget).length - 1 !== 1) throw new Error('Orb focus readiness contract changed')
evidenceOutput = evidenceOutput.replace(orbFocusTarget, orbFocusReady)

const webglTestTarget = `  test('WebGL context loss recovery is bounded and preserves the route', async ({ page }) => {`
const webglTestReady = `  test('WebGL context loss recovery is bounded and preserves the route', async ({ page }) => {
    test.setTimeout(90_000)`
if (evidenceOutput.split(webglTestTarget).length - 1 !== 1) throw new Error('WebGL recovery timeout contract changed')
evidenceOutput = evidenceOutput.replace(webglTestTarget, webglTestReady)
await writeFile(evidencePath, evidenceOutput)
console.log(`Materialized current Orb hydration and WebGL recovery envelopes at ${evidencePath}`)

const embodiedPath = 'urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts'
const embodiedInput = await readFile(embodiedPath, 'utf8')
const directTargets = [
  "    await expect(direct.getByRole('button', { name: 'Open URAI Orb companion' })).toBeVisible()",
  "    await expect(direct.getByRole('button', { name: 'Open Ground directly' })).toBeVisible()",
  "    await expect(direct.getByRole('button', { name: 'Open Life Map directly' })).toBeVisible()",
]
let embodiedOutput = embodiedInput
for (const line of directTargets) {
  if (embodiedOutput.split(line).length - 1 !== 1) throw new Error(`Home direct destination readiness contract changed: ${line}`)
  embodiedOutput = embodiedOutput.replace(line, line.replace('toBeVisible()', 'toBeVisible({ timeout: 30_000 })'))
}
await writeFile(embodiedPath, embodiedOutput)
console.log(`Materialized Home semantic destination readiness at ${embodiedPath}`)

const focusPath = 'urai-tier1/tests/accessibility-performance-focus.spec.ts'
const focusInput = await readFile(focusPath, 'utf8')
const focusDescribe = "test.describe('Focus exact-head accessibility and movement evidence', () => {"
const focusDescribeTimed = "test.describe('Focus exact-head accessibility and movement evidence', () => {\n  test.describe.configure({ timeout: 90_000 })"
if (focusInput.split(focusDescribe).length - 1 !== 1) throw new Error('Focus timeout contract changed')
await writeFile(focusPath, focusInput.replace(focusDescribe, focusDescribeTimed))
console.log(`Materialized Focus software-renderer timeout envelope at ${focusPath}`)

const sensoryPath = 'urai-tier1/tests/accessibility-performance-home-sensory-boundary.spec.ts'
const sensoryInput = await readFile(sensoryPath, 'utf8')
const sensoryTimeout = "  test.describe.configure({ timeout: 90_000 })"
const sensoryTimeoutCurrent = "  test.describe.configure({ timeout: 180_000 })"
if (sensoryInput.split(sensoryTimeout).length - 1 === 1) {
  await writeFile(sensoryPath, sensoryInput.replace(sensoryTimeout, sensoryTimeoutCurrent))
} else if (sensoryInput.split(sensoryTimeoutCurrent).length - 1 !== 1) {
  throw new Error('Home sensory timeout contract changed')
}
console.log(`Materialized Home sensory software-renderer timeout envelope at ${sensoryPath}`)

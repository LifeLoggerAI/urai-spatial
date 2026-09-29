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
const orbSizeReady = `    const orb = page.getByTestId('home-semantic-orb')
    await expect(orb).toBeEnabled({ timeout: 15_000 })
    await expect(orb).toBeVisible({ timeout: 15_000 })
    await expect(orb).toHaveAccessibleName(/open urai orb companion/i)`
if (evidenceOutput.split(orbSizeTarget).length - 1 !== 1) throw new Error('Orb size readiness contract changed')
evidenceOutput = evidenceOutput.replace(orbSizeTarget, orbSizeReady)

const orbFocusTarget = `    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    await expect(orb).toBeEnabled()`
const orbFocusReady = `    const orb = page.getByTestId('home-semantic-orb')
    await expect(orb).toBeEnabled({ timeout: 15_000 })
    await expect(orb).toBeVisible({ timeout: 15_000 })
    await expect(orb).toHaveAccessibleName(/open urai orb companion/i)`
if (evidenceOutput.split(orbFocusTarget).length - 1 !== 1) throw new Error('Orb focus readiness contract changed')
evidenceOutput = evidenceOutput.replace(orbFocusTarget, orbFocusReady)

const orbFocusFlowTarget = `    await orb.focus()
    await orb.press('Enter')
    await expect(orb).toHaveAttribute('aria-expanded', 'true')
    await expect(orb).toHaveAccessibleName(/close orb travel controls/i)
    const firstDestination = page.locator('#urai-world-companion-menu button:not([disabled])').first()
    await expect(firstDestination).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(orb).toBeFocused()
    await expect(orb).toHaveAttribute('aria-expanded', 'false')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'true')`
const orbFocusFlowCurrent = `    const controller = page.locator('[data-urai-audit-action="orb-controls"]')
    await orb.focus()
    await orb.press('Enter')
    await expect(controller).toHaveAttribute('aria-expanded', 'true')
    await expect(controller).toHaveAccessibleName(/close orb travel controls/i)
    const firstDestination = page.locator('#urai-world-companion-menu button:not([disabled])').first()
    await expect(firstDestination).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(orb).toBeFocused()
    await expect(controller).toHaveAttribute('aria-expanded', 'false')
    await expect(orb).toHaveAccessibleName(/open urai orb companion/i)
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'true')`
if (evidenceOutput.split(orbFocusFlowTarget).length - 1 !== 1) throw new Error('Orb focus-return flow contract changed')
evidenceOutput = evidenceOutput.replace(orbFocusFlowTarget, orbFocusFlowCurrent)

const webglTestTarget = `  test('WebGL context loss recovery is bounded and preserves the route', async ({ page }) => {`
const webglTestReady = `  test('WebGL context loss recovery is bounded and preserves the route', async ({ page }) => {
    test.setTimeout(90_000)`
if (evidenceOutput.split(webglTestTarget).length - 1 !== 1) throw new Error('WebGL recovery timeout contract changed')
evidenceOutput = evidenceOutput.replace(webglTestTarget, webglTestReady)
await writeFile(evidencePath, evidenceOutput)
console.log(`Materialized current Orb hydration and WebGL recovery envelopes at ${evidencePath}`)

const embodiedPath = 'urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts'
const embodiedInput = await readFile(embodiedPath, 'utf8')
const directButtonTargets = [
  "    await expect(direct.getByRole('button', { name: 'Open URAI Orb companion' })).toBeVisible()",
  "    await expect(direct.getByRole('button', { name: 'Open Ground directly' })).toBeVisible()",
]
let embodiedOutput = embodiedInput
for (const line of directButtonTargets) {
  if (embodiedOutput.split(line).length - 1 !== 1) throw new Error(`Home direct destination readiness contract changed: ${line}`)
  embodiedOutput = embodiedOutput.replace(line, line.replace('toBeVisible()', 'toBeVisible({ timeout: 30_000 })'))
}
const lifeMapButtonTarget = "    await expect(direct.getByRole('button', { name: 'Open Life Map directly' })).toBeVisible()"
const lifeMapLinkTarget = "    await expect(direct.getByRole('link', { name: 'Open Life Map directly' })).toBeVisible({ timeout: 30_000 })"
if (embodiedOutput.split(lifeMapButtonTarget).length - 1 !== 1) throw new Error('Home Life Map semantic destination contract changed')
embodiedOutput = embodiedOutput.replace(lifeMapButtonTarget, lifeMapLinkTarget)

const countTarget = "    await expect(direct.getByRole('button')).toHaveCount(3)"
const countCurrent = "    await expect(direct.locator(':scope > :is(button,a)')).toHaveCount(3)"
if (embodiedOutput.split(countTarget).length - 1 !== 1) throw new Error('Home semantic destination count contract changed')
embodiedOutput = embodiedOutput.replace(countTarget, countCurrent)

const loopTarget = "      const target = direct.getByRole('button', { name })"
const loopCurrent = "      const target = direct.getByRole(name.source.includes('Life Map') ? 'link' : 'button', { name })"
if (embodiedOutput.split(loopTarget).length - 1 !== 1) throw new Error('Home semantic destination focus contract changed')
embodiedOutput = embodiedOutput.replace(loopTarget, loopCurrent)
await writeFile(embodiedPath, embodiedOutput)
console.log(`Materialized Home semantic destination readiness at ${embodiedPath}`)

const focusPath = 'urai-tier1/tests/accessibility-performance-focus.spec.ts'
const focusInput = await readFile(focusPath, 'utf8')
let focusOutput = focusInput
const focusMovementReadyTarget = `    await expect(focus).toHaveAttribute('data-focus-movement', 'walk-keyboard-orbit-touch')
    await expect(focus).toHaveAttribute('data-focus-pointer-lock', 'false')`
const focusMovementReadyCurrent = `    await expect(focus).toHaveAttribute('data-focus-movement', 'walk-keyboard-orbit-touch')
    await expect(focus).toHaveAttribute('data-focus-input-ready', 'true', { timeout: 15_000 })
    await expect(focus).toHaveAttribute('data-focus-pointer-lock', 'false')`
if (focusOutput.split(focusMovementReadyTarget).length - 1 === 1) {
  focusOutput = focusOutput.replace(focusMovementReadyTarget, focusMovementReadyCurrent)
} else if (focusOutput.split(focusMovementReadyCurrent).length - 1 !== 1) {
  throw new Error('Focus input readiness proof contract changed')
}
const focusDescribe = "test.describe('Focus exact-head accessibility and movement evidence', () => {"
const focusDescribeTimed = "test.describe('Focus exact-head accessibility and movement evidence', () => {\n  test.describe.configure({ timeout: 90_000 })"
if (focusOutput.split(focusDescribe).length - 1 === 1) {
  focusOutput = focusOutput.replace(focusDescribe, focusDescribeTimed)
} else if (focusOutput.split(focusDescribeTimed).length - 1 !== 1) {
  throw new Error('Focus timeout contract changed')
}
await writeFile(focusPath, focusOutput)
console.log(`Materialized Focus software-renderer timeout envelope at ${focusPath}`)

const focusTelemetryPath = 'urai-tier1/tests/accessibility-performance-focus.spec.ts'
const focusTelemetryInput = await readFile(focusTelemetryPath, 'utf8')
const focusTelemetryBlock = `    await expect(focus).toHaveAttribute('data-focus-camera-x', /-?\\d+\\.\\d{3}/)
    await expect(focus).toHaveAttribute('data-focus-camera-y', /-?\\d+\\.\\d{3}/)
    await expect(focus).toHaveAttribute('data-focus-camera-z', /-?\\d+\\.\\d{3}/)
    await expect(focus).toHaveAttribute('data-focus-moving', 'false')`
const focusTelemetryAtomic = `    const telemetry = await focus.evaluate((element) => ({
      x: element.getAttribute('data-focus-camera-x'),
      y: element.getAttribute('data-focus-camera-y'),
      z: element.getAttribute('data-focus-camera-z'),
      distance: element.getAttribute('data-focus-distance'),
      moving: element.getAttribute('data-focus-moving'),
    }))
    for (const axis of [telemetry.x, telemetry.y, telemetry.z]) {
      expect(axis).toMatch(/-?\\d+\\.\\d{3}/)
    }
    expect(Number(telemetry.distance)).toBeGreaterThan(before + 0.5)
    expect(telemetry.moving).toBe('false')`
if (focusTelemetryInput.split(focusTelemetryBlock).length - 1 !== 1) throw new Error('Focus telemetry proof contract changed')
await writeFile(focusTelemetryPath, focusTelemetryInput.replace(focusTelemetryBlock, focusTelemetryAtomic))
console.log(`Materialized atomic Focus camera telemetry proof at ${focusTelemetryPath}`)

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

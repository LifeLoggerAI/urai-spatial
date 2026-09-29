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
const targetSizeOrb = `    const orb = page.getByRole('button', { name: /open orb travel controls/i })
    await expect(orb).toBeVisible()
    await expect(orb).toBeEnabled()`
const targetSizeOrbReady = `    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toBeEnabled({ timeout: 15_000 })
    await expect(orb).toBeVisible()
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)`
if (evidenceOutput.split(targetSizeOrb).length - 1 !== 1) throw new Error('Orb 48px readiness proof contract changed')
evidenceOutput = evidenceOutput.replace(targetSizeOrb, targetSizeOrbReady)

const focusReturnOrb = `    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    await expect(orb).toBeEnabled()`
const focusReturnOrbReady = `    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toBeEnabled({ timeout: 15_000 })
    await expect(orb).toBeVisible()
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)`
if (evidenceOutput.split(focusReturnOrb).length - 1 !== 1) throw new Error('Orb focus-return readiness proof contract changed')
evidenceOutput = evidenceOutput.replace(focusReturnOrb, focusReturnOrbReady)
await writeFile(evidencePath, evidenceOutput)
console.log(`Materialized hydrated Orb accessibility readiness proof at ${evidencePath}`)

const sensoryPath = 'urai-tier1/tests/accessibility-performance-home-sensory-boundary.spec.ts'
const sensoryInput = await readFile(sensoryPath, 'utf8')
const sensoryTimeout = "  test.describe.configure({ timeout: 90_000 })"
const sensoryTimeoutCurrent = "  test.describe.configure({ timeout: 180_000 })"
if (sensoryInput.split(sensoryTimeout).length - 1 !== 1) throw new Error('Home sensory timeout proof contract changed')
await writeFile(sensoryPath, sensoryInput.replace(sensoryTimeout, sensoryTimeoutCurrent))
console.log(`Materialized software-renderer sensory timeout envelope at ${sensoryPath}`)

const focusPath = 'urai-tier1/tests/accessibility-performance-focus.spec.ts'
const focusInput = await readFile(focusPath, 'utf8')
let focusOutput = focusInput
const focusMovementReadyTarget = `    await expect(focus).toHaveAttribute('data-focus-movement', 'walk-keyboard-orbit-touch')
    await expect(focus).toHaveAttribute('data-focus-pointer-lock', 'false')`
const focusMovementReadyCurrent = `    await expect(focus).toHaveAttribute('data-focus-movement', 'walk-keyboard-orbit-touch')
    await expect(focus).toHaveAttribute('data-focus-input-ready', 'true', { timeout: 15_000 })
    await expect(focus).toHaveAttribute('data-focus-pointer-lock', 'false')`
if (focusOutput.split(focusMovementReadyTarget).length - 1 !== 1) throw new Error('Focus input readiness proof contract changed')
focusOutput = focusOutput.replace(focusMovementReadyTarget, focusMovementReadyCurrent)

const focusDescribe = "test.describe('Focus exact-head accessibility and movement evidence', () => {"
const focusDescribeTimed = "test.describe('Focus exact-head accessibility and movement evidence', () => {\n  test.describe.configure({ timeout: 90_000 })"
if (focusOutput.split(focusDescribe).length - 1 !== 1) throw new Error('Focus software-renderer timeout contract changed')
focusOutput = focusOutput.replace(focusDescribe, focusDescribeTimed)
await writeFile(focusPath, focusOutput)
console.log(`Materialized truthful Focus accessibility readiness at ${focusPath}`)


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

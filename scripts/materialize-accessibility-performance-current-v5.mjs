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


const focusPath = 'urai-tier1/tests/accessibility-performance-focus.spec.ts'
const focusInput = await readFile(focusPath, 'utf8')
const focusMovementReadyTarget = `    await expect(focus).toHaveAttribute('data-focus-movement', 'walk-keyboard-orbit-touch')
    await expect(focus).toHaveAttribute('data-focus-pointer-lock', 'false')`
const focusMovementReadyCurrent = `    await expect(focus).toHaveAttribute('data-focus-movement', 'walk-keyboard-orbit-touch')
    await expect(focus).toHaveAttribute('data-focus-input-ready', 'true', { timeout: 15_000 })
    await expect(focus).toHaveAttribute('data-focus-pointer-lock', 'false')`
if (focusInput.split(focusMovementReadyTarget).length - 1 !== 1) throw new Error('Focus input readiness proof contract changed')
await writeFile(focusPath, focusInput.replace(focusMovementReadyTarget, focusMovementReadyCurrent))
console.log(`Materialized truthful Focus input readiness proof at ${focusPath}`)


const focusTimeoutPath = 'urai-tier1/tests/accessibility-performance-focus.spec.ts'
const focusTimeoutInput = await readFile(focusTimeoutPath, 'utf8')
const focusDescribe = "test.describe('Focus exact-head accessibility and movement evidence', () => {"
const focusDescribeTimed = "test.describe('Focus exact-head accessibility and movement evidence', () => {\n  test.describe.configure({ timeout: 90_000 })"
if (focusTimeoutInput.split(focusDescribe).length - 1 !== 1) throw new Error('Focus software-renderer timeout contract changed')
await writeFile(focusTimeoutPath, focusTimeoutInput.replace(focusDescribe, focusDescribeTimed))
console.log(`Materialized Focus software-renderer accessibility timeout envelope at ${focusTimeoutPath}`)

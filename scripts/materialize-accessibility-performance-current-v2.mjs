import { isAuditedCurrentHomeProof } from './materialize-accessibility-performance-home-authority.mjs'
import { preserveAuditedLifeMapProof } from './materialize-accessibility-performance-lifemap-authority.mjs'
import './materialize-accessibility-performance-current.mjs'
import { readFile, writeFile } from 'node:fs/promises'

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.split(from).join(to)
}

async function transformFile(path, transform) {
  const source = await readFile(path, 'utf8')
  const next = transform(source)
  if (next === source) throw new Error(`${path} v2 materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance v2 proof at ${path}`)
}

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "    await expect(home).toHaveAttribute('data-home-movement', 'walk-keyboard-click-touch')",
    "    await expect(home).toHaveAttribute('data-home-interaction-ready', 'true')",
    1,
    'current Home interaction readiness contract',
  )
  source = replaceExact(
    source,
    "    await expect(home).toHaveAttribute('data-home-pointer-lock', 'false')",
    "    await expect(home).toHaveAttribute('data-home-camera-mode', 'embodied-first-person')",
    1,
    'current Home embodied camera contract',
  )
  source = replaceExact(
    source,
    "    await expect(home).toHaveAttribute('data-home-visible-world', 'authored-coherent-three-dimensional-sanctuary')",
    "    await expect(home).toHaveAttribute('data-home-animation-owner', 'canonical-sanctuary-plus-cc0-fern-plus-living-orb')",
    1,
    'current Home authored visual owner contract',
  )
  const stableMovementProof = `    const afterZ = Number(await home.getAttribute('data-home-player-z'))
    expect(Math.abs(afterZ - beforeZ)).toBeGreaterThan(1.2)
    await expect(home).toHaveAttribute('data-home-telemetry-owner', 'embodied-motion-kernel')`
  if (source.split(stableMovementProof).length - 1 !== 1) {
    throw new Error('current Home canonical displacement proof contract changed')
  }
  if (source.includes("getPropertyValue('--home-parallax-y')")) {
    throw new Error('non-authoritative Home parallax style telemetry must not gate accessibility movement evidence')
  }
  const staleZPoll = `    await expect.poll(async () => Math.abs(Number(await home.getAttribute('data-home-player-z')) - beforeZ), { timeout: 30_000 }).toBeGreaterThan(1.2)`
  if (source.includes(staleZPoll)) {
    throw new Error('stale redundant Home Z-position polling must not be reintroduced')
  }
  return source
})

// This proof now lives in its audited current form; historical rewrites must
// never replace its stronger privacy, identity, title, and mobile assertions.
await preserveAuditedLifeMapProof()

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "          label: button.textContent?.trim() || '',",
    "          label: button.querySelector('strong')?.textContent?.trim() || button.textContent?.trim() || '',",
    1,
    'current journey action visual label owner',
  )
  source = replaceExact(
    source,
    "actions.getByRole('button', { name: 'Overview', exact: true })",
    "actions.getByRole('button', { name: /overview$/i })",
    1,
    'current journey Overview accessible name',
  )
  source = replaceExact(
    source,
    `    await page.keyboard.press('ArrowRight')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).not.toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })
    const advanced = new URL(page.url())
    expect(advanced.searchParams.get('memoryId')).toBe(advanced.searchParams.get('node'))

    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })`,
    `    const journey = page.getByTestId('life-map-journey-rail')
    const next = journey.getByRole('button', { name: 'Next visible life object' })
    const previous = journey.getByRole('button', { name: 'Previous visible life object' })
    await next.click()
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).not.toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })
    const advanced = new URL(page.url())
    expect(advanced.searchParams.get('memoryId')).toBe(advanced.searchParams.get('node'))

    await previous.click()
    await expect.poll(() => {
      const url = new URL(page.url())
      return { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node') }
    }, { timeout: 15_000 }).toEqual({ memoryId: 'quiet-reset', node: 'quiet-reset' })`,
    1,
    'current Life Map journey control pointer ownership',
  )
  return source
})

const canonicalHomeTravelPath = 'urai-tier1/tests/accessibility-performance-canonical-home-travel.spec.ts'
const canonicalHomeTravel = await readFile(canonicalHomeTravelPath, 'utf8')
const stableIdSelector = 'navigation.getByTestId(`home-semantic-${destination.id}`)'
const accessibleNameAssertion = 'await expect(target).toHaveAccessibleName(destination.label)'
const stableIdSelectorCount = canonicalHomeTravel.split(stableIdSelector).length - 1
const accessibleNameAssertionCount = canonicalHomeTravel.split(accessibleNameAssertion).length - 1
if (!isAuditedCurrentHomeProof(canonicalHomeTravel) && (stableIdSelectorCount !== 1 || accessibleNameAssertionCount !== 1)) {
  throw new Error(`canonical Home destination identity authority expected one stable-id selector and one accessible-name assertion; found id=${stableIdSelectorCount}, name=${accessibleNameAssertionCount}`)
}
console.log(isAuditedCurrentHomeProof(canonicalHomeTravel)
  ? 'Preserved audited current Home semantic-link destination identity'
  : 'Canonical Home destination identity is bound to stable id and accessible label')
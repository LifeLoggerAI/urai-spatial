import './materialize-accessibility-performance-current-v5.mjs'
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
  if (next === source) throw new Error(`${path} v6 materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance v6 proof at ${path}`)
}

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => replaceExact(
  input,
  "    await expect(home).toHaveAttribute('data-home-animation-owner', 'canonical-sanctuary-plus-cc0-fern-plus-living-orb')",
  "    await expect(home).toHaveAttribute('data-home-animation-owner', 'v76-curved-load-bearing-relic-machine')",
  1,
  'current V76 Home animation owner',
))

await transformFile('urai-tier1/tests/accessibility-performance-evidence.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "    const orb = page.getByRole('button', { name: /open orb travel controls/i })",
    "    const orb = page.getByRole('button', { name: 'Open URAI Orb companion', exact: true })",
    1,
    'current visible Home Orb activator for target sizing',
  )
  source = replaceExact(
    source,
    `    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    await expect(orb).toBeEnabled()
    await orb.focus()
    await orb.press('Enter')
    await expect(orb).toHaveAttribute('aria-expanded', 'true')
    await expect(orb).toHaveAccessibleName(/close orb travel controls/i)
    const firstDestination = page.locator('#urai-world-companion-menu button:not([disabled])').first()
    await expect(firstDestination).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(orb).toBeFocused()
    await expect(orb).toHaveAttribute('aria-expanded', 'false')
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'true')`,
    `    const orb = page.getByRole('button', { name: 'Open URAI Orb companion', exact: true })
    await expect(orb).toBeVisible()
    await expect(orb).toBeEnabled()
    await orb.focus()
    await orb.press('Enter')
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'false')
    const firstDestination = page.locator('#urai-world-companion-menu button:not([disabled])').first()
    await expect(firstDestination).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(orb).toBeFocused()
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'true')`,
    1,
    'current Home semantic Orb activation and focus-return lifecycle',
  )
  return source
})

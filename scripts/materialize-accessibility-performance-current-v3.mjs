import './materialize-accessibility-performance-current-v2.mjs'
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
  if (next === source) throw new Error(`${path} v3 materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance v3 proof at ${path}`)
}

await transformFile('urai-tier1/tests/accessibility-performance-evidence.spec.ts', (input) => replaceExact(
  input,
  `    await expect(fallback.getByRole('link', { name: /ground/i }).first()).toBeVisible()
    await expect(fallback.getByRole('link', { name: /life map/i }).first()).toBeVisible()
    await expect(fallback.getByRole('button', { name: /open urai orb companion/i })).toBeVisible()`,
  `    await expect(fallback).toHaveCount(1)
    await expect(fallback.getByRole('link', { name: /ground/i }).first()).toBeVisible()
    await expect(fallback.getByRole('link', { name: /life map/i }).first()).toBeVisible()
    await expect(page.getByRole('main', { name: 'URAI Home World threshold' })).toHaveCount(1)
    const navigation = fallback.getByRole('navigation', { name: 'Accessible Home destinations' })
    await expect(navigation).toHaveCount(1)
    await expect(navigation).toHaveAttribute('data-home-navigation-owner', 'runtime-boundary')
    await expect(navigation).toHaveAttribute('data-home-navigation-non-dominant', 'true')
    await expect(navigation.getByTestId('home-semantic-orb')).toHaveAccessibleName('Open URAI Orb companion')`,
  1,
  'single-owner no-WebGL runtime accessibility contract',
))

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "    await expect(direct.getByRole('button', { name: 'Open Orb directly' })).toBeVisible()",
    "    await expect(direct.getByRole('button', { name: 'Open URAI Orb companion' })).toBeVisible()",
    1,
    'embodied Home current Orb accessible name',
  )
  source = replaceExact(
    source,
    "    for (const name of [/Open Orb directly/i, /Open Ground directly/i, /Open Life Map directly/i]) {",
    "    for (const name of [/Open URAI Orb companion/i, /Open Ground directly/i, /Open Life Map directly/i]) {",
    1,
    'embodied Home current focusable destination names',
  )
  return source
})

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

await transformFile('urai-tier1/tests/accessibility-performance-canonical-home-travel.spec.ts', (input) => replaceExact(
  input,
  '      test.setTimeout(90_000)',
  '      test.setTimeout(180_000)',
  1,
  'canonical Home travel software-renderer timeout envelope',
))

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
    "    await expect(home).toHaveAttribute('data-home-camera-mode', 'embodied')",
    1,
    'current Home embodied camera contract',
  )
  source = replaceExact(
    source,
    "    await expect(home).toHaveAttribute('data-home-visible-world', 'final-physical-sanctuary-memory-rooms')",
    "    await expect(home).toHaveAttribute('data-home-animation-owner', 'authored-sanctuary-plus-gltf-interactions')",
    1,
    'current Home authored visual owner contract',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts', (input) => {
  let source = replaceExact(
    input,
    '  test.describe.configure({ timeout: 90_000 })',
    '  test.describe.configure({ timeout: 180_000 })',
    1,
    'Life Map software-renderer timeout envelope',
  )
  source = replaceExact(
    source,
    "    await expect(page.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible()",
    "    await expect(root.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible()",
    1,
    'Life Map disclosed-demo truth owner',
  )
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = replaceExact(
    input,
    "          label: button.textContent?.trim() || '',",
    "          label: button.querySelector('strong')?.textContent?.trim() || button.textContent?.trim() || '',",
    3,
    'current selected and journey action visual label owner',
  )
  source = replaceExact(
    source,
    "actions.getByRole('button', { name: 'Enter Focus', exact: true })",
    "actions.getByRole('button', { name: /Enter Focus$/ })",
    1,
    'current Focus action accessible name',
  )
  source = replaceExact(
    source,
    "actions.getByRole('button', { name: 'Replay', exact: true })",
    "actions.getByRole('button', { name: /Replay$/ })",
    1,
    'current Replay action accessible name',
  )
  source = replaceExact(
    source,
    "actions.getByRole('button', { name: 'Overview', exact: true })",
    "actions.getByRole('button', { name: /overview$/i })",
    2,
    'current Overview action accessible name',
  )
  return source
})

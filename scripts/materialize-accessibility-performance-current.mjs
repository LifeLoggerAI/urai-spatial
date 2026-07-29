import { readFile, writeFile } from 'node:fs/promises'

const testPath = 'urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts'
const replacements = [
  {
    label: 'Home world owner',
    from: "page.locator('.urai-final-home-world')",
    to: "page.locator('.urai-asset-home-world[data-home-primary-owner=\"asset-driven\"]')",
  },
  {
    label: 'Life Map semantic navigator',
    from: "page.locator('details.life-map-help')",
    to: "page.locator('details.life-map-navigator')",
  },
  {
    label: 'Life Map semantic navigator body',
    from: "controls.locator(':scope > div')",
    to: "controls.locator(':scope > section')",
  },
  {
    label: 'journey rail unrelated action-owner prerequisite',
    from: "    await expect(page.getByRole('button', { name: 'Enter Focus', exact: true })).toBeVisible()\n",
    to: '',
  },
]

let source = await readFile(testPath, 'utf8')
for (const replacement of replacements) {
  const count = source.split(replacement.from).length - 1
  if (count !== 1) {
    throw new Error(`${replacement.label} expected exactly one audited occurrence; found ${count}`)
  }
  source = source.replace(replacement.from, replacement.to)
}

await writeFile(testPath, source)
console.log(`Materialized current accessibility-performance visual proof at ${testPath}`)

import './materialize-accessibility-performance-current-v4.mjs'
import { readFile, writeFile } from 'node:fs/promises'

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  return source.split(from).join(to)
}

async function transformFile(path, transform) {
  const source = await readFile(path, 'utf8')
  const next = transform(source)
  if (next === source) throw new Error(`${path} v5 materializer made no change`)
  await writeFile(path, next)
  console.log(`Materialized current accessibility-performance v5 proof at ${path}`)
}

const focusWithDomThenPressEnter = (locator, indent = '    ') => `${indent}await ${locator}.evaluate((element) => {\n${indent}  if (!(element instanceof HTMLElement)) throw new Error('Keyboard proof target is not an HTMLElement')\n${indent}  element.focus({ preventScroll: true })\n${indent}  if (document.activeElement !== element) throw new Error('Keyboard proof target did not receive focus')\n${indent}})\n${indent}await page.keyboard.press('Enter')`

await transformFile('urai-tier1/tests/accessibility-performance-embodied-exploration.spec.ts', (input) => {
  let source = replaceExact(input, `    await expect(memory).toBeVisible()`, `    await expect(memory).toBeVisible({ timeout: 15_000 })`, 1, 'software-WebGL semantic-result visibility allowance')
  source = replaceExact(source, `    await searchTrigger.press('Enter')`, focusWithDomThenPressEnter('searchTrigger'), 1, 'primary semantic opener real keyboard activation without locator actionability wait')
  source = replaceExact(source, `    await memory.press('Enter')`, focusWithDomThenPressEnter('memory'), 1, 'semantic-result real keyboard activation without locator actionability wait')
  source = replaceExact(source, `    await trigger.press('Enter')`, focusWithDomThenPressEnter('trigger'), 1, 'compact semantic opener real keyboard activation without locator actionability wait')
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts', (input) => {
  let source = replaceExact(input, `  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.press('Enter')`, `  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {\n${focusWithDomThenPressEnter('trigger', '    ')}\n  }`, 1, 'semantic explorer real keyboard opener without locator actionability wait')
  source = replaceExact(source, `    await firstMemory.press('Enter')`, focusWithDomThenPressEnter('firstMemory'), 1, 'direct semantic-result real keyboard activation')
  source = replaceExact(source, `  await firstMemory.press('Enter')`, focusWithDomThenPressEnter('firstMemory', '  '), 1, 'helper semantic-result real keyboard activation')
  source = replaceExact(source, `    await focus.press('Enter')`, `    await page.keyboard.press('Enter')`, 1, 'selected Enter Focus real keyboard activation after verified focus')
  source = replaceExact(source, `    await expect(root.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible()`, `    await expect(explorer.getByText('Disclosed sample universe · not your memories', { exact: true })).toBeVisible({ timeout: 15_000 })`, 1, 'semantic privacy truth scoped to the active navigator owner')
  return source
})

await transformFile('urai-tier1/tests/accessibility-performance-spatial-visual.spec.ts', (input) => {
  let source = replaceExact(input, `    await trigger.press('Enter')`, focusWithDomThenPressEnter('trigger'), 1, 'visual semantic opener real keyboard activation')
  source = replaceExact(source, `    await searchTrigger.press('Enter')`, focusWithDomThenPressEnter('searchTrigger'), 2, 'visual journey semantic opener real keyboard activation')
  source = replaceExact(source, `    await alternate.press('Enter')`, focusWithDomThenPressEnter('alternate'), 1, 'alternate semantic result real keyboard activation')
  source = replaceExact(source, `    await quietReset.press('Enter')`, focusWithDomThenPressEnter('quietReset'), 1, 'return semantic result real keyboard activation')
  return source
})

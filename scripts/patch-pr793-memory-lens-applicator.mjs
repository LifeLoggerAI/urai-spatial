import fs from 'node:fs'

const path = '/tmp/apply-pr793-memory-lens-redesign.mjs'
let source = fs.readFileSync(path, 'utf8')

const clickPattern = /^(\s*)if \(menu\) menu\.open = true\n\1window\.setTimeout\(keepSelectedControlsOpen, 0\)/m
let clickCount = 0
source = source.replace(clickPattern, (match, indent) => {
  clickCount += 1
  return `${indent}if (menu) menu.open = true\n${indent}queueMicrotask(keepSelectedControlsOpen)\n${indent}window.setTimeout(keepSelectedControlsOpen, 0)`
})
if (clickCount !== 1) throw new Error(`Expected one click-selection target, found ${clickCount}`)

const oldCall = "replaceOnce(boundary, '      queueMicrotask(keepSelectedControlsOpen)\\n', '')"
const newCall = `replaceOnce(
  boundary,
  \`      queueMicrotask(keepSelectedControlsOpen)\\n      return true\\n\`,
  \`      return true\\n\`,
)`
const cycleCount = source.split(oldCall).length - 1
if (cycleCount !== 1) throw new Error(`Expected one cycle-selection target, found ${cycleCount}`)

fs.writeFileSync(path, source.replace(oldCall, newCall))
console.log('Patched the isolated memory-lens applicator deterministically.')

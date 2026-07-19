import fs from 'node:fs'

const path = 'scripts/one-shot-lifemap-fullscreen-selected-actions.mjs'
let source = fs.readFileSync(path, 'utf8')

const markers = [
  "  `test('canonical Life Map has one selected-memory owner in the route DOM overlay'",
  "  `test('selected mode raises the spatial realm and keeps one route-owned action surface inside desktop and mobile viewports'",
  "  `test('Life Map renders synchronous luminous lenses with dominant selected mode'",
]

for (const marker of markers) {
  const count = source.split(marker).length - 1
  if (count !== 1) throw new Error(`Expected one raw-source marker, found ${count}: ${marker}`)
  source = source.replace(marker, marker.replace('  `', '  String.raw`'))
}

fs.writeFileSync(path, source)
console.log('Converted generated test replacements to String.raw templates')

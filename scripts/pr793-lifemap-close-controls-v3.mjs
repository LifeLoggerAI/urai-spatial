import fs from 'node:fs'

const scenePath = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
const testPath = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'
const read = (path) => fs.readFileSync(path, 'utf8')
const write = (path, value) => fs.writeFileSync(path, value)

function replaceOnce(path, before, after) {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected source duplicated in ${path}`)
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

replaceOnce(
  scenePath,
  `  const selectNode = useCallback((node: LifeMapNode) => {\n    setSelectedId(node.id);`,
  `  const selectNode = useCallback((node: LifeMapNode) => {\n    document.querySelectorAll<HTMLDetailsElement>(".life-map-accessibility-menu").forEach((controls) => {\n      controls.open = false;\n      controls.removeAttribute("open");\n    });\n    setSelectedId(node.id);`,
)

const source = read(testPath)
const marker = "test('LifeMap selection closes semantic controls without a body observer'"
if (source.includes(marker)) throw new Error('Control-close contract already exists')
const contract = [
  "test('LifeMap selection closes semantic controls without a body observer', () => {",
  '  assert.match(source, /querySelectorAll<HTMLDetailsElement>\\(\"\\.life-map-accessibility-menu\"\\)/)',
  '  assert.match(source, /controls\\.open = false/)',
  '  assert.match(source, /controls\\.removeAttribute\\(\"open\"\\)/)',
  '  assert.doesNotMatch(source, /MutationObserver/)',
  '})',
].join('\n')
write(testPath, `${source.trimEnd()}\n\n${contract}\n`)

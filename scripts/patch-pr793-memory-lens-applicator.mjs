import fs from 'node:fs'

const path = '/tmp/apply-pr793-memory-lens-redesign.mjs'
let source = fs.readFileSync(path, 'utf8')

function replaceExactlyOnce(before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`Expected one ${label} target, found ${count}`)
  source = source.replace(before, after)
}

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
replaceExactlyOnce(oldCall, newCall, 'cycle-selection')

const oldTextureBlock = [
  '  const texture = useMemo(() => createMemorySurface(node, textureResolution), [node, textureResolution]);',
  '  const scale = 0.58 + node.intensity * 0.2;',
  '  const visibleOpacity = selected ? 1 : overview ? 0.82 : related ? 0.42 : 0.11;',
].join('\n')
const newTextureBlock = [
  '  const texture = useMemo(() => createMemorySurface(node, textureResolution), [node, textureResolution]);',
  '  const textureKey = texture?.uuid || "pending";',
  '  const scale = 0.58 + node.intensity * 0.2;',
].join('\n')
replaceExactlyOnce(oldTextureBlock, newTextureBlock, 'texture-key')
replaceExactlyOnce(
  '      <mesh scale={[scale * 1.5, scale * 1.5, 1]}>',
  '      <mesh key={textureKey + "-main"} scale={[scale * 1.5, scale * 1.5, 1]}>',
  'main-lens-remount',
)
replaceExactlyOnce(
  '          color={texture ? "#ffffff" : "#071323"}',
  '          color={texture ? "#ffffff" : "#071425"}',
  'transparent-fallback-color',
)
replaceExactlyOnce(
  '          opacity={texture ? visibleOpacity : 0}',
  '          opacity={texture ? selected ? 1 : overview ? 0.82 : related ? 0.42 : 0.11 : 0}',
  'transparent-fallback-opacity',
)

fs.writeFileSync(path, source)
console.log('Patched the isolated memory-lens applicator deterministically.')

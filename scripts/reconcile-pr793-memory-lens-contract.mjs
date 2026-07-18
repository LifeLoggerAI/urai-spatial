import fs from 'node:fs'

const path = 'urai-tier1/tests/lifemap-scene-behavior.test.mjs'
const source = fs.readFileSync(path, 'utf8')

const oldBlock = [
  "  assert.match(source, /:\\s*80;\\s*const \\[texture, setTexture\\] = useState<THREE\\.CanvasTexture \\| null>\\(null\\)/, 'Non-related memories must use the smallest allocation before commit-phase texture state.')",
  "  assert.ok(source.includes('const nextTexture = createMemorySurface(node, textureResolution)'), 'Texture creation must occur inside the committed effect lifecycle.')",
  "  assert.ok(source.includes('setTexture(nextTexture)'), 'Committed textures must enter React state only after creation.')",
  "  assert.ok(source.includes('window.requestAnimationFrame(() => nextTexture?.dispose())'), 'Replaced textures must remain alive through the replacement commit and paint.')",
  "  assert.doesNotMatch(source, /return \\(\\) => nextTexture\\?\\.dispose\\(\\)/, 'Texture cleanup must not dispose the previous texture synchronously before replacement paint.')",
  "  assert.ok(source.includes('if (!/^[0-9a-f]{6}$/i.test(normalized))'), 'Invalid aura metadata must fall back before RGB bitwise conversion.')",
  "  assert.ok(source.includes('return `rgba(138, 223, 255, ${alpha})`'), 'Invalid aura metadata must use the canonical cyan fallback.')",
  "  assert.doesNotMatch(source, /useMemo\\(\\(\\) => createMemorySurface/, 'CanvasTexture allocation must never occur during render.')",
].join('\n')

const newBlock = [
  "  assert.match(source, /:\\s*80;\\s*const texture = useMemo\\(\\(\\) => createMemorySurface\\(node, textureResolution\\)/, 'Non-related memories must retain the smallest allocation under synchronous texture ownership.')",
  "  assert.ok(source.includes('const texture = useMemo(() => createMemorySurface(node, textureResolution), [node, textureResolution])'), 'Texture creation must be memoized by node and allocation tier.')",
  "  assert.doesNotMatch(source, /setTexture\\(|useState<THREE\\.CanvasTexture \\| null>/, 'Synchronous texture ownership must not use delayed React texture state.')",
  "  assert.ok(source.includes('const dispose = () => texture?.dispose()'), 'Texture replacements must retain deterministic disposal ownership.')",
  "  assert.ok(source.includes('window.requestAnimationFrame(dispose)'), 'Replaced textures must remain alive through the replacement paint.')",
  "  assert.ok(source.includes('if (!/^[0-9a-f]{6}$/i.test(normalized))'), 'Invalid aura metadata must fall back before RGB bitwise conversion.')",
  "  assert.ok(source.includes('return `rgba(138, 223, 255, ${alpha})`'), 'Invalid aura metadata must use the canonical cyan fallback.')",
  "  assert.match(source, /useMemo\\(\\(\\) => createMemorySurface/, 'CanvasTexture allocation must use bounded synchronous memoization.')",
].join('\n')

const first = source.indexOf(oldBlock)
if (first < 0) throw new Error('Expected legacy texture ownership contract was not found')
if (source.indexOf(oldBlock, first + oldBlock.length) >= 0) throw new Error('Legacy texture ownership contract was duplicated')

fs.writeFileSync(path, source.slice(0, first) + newBlock + source.slice(first + oldBlock.length))
console.log('Reconciled synchronous Life Map texture ownership contract.')

import fs from 'node:fs'

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected source duplicated in ${path}`)
  fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
}

replaceOnce(
  'urai-tier1/src/app/life-map/layout.tsx',
  `export default function LifeMapLayout({ children }: { children: ReactNode }) {
  return <div className="lifemap-starfield-shell">{children}</div>
}
`,
  `export default function LifeMapLayout({ children }: { children: ReactNode }) {
  return children
}
`,
)

const artBiblePath = 'urai-tier1/tests/home-ground-lifemap-art-bible-contract.test.mjs'
let artBible = fs.readFileSync(artBiblePath, 'utf8')
const readAnchor = `const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')\n`
if (!artBible.includes(readAnchor)) throw new Error('Life Map art-bible read anchor missing')
artBible = artBible.replace(readAnchor, `${readAnchor}const lifeMapLayout = read('src/app/life-map/layout.tsx')\n`)
if (artBible.includes('Life Map route has one visual owner')) throw new Error('Life Map single-owner contract already present')
artBible = `${artBible.trimEnd()}\n\ntest('Life Map route has one visual owner', () => {\n  assert.doesNotMatch(lifeMapLayout, /lifemap-starfield-shell/, 'The route layout must not mount a second starfield outside the canonical realm')\n  assert.match(lifeMapLayout, /return children/, 'The route layout must pass the canonical Life Map owner through directly')\n})\n`
fs.writeFileSync(artBiblePath, artBible)

replaceOnce(
  'urai-tier1/tests/spatial-missing-resource-diagnostic-contract.test.mjs',
  `  assert.match(lifeMapEventsSource, /setNodes\\(lifeMapNodes\\)/)\n`,
  `  assert.match(lifeMapEventsSource, /setNodes\\(canonicalLifeMapDemoNodes\\)/)\n`,
)

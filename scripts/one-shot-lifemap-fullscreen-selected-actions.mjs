import fs from 'node:fs'

const replaceOnce = (path, before, after) => {
  const source = fs.readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}: ${before.slice(0, 140)}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const adaptive = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
replaceOnce(
  adaptive,
  '<Html distanceFactor={8.2} position={[0, -scale * 1.48, 0.16]} center zIndexRange={[90, 30]}>',
  '<Html fullscreen zIndexRange={[90, 30]}>',
)

const css = 'urai-tier1/src/spatial/world/lifeMapSelectedCinematic.css'
replaceOnce(
  css,
  `.life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
  position: relative;
  z-index: 90;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(560px, calc(100vw - 40px));
  max-width: min(560px, calc(100vw - 40px));
  box-sizing: border-box;
  transform: translateY(clamp(-230px, -22vh, -145px));
  transform-origin: center;
}`,
  `.life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
  position: absolute;
  z-index: 90;
  left: 50%;
  top: clamp(500px, 68svh, 720px);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(560px, calc(100vw - 40px));
  max-width: min(560px, calc(100vw - 40px));
  box-sizing: border-box;
  transform: translate(-50%, -50%);
  transform-origin: center;
  pointer-events: auto;
}`,
)
replaceOnce(
  css,
  `  .life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
    gap: 4px;
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    padding: 5px;
    transform: translateY(clamp(-145px, -16vh, -96px));
  }`,
  `  .life-map-independent-realm[data-life-map-mode='selected'] .life-map-memory-portals {
    top: clamp(430px, 68svh, 590px);
    gap: 4px;
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    padding: 5px;
    transform: translate(-50%, -50%);
  }`,
)

const deepLink = 'urai-tier1/tests/lifemap-deep-link-controls-contract.test.mjs'
replaceOnce(
  deepLink,
  `  assert.match(selectedCinematic, /width: min\\(560px, calc\\(100vw - 40px\\)\\)/)
  assert.match(selectedCinematic, /max-width: min\\(560px, calc\\(100vw - 40px\\)\\)/)
  assert.match(selectedCinematic, /translateY\\(clamp\\(-230px, -22vh, -145px\\)\\)/)
  assert.match(selectedCinematic, /min-height: 52px/)
  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*width: calc\\(100vw - 24px\\)/)
  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*max-width: calc\\(100vw - 24px\\)/)
  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*translateY\\(clamp\\(-145px, -16vh, -96px\\)\\)/)
  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-height: 48px/)`,
  `  assert.match(adaptive, /<Html fullscreen zIndexRange=\\{\\[90, 30\\]\\}>/)
  assert.doesNotMatch(adaptive, /<Html distanceFactor=\\{8\\.2\\}[\\s\\S]*life-map-memory-portals/)
  assert.match(selectedCinematic, /position: absolute/)
  assert.match(selectedCinematic, /left: 50%/)
  assert.match(selectedCinematic, /top: clamp\\(500px, 68svh, 720px\\)/)
  assert.match(selectedCinematic, /width: min\\(560px, calc\\(100vw - 40px\\)\\)/)
  assert.match(selectedCinematic, /max-width: min\\(560px, calc\\(100vw - 40px\\)\\)/)
  assert.match(selectedCinematic, /transform: translate\\(-50%, -50%\\)/)
  assert.match(selectedCinematic, /min-height: 52px/)
  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*top: clamp\\(430px, 68svh, 590px\\)/)
  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*width: calc\\(100vw - 24px\\)/)
  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*max-width: calc\\(100vw - 24px\\)/)
  assert.match(selectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-height: 48px/)`,
)

const finalContract = 'urai-tier1/tests/final-aaa-world-convergence-contract.test.mjs'
replaceOnce(
  finalContract,
  `  assert.match(lifeMapSelectedCinematic, /width: min\\(560px, calc\\(100vw - 40px\\)\\)/)
  assert.match(lifeMapSelectedCinematic, /transform: translateY\\(clamp\\(-230px, -22vh, -145px\\)\\)/)
  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*width: calc\\(100vw - 24px\\)/)
  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-height: 48px/)`,
  `  assert.match(adaptiveLifeMap, /<Html fullscreen zIndexRange=\\{\\[90, 30\\]\\}>/)
  assert.doesNotMatch(adaptiveLifeMap, /<Html distanceFactor=\\{8\\.2\\}[\\s\\S]*life-map-memory-portals/)
  assert.match(lifeMapSelectedCinematic, /position: absolute/)
  assert.match(lifeMapSelectedCinematic, /top: clamp\\(500px, 68svh, 720px\\)/)
  assert.match(lifeMapSelectedCinematic, /width: min\\(560px, calc\\(100vw - 40px\\)\\)/)
  assert.match(lifeMapSelectedCinematic, /transform: translate\\(-50%, -50%\\)/)
  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*top: clamp\\(430px, 68svh, 590px\\)/)
  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*width: calc\\(100vw - 24px\\)/)
  assert.match(lifeMapSelectedCinematic, /@media \\(max-width: 760px\\)[\\s\\S]*min-height: 48px/)`,
)

console.log('Applied fullscreen selected-memory action ownership repair')

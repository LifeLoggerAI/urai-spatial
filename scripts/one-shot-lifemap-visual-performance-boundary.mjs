import fs from 'node:fs'

const replaceOnce = (path, before, after) => {
  const source = fs.readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique source duplicated in ${path}`)
  fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
}

const controls = 'urai-tier1/src/spatial/lifemap/LifeMapDeepLinkControls.tsx'
replaceOnce(
  controls,
  `    const observer = new MutationObserver(closeSemanticDrawers)\n    observer.observe(document.body, { childList: true, subtree: true })\n    return () => {\n      window.cancelAnimationFrame(frame)\n      observer.disconnect()\n    }`,
  `    return () => {\n      window.cancelAnimationFrame(frame)\n    }`,
)

const contract = 'urai-tier1/tests/lifemap-visual-material-contract.test.mjs'
replaceOnce(
  contract,
  `  assert.match(controls, /new MutationObserver\\(closeSemanticDrawers\\)/)`,
  `  assert.match(controls, /requestAnimationFrame\\(closeSemanticDrawers\\)/)\n  assert.doesNotMatch(controls, /MutationObserver|observer\\.observe|document\\.body/, 'Selected-memory controls must not install a body-wide DOM observer')`,
)

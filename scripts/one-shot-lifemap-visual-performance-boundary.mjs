import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

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

execFileSync('git', ['add', '-N', contract])
const changed = execFileSync('git', ['diff', '--name-only'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort()
console.log('visual_correction_changed_files_begin')
for (const path of changed) console.log(path)
console.log('visual_correction_changed_files_end')
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' })

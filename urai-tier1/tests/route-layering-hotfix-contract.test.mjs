import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const layoutPath = path.join(root, 'src/app/layout.tsx')
const hotfixPath = path.join(root, 'src/app/route-layering-hotfix.css')

test('route layering hotfix loads after the global visual stack', () => {
  const layout = fs.readFileSync(layoutPath, 'utf8')
  const visualStack = "import './urai-design-system.css'"
  const hotfix = "import './route-layering-hotfix.css'"

  assert.match(layout, /route-layering-hotfix\.css/)
  assert.ok(
    layout.indexOf(hotfix) > layout.indexOf(visualStack),
    'layering hotfix must be the final CSS import so earlier global rules cannot cover route UI'
  )
})

test('decorative backdrops stay below interactive route content', () => {
  const css = fs.readFileSync(hotfixPath, 'utf8')

  assert.match(css, /body\s*>\s*\.urai-cinematic-backdrop\s*\{[^}]*z-index:\s*0\s*!important/s)
  assert.match(css, /body\s*>\s*\.urai-final-asset-spine-scene-layer\s*\{[^}]*z-index:\s*0\s*!important/s)
  assert.match(css, /body\s*>\s*main[\s\S]*z-index:\s*3/)
})

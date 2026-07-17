import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const shell = fs.readFileSync('src/spatial/world/UraiWorldShell.tsx', 'utf8')
const targetCss = fs.readFileSync('src/spatial/world/interactiveTargetConvergence.css', 'utf8')
const companionCss = fs.readFileSync('src/spatial/world/persistentWorldCompanion.css', 'utf8')

test('persistent Orb destinations retain a 48px target through the opening transition', () => {
  assert.match(shell, /import '\.\/interactiveTargetConvergence\.css'/)
  assert.match(companionCss, /scale\(\.96\)/)
  assert.match(targetCss, /\.urai-world-companion__menu button\s*\{[\s\S]*min-height:\s*50px;/)
  assert.match(targetCss, /@media \(pointer: coarse\)[\s\S]*min-width:\s*50px;/)
  assert.ok(50 * 0.96 >= 48)
})

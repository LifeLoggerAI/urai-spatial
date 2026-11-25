import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../src/spatial/world/${path}`, import.meta.url), 'utf8')
const atmosphere = read('persistentRealmAtmosphere.css')
const navigation = read('worldNavigation.css')
const shell = read('UraiWorldShell.tsx')
const rule = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))
  assert.ok(match, `${selector} must have an explicit layer rule`)
  return match[1].replace(/\/\*[\s\S]*?\*\//g, '')
}

test('shared atmosphere paints below normal route stacking contexts', () => {
  const layer = rule(atmosphere, '.urai-world-atmosphere')
  const zIndex = Number(layer.match(/z-index:\s*(-?\d+)/)?.[1])
  assert.ok(Number.isFinite(zIndex) && zIndex < 0,
    'a nonnegative shared layer paints over fixed, isolated route roots and dims their text')
  assert.match(layer, /pointer-events:\s*none/)
})

test('the world shell contains the background layer beneath its route children', () => {
  assert.match(rule(navigation, '.urai-world-runtime'), /isolation:\s*isolate/)
  assert.match(shell, /<PersistentRealmAtmosphere\s*\/>\s*\{children\}/)
  assert.match(shell, /className="urai-world-runtime"/)
})

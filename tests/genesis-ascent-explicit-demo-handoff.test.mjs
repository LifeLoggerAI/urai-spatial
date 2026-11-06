import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const route = readFileSync(new URL('../urai-tier1/src/spatial/world/WorldTransitionController.tsx', import.meta.url), 'utf8')
const fallback = readFileSync(new URL('../urai-tier1/src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')

function disclosedDemo(search) {
  const query = new URLSearchParams(search)
  return query.getAll('demo').length === 1 && query.get('demo') === '1'
}

test('only one explicitly disclosed demo=1 may cross Home ascent', () => {
  assert.equal(disclosedDemo('?demo=1'), true)
  assert.equal(disclosedDemo('?from=home-sky&demo=1'), true)
  for (const value of ['', '?demo=0', '?demo=true', '?demo=1&demo=1', '?demo=1&demo=0']) {
    assert.equal(disclosedDemo(value), false, value)
  }
})

test('original Home camera dispatch carries only explicitly disclosed demo context', () => {
  assert.match(source, /query\.getAll\('demo'\)\.length === 1 && query\.get\('demo'\) === '1'/)
  assert.match(source, /\.\.\.\(disclosedDemo \? \{ context: \{ demo: true \} \} : \{\}\)/)
  assert.match(source, /cameraCheckpoint: 'home-sky-ascent-complete'/)
})

test('both governed navigation paths admit demo only from explicit travel context', () => {
  assert.match(route, /if \(memoryDestination && context\?\.demo &&/)
  assert.match(fallback, /if \(memoryDestination && context\?\.demo &&/)
  assert.match(route, /target\.searchParams\.set\('demo', '1'\)/)
  assert.match(fallback, /target\.searchParams\.set\('demo', '1'\)/)
})

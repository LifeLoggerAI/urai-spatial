import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')

test('Life Map identity fails closed instead of defaulting to demo-user', () => {
  assert.doesNotMatch(source, /return "demo-user"/)
  assert.doesNotMatch(source, /\|\| "demo-user"/)
  assert.match(source, /function resolveUserId\(explicitUserId\?: string\): string \| null/)
  assert.match(source, /if \(!resolvedUserId\)/)
  assert.match(source, /Sign in to open your private Life Map\./)
})

test('sample memories require an explicit demo contract', () => {
  assert.match(source, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO/)
  assert.match(source, /urai:lifeMapDemoMode/)
  assert.match(source, /explicitUserId === "demo-user"/)
  assert.match(source, /sourceMode: LifeMapSourceMode/)
  assert.match(source, /"explicit-demo"/)
})

test('empty and failed private snapshots never substitute seed memories', () => {
  assert.match(source, /setNodes\(nextNodes\)/)
  assert.doesNotMatch(source, /setNodes\(nextNodes\.length \? nextNodes : lifeMapNodes\)/)
  assert.doesNotMatch(source, /setEras\(nextEras\.length \? nextEras : lifeMapEras\)/)
  assert.match(source, /setNodes\(\[\]\)/)
  assert.match(source, /setEras\(\[\]\)/)
  assert.match(source, /\? "empty"/)
  assert.match(source, /\? "error"/)
  assert.match(source, /\? "unavailable"/)
})

test('normalized documents inherit the authenticated owner rather than a fake identity', () => {
  assert.match(source, /function normalizeEvent\(id: string, data: DocumentData, ownerId = ""\)/)
  assert.match(source, /userId: typeof data\.userId === "string" \? data\.userId : ownerId/)
  assert.match(source, /normalizeEvent\(doc\.id, doc\.data\(\), resolvedUserId\)/)
  assert.match(source, /normalizeEra\(doc\.id, doc\.data\(\), resolvedUserId\)/)
})

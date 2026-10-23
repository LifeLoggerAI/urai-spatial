import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/spatial/life-movie/lifeMovieRouteScope.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'lifeMovieRouteScope.ts', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
assert.equal(compiled.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0)
const module = { exports: {} }
vm.runInNewContext(compiled.outputText, {
  module, exports: module.exports, URLSearchParams, encodeURIComponent, JSON,
})
const { lifeMovieRouteScope, lifeMovieRequestCurrent, lifeMovieSignInHref } = module.exports

test('selected movie, selected memory and empty route are independent identities', () => {
  assert.notEqual(lifeMovieRouteScope('movie-a', 'memory-a'), lifeMovieRouteScope('movie-b', 'memory-a'))
  assert.notEqual(lifeMovieRouteScope('movie-a', 'memory-a'), lifeMovieRouteScope('movie-a', 'memory-b'))
  assert.notEqual(lifeMovieRouteScope(null, 'memory-a'), lifeMovieRouteScope(null, null))
})

test('a previous route or previous account can never authorize pending memory results', () => {
  const original = { ownerId: 'owner-a', ownerEpoch: 3, routeScope: lifeMovieRouteScope('movie-a', 'memory-a') }
  assert.equal(lifeMovieRequestCurrent(original, { ...original }), true)
  assert.equal(lifeMovieRequestCurrent(original, { ...original, ownerEpoch: 4 }), false)
  assert.equal(lifeMovieRequestCurrent(original, { ...original, ownerId: 'owner-b' }), false)
  assert.equal(lifeMovieRequestCurrent(original, { ...original, ownerId: null }), false)
  assert.equal(lifeMovieRequestCurrent(original, { ...original, routeScope: lifeMovieRouteScope('movie-b', 'memory-a') }), false)
  assert.equal(lifeMovieRequestCurrent({ ...original, ownerId: null }, { ...original, ownerId: null }), false)
})

test('sign-in resumes both sanctioned movie and chapter identity via original login returnTo', () => {
  const href = lifeMovieSignInHref('movie-a', 'memory-a')
  assert.equal(href, '/login?returnTo=%2Flife-movie%3FmovieId%3Dmovie-a%26memoryId%3Dmemory-a')
  const url = new URL(href, 'https://urai.invalid')
  assert.equal(url.searchParams.get('returnTo'), '/life-movie?movieId=movie-a&memoryId=memory-a')
  assert.equal(lifeMovieSignInHref(null, null), '/login?returnTo=%2Flife-movie')
})

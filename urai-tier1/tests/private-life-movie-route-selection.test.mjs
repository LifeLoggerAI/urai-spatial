import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readPrivateMovieRouteSelection, forwardPrivateMovieRouteSelection, selectedPrivateMovieFromBrowserLocation } from '../src/spatial/life-movie/privateLifeMovieRouteSelection.ts'

const memory = Object.freeze({memoryId:'fictional-memory-a',manifestId:'fictional-manifest-a',authorizedOwner:true,demo:false})
const plan = 'lmp_' + 'a'.repeat(20)
const base = ['memoryId='+memory.memoryId,'manifestId='+memory.manifestId,'movieId=fictional-movie','lifeMoviePlanId='+plan].join('&')
const query = extra => new URLSearchParams(base + (extra ? '&' + extra : ''))

test('retains owner selected movie and plan through Life Map, Focus and Replay, without granting authority', () => {
  const selected = readPrivateMovieRouteSelection(query(), memory)
  assert.deepEqual(selected, {movieId:'fictional-movie',planId:plan})
  const target = new URLSearchParams({memoryId:memory.memoryId,manifestId:memory.manifestId,from:'life-map'})
  assert.equal(forwardPrivateMovieRouteSelection(target, query(), memory), true)
  assert.deepEqual(selectedPrivateMovieFromBrowserLocation('/focus?'+target, memory),selected)
  const replay = new URLSearchParams({memoryId:memory.memoryId,manifestId:memory.manifestId,from:'focus-artifact'})
  assert.equal(forwardPrivateMovieRouteSelection(replay,target,memory),true)
  assert.deepEqual(selectedPrivateMovieFromBrowserLocation('/replay?'+replay,memory),selected)
})

test('selecting a different movie with the same memory updates the selector', () => {
  const first = selectedPrivateMovieFromBrowserLocation('/replay?'+base, memory)
  const next = selectedPrivateMovieFromBrowserLocation('/replay?'+base.replace('fictional-movie','fictional-movie-new'),memory)
  assert.equal(first.movieId,'fictional-movie')
  assert.equal(next.movieId,'fictional-movie-new')
})
for (const [name,value,expectedMemory] of [
  ['different memory',base.replace('fictional-memory-a','fictional-memory-b'),memory],
  ['different manifest',base.replace('fictional-manifest-a','fictional-manifest-b'),memory],
  ['duplicate movie',base+'&movieId=other',memory],
  ['duplicate plan',base+'&lifeMoviePlanId=lmp_'+('z'.repeat(20)),memory],
  ['duplicate memory',base+'&memoryId=fictional-memory-a',memory],
  ['duplicate manifest',base+'&manifestId=fictional-manifest-a',memory],
  ['demo query',base+'&demo=1',memory],
  ['demo memory',base,{...memory,demo:true}],
  ['unsigned owner',base,{...memory,authorizedOwner:false}],
  ['invalid movie id',base.replace('movieId=fictional-movie','movieId=%2Fadmin'),memory],
  ['short plan',base.replace(plan,'lmp_a'),memory],
  ['missing movie',base.replace('movieId=fictional-movie&',''),memory],
  ['missing plan',base.replace('&lifeMoviePlanId='+plan,''),memory],
]) {
  test('fail-closed selector: '+name, () => {
    const source = new URLSearchParams(value)
    const target = new URLSearchParams({memoryId:memory.memoryId,manifestId:memory.manifestId})
    assert.equal(readPrivateMovieRouteSelection(source,expectedMemory), null)
    assert.equal(forwardPrivateMovieRouteSelection(target,source,expectedMemory),false)
    assert.equal(target.has('movieId'),false)
    assert.equal(target.has('lifeMoviePlanId'),false)
  })
}
test('route parser never accepts unrelated, protocol or path fragments',()=>{
  for (const url of ['/', '/life-map?'+base, 'https://host.test/focus?'+base, '/focus#?'+base, '/replay?movieId=fictional-movie'])
    assert.equal(selectedPrivateMovieFromBrowserLocation(url,memory),null)
})

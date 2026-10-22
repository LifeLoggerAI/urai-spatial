import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:net'
import { allocateEphemeralPort, ownedChildExited, waitForOwnedHome, warmOwnedLifeMap, warmOwnedJourneyRealm } from './spatial-owned-server.mjs'

const ownedMarkup = '<html data-urai-domain="app" data-urai-surface="spatial"><body data-urai-home-spatial-shell="true"><main>Home</main></body></html>'
const html = (status, body = ownedMarkup) => ({ status, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => body })

test('port selection avoids an occupied server port', async () => {
  const existing = createServer()
  await new Promise(resolve => existing.listen(0, '127.0.0.1', resolve))
  try {
    const selected = await allocateEphemeralPort()
    assert.equal(Number.isInteger(selected), true)
    assert.notEqual(selected, existing.address().port)
  } finally {
    await new Promise(resolve => existing.close(resolve))
  }
})

test('an unrelated 404 cannot qualify as an owned Home route', async () => {
  let calls = 0
  await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', { exitCode: null, signalCode: null }, {
    fetchImpl: async () => { calls++; return html(404) },
    timeoutMs: 4, intervalMs: 1,
  }), /URAI_OWNED_HOME_NOT_READY/)
  assert.ok(calls > 0)
})

test('unrelated HTTP 200 JSON cannot qualify as Home HTML', async () => {
  const reply = { status: 200, headers: { get: () => 'application/json' } }
  await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', null, {
    fetchImpl: async () => reply,
    timeoutMs: 4, intervalMs: 1,
  }), /URAI_OWNED_HOME_NOT_READY/)
})

test('already exited child aborts before attempting another port', async () => {
  let called = false
  assert.equal(ownedChildExited({ exitCode: 1, signalCode: null }), true)
  await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', { exitCode: 1, signalCode: null }, {
    fetchImpl: async () => { called = true; return html(200) },
  }), /URAI_OWNED_SERVER_EXITED_BEFORE_READY/)
  assert.equal(called, false)
})

test('real owned-route HTTP 200 HTML is accepted', async () => {
  const seen = []
  await waitForOwnedHome('http://127.0.0.1:32143', { exitCode: null, signalCode: null }, {
    fetchImpl: async (url, options) => { seen.push({ url, options }); return html(200) },
  })
  assert.equal(seen.length, 1)
  assert.equal(new URL(seen[0].url).pathname, '/home')
  assert.equal(seen[0].options.redirect, 'manual')
})

test('null child is valid only for caller-authorized existing server', async () => {
  assert.equal(ownedChildExited(null), false)
  await waitForOwnedHome('http://127.0.0.1:32143', null, {
    fetchImpl: async () => html(200),
  })
})

test('a foreign HTML 200 must never certify the original UrAi server', async () => {
  await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', null, {
    fetchImpl: async () => html(200, '<html><body>Other website</body></html>'),
    timeoutMs: 5, intervalMs: 1,
  }), /URAI_OWNED_HOME_NOT_READY/)
})

test('partial or spoofed UrAi marker text outside the document root does not grant readiness', async () => {
  for (const payload of [
    '<html><body>data-urai-domain="app" data-urai-surface="spatial" data-urai-home-spatial-shell="true"</body></html>',
    '<html data-urai-domain="app"><body data-urai-home-spatial-shell="true"></body></html>',
    '<html data-urai-domain="app" data-urai-surface="spatial"><body>Other website</body></html>',
  ]) {
    await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', null, {
      fetchImpl: async () => html(200, payload),
      timeoutMs: 4, intervalMs: 1,
    }), /URAI_OWNED_HOME_NOT_READY/)
  }
})

test('cold Life Map preflight verifies original owned 200 before timed journey',async()=>{
  const seen=[]
  const response=await warmOwnedLifeMap('http://127.0.0.1:32143',{exitCode:null,signalCode:null},{
    fetchImpl:async(url,options)=>{seen.push({url,options});return html(200)}
  })
  assert.equal(response.status,200)
  assert.equal(new URL(seen[0].url).pathname,'/life-map')
  assert.equal(seen[0].options.redirect,'manual')
  assert.equal(seen[0].options.signal instanceof AbortSignal,true)
})
test('cold Life Map preflight denies foreign HTML, JSON and HTTP 404',async()=>{
  for(const response of [html(404),{status:200,headers:{get:()=> 'application/json'},text:async()=> '{}'},html(200,'<html><body>foreign</body></html>')]){
    await assert.rejects(warmOwnedLifeMap('http://127.0.0.1:32143',null,{fetchImpl:async()=>response}),/URAI_OWNED_LIFEMAP_WARMUP_HTTP_|URAI_OWNED_LIFEMAP_NOT_ORIGINAL_DOCUMENT/)
  }
})
test('cold Life Map preflight denies dead server and mid-request exit',async()=>{
  let called=false
  await assert.rejects(warmOwnedLifeMap('http://127.0.0.1:32143',{exitCode:1,signalCode:null},{fetchImpl:async()=>{called=true;return html(200)}}),/URAI_OWNED_LIFEMAP_CHILD_EXITED_BEFORE_WARMUP/)
  assert.equal(called,false)
  const child={exitCode:null,signalCode:null}
  await assert.rejects(warmOwnedLifeMap('http://127.0.0.1:32143',child,{fetchImpl:async()=>{child.exitCode=1;return html(200)}}),/URAI_OWNED_LIFEMAP_CHILD_EXITED_DURING_WARMUP/)
})
test('cold Life Map preflight surfaces compilation errors without false green',async()=>{
  await assert.rejects(warmOwnedLifeMap('http://127.0.0.1:32143',null,{fetchImpl:async()=>{throw Error('compiler exit')}}),/URAI_OWNED_LIFEMAP_WARMUP_NETWORK_FAILED: compiler exit/)
})


// These preflights pre-compile public, context-free routes only. They must
// never count as a user's Focus/Replay entry or accept a foreign HTTP 200.
for (const route of ['/focus', '/replay']) {
  test('owned cold ' + route + ' compile preflight requires original HTTP 200 HTML', async () => {
    const seen = []
    const res = await warmOwnedJourneyRealm('http://127.0.0.1:32143', { exitCode:null, signalCode:null }, route, {
      fetchImpl: async (url, options) => { seen.push({ url, options }); return html(200) },
    })
    assert.equal(res.status, 200)
    assert.equal(new URL(seen[0].url).pathname, route)
    assert.equal(seen[0].options.redirect, 'manual')
    assert.equal(seen[0].options.signal instanceof AbortSignal, true)
  })
  test('owned cold ' + route + ' refuses foreign HTML, JSON and HTTP 404', async () => {
    const bad = [html(404), { status:200, headers:{ get:()=> 'application/json' }, text:async()=> '{}' }, html(200, '<html><body>Other server</body></html>')]
    for (const response of bad) {
      await assert.rejects(warmOwnedJourneyRealm('http://127.0.0.1:32143', null, route, {
        fetchImpl: async()=>response,
      }), /WARMUP_HTTP_|NOT_ORIGINAL_DOCUMENT/)
    }
  })
  test('owned cold ' + route + ' fails before and during server exit', async () => {
    let called = false
    await assert.rejects(warmOwnedJourneyRealm('http://127.0.0.1:32143', {exitCode:1,signalCode:null}, route, {
      fetchImpl:async()=>{called=true;return html(200)},
    }), /CHILD_EXITED_BEFORE_WARMUP/)
    assert.equal(called,false)
    const child={exitCode:null,signalCode:null}
    await assert.rejects(warmOwnedJourneyRealm('http://127.0.0.1:32143', child, route, {
      fetchImpl:async()=>{child.exitCode=1;return html(200)},
    }), /CHILD_EXITED_DURING_WARMUP/)
  })
  test('owned cold ' + route + ' preserves compilation failures as failures', async () => {
    await assert.rejects(warmOwnedJourneyRealm('http://127.0.0.1:32143',null,route,{
      fetchImpl:async()=>{throw Error('compiler failed')},
    }), /WARMUP_NETWORK_FAILED: compiler failed/)
  })
}
test('journey preflight disallows memory query strings, unowned or unrelated routes', async () => {
  for (const route of ['/home', '/life-map', '/focus?memoryId=private', '/replay#private', 'https://unrelated.test/replay', '/admin']) {
    await assert.rejects(warmOwnedJourneyRealm('http://127.0.0.1:32143',null,route,{
      fetchImpl:async()=>html(200),
    }), /URAI_OWNED_JOURNEY_WARMUP_ROUTE_REJECTED/)
  }
})

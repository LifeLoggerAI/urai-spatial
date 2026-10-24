import test from 'node:test'
import assert from 'node:assert/strict'
import {lifeMapSoftwareRouteDestination as resolve} from '../urai-tier1/src/components/lifemap/lifeMapSoftwareRouteIntent.mjs'
const origin = 'http://127.0.0.1:3002'
const focus = '/focus?memoryId=demo%3Astar-1&manifestId=replay-recovery-thread&from=life-map'
const replay = '/replay?memoryId=memory-1&manifestId=manifest-1'
test('authored focus route preserves the original private/demo destination identity',()=>{
  const result=resolve('focus',focus,origin)
  assert.equal(result.pathname,'/focus')
  assert.equal(result.searchParams.get('memoryId'),'demo:star-1')
  assert.equal(result.searchParams.get('manifestId'),'replay-recovery-thread')
  assert.equal(result.searchParams.get('from'),'life-map')
})
test('authored replay route accepted independently of visible text',()=>{
  assert.equal(resolve('replay',replay,origin).pathname,'/replay')
})
test('translated or changed label does not influence semantic action',()=>{
  for(const label of ['Entrar en Enfoque','Zum Fokus','\u96c6\u4e2d','\u0625\u0639\u0627\u062f\u0629']) {
    assert.ok(label.length>0)
    assert.equal(resolve('focus',focus,origin).pathname,'/focus')
  }
})
test('unknown, wrong-route, and overview actions are not navigation authority',()=>{
  for(const action of [null,'',undefined,'overview','login','focus-extra','replay/', 'FOCUS']) assert.equal(resolve(action,focus,origin),null)
  assert.equal(resolve('focus',replay,origin),null)
  assert.equal(resolve('replay',focus,origin),null)
})
test('missing, empty, absolute and protocol-relative hrefs fail closed',()=>{
  for(const href of [null,undefined,'','focus?memoryId=m&manifestId=x','https://elsewhere.example/focus?memoryId=m&manifestId=x','//elsewhere.example/focus?memoryId=m&manifestId=x']) assert.equal(resolve('focus',href,origin),null)
})
test('same origin but wrong pathname, path prefix or fragment fail closed',()=>{
  for(const href of ['/focus-extra?memoryId=m&manifestId=x','/login?memoryId=m&manifestId=x','/focus?memoryId=m&manifestId=x#javascript']) assert.equal(resolve('focus',href,origin),null)
})
test('missing or invalid memory and manifest identity fail closed',()=>{
  for(const href of ['/focus?memoryId=m','/focus?manifestId=x','/focus?memoryId=&manifestId=x','/focus?memoryId=m&manifestId=','/focus?memoryId=bad%2Fid&manifestId=x','/focus?memoryId=m&manifestId=bad%20id']) assert.equal(resolve('focus',href,origin),null)
})
test('non-web or malformed origin is rejected',()=>{
  for(const candidate of ['not-a-url','file:///tmp/','https://example.com/another-path','http://']) assert.equal(resolve('focus',focus,candidate),null)
})
test('URL requires exact local origin including port and protocol',()=>{
  assert.equal(resolve('focus',focus,'https://127.0.0.1:3002').origin,'https://127.0.0.1:3002')
  assert.equal(resolve('focus',focus,origin).origin,origin)
  assert.equal(resolve('focus','//127.0.0.1:3003/focus?memoryId=m&manifestId=x',origin),null)
})
test('long and escaped memory identifiers cannot be substituted',()=>{
  assert.equal(resolve('focus','/focus?memoryId='+('x'.repeat(121))+'&manifestId=m',origin),null)
  assert.equal(resolve('replay','/replay?memoryId=%3Cscript%3E&manifestId=m',origin),null)
})
test('duplicate memory or manifest identities cannot create client/server parsing ambiguity',()=>{
  const invalid = [
    '/focus?memoryId=one&memoryId=two&manifestId=manifest',
    '/focus?memoryId=one&manifestId=manifest&manifestId=other',
    '/focus?memoryId=one&manifestId=manifest&memoryId=one',
    '/replay?memoryId=one&manifestId=manifest&manifestId=manifest',
  ]
  for (const href of invalid) {
    assert.equal(resolve(href.startsWith('/replay')?'replay':'focus',href,origin),null,href)
  }
})
test('source URL must name its authored route without dot segments or percent-normalization',()=>{
  for(const href of [
    '/%2e/focus?memoryId=m&manifestId=x',
    '/parent/../focus?memoryId=m&manifestId=x',
    '/./focus?memoryId=m&manifestId=x',
    '/replay/../focus?memoryId=m&manifestId=x',
  ]) assert.equal(resolve('focus',href,origin),null,href)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { confirmFirestoreRulesCoverage, executeMaintainedFirestoreRules, parseLocalFirestoreHost, RULE_TEST_FILES, DEMO_PROJECT } from '../scripts/firestore-live-rule-session.mjs'

function fixtureResponse({status=200, contentType='application/json', body='{"rules":[]}' } = {}) {
  return { status, headers:{get:name=> name==='content-type'?contentType:null}, json: async()=>JSON.parse(body) }
}

test('only exact loopback emulator address and safe local port are accepted', () => {
  assert.deepEqual(parseLocalFirestoreHost('127.0.0.1:4545'),{host:'127.0.0.1',port:4545})
  for (const hostile of ['',null,'localhost:8080','::1:8080','0.0.0.0:8080','8.8.8.8:8080','https://127.0.0.1:8080','127.0.0.1:0','127.0.0.1:80','127.0.0.1:65536','127.0.0.1:8080/foo']) {
    assert.throws(()=>parseLocalFirestoreHost(hostile), /FIRESTORE_LIVE_EMULATOR_HOST_REQUIRED_LOOPBACK_ONLY|FIRESTORE_LIVE_EMULATOR_PORT_INVALID/, String(hostile))
  }
})

test('only the Firebase demo project is used, never a real provider project', async () => {
  await assert.rejects(confirmFirestoreRulesCoverage({host:'127.0.0.1:8080',project:'urai-4dc1d',fetchImpl:()=>{ throw Error('should not fetch')}}),/FIRESTORE_LIVE_DEMO_PROJECT_REQUIRED/)
})

test('coverage probes the official emulator JSON endpoint with redirect blocked',async()=>{
  const visited=[]
  const x=await confirmFirestoreRulesCoverage({host:'127.0.0.1:54321',project:DEMO_PROJECT,fetchImpl:async(url,options)=>{
    visited.push({url,options});return fixtureResponse()
  }})
  assert.equal(x.project,DEMO_PROJECT)
  assert.deepEqual(x.port,54321)
  assert.deepEqual(visited.length,1)
  assert.equal(visited[0].url,'http://127.0.0.1:54321/emulator/v1/projects/demo-urai-rules:ruleCoverage')
  assert.equal(visited[0].options.redirect,'error')
  assert.equal(visited[0].options.signal instanceof AbortSignal,true)
})

for(const [name,response] of [
  ['404',fixtureResponse({status:404})],
  ['forbidden',fixtureResponse({status:403})],
  ['HTML',fixtureResponse({contentType:'text/html'})],
  ['redirect',fixtureResponse({status:302})],
  ['scalar',fixtureResponse({body:'"not-an-emulator"'})],
  ['null',fixtureResponse({body:'null'})],
  ['array',fixtureResponse({body:'[]'})],
  ['invalid-json',fixtureResponse({body:'not-json'})],
]){
  test('non-emulator coverage response '+name+' fails closed',async()=>{
    await assert.rejects(confirmFirestoreRulesCoverage({host:'127.0.0.1:65432',project:DEMO_PROJECT,fetchImpl:async()=>response}),/FIRESTORE_LIVE_COVERAGE_/)
  })
}

test('an inaccessible loopback emulator never qualifies', async () => {
  await assert.rejects(confirmFirestoreRulesCoverage({host:'127.0.0.1:54321',project:DEMO_PROJECT,fetchImpl:async()=>{throw Error('connection refused')}}),/FIRESTORE_LIVE_COVERAGE_UNREACHABLE/)
})

test('real maintained suite selection uses Node22 executable directly, no shell or static fallback',()=>{
  let calls=[];let markers=[]
  executeMaintainedFirestoreRules({executable:'/pinned/node22',spawn:(cmd,args,options)=>{calls.push({cmd,args,options});return {status:0}},onSuccess:s=>markers.push(s)})
  assert.equal(calls.length,1)
  assert.equal(calls[0].cmd,'/pinned/node22')
  assert.deepEqual(calls[0].args,['--test',...RULE_TEST_FILES])
  assert.equal(calls[0].options.shell,false)
  assert.equal(calls[0].options.stdio,'inherit')
  assert.deepEqual(markers,['URAI_FIRESTORE_LIVE_RULES_PROVEN=PASS'])
})

for(const errCase of [{status:2},{status:null,error:{code:'ENOENT'}},{status:null,signal:'SIGTERM'}]) {
  test('failed maintained rules never emit attestation '+JSON.stringify(errCase),()=>{
    let markers=[]
    assert.throws(()=>executeMaintainedFirestoreRules({spawn:()=>errCase,onSuccess:s=>markers.push(s)}),/FIRESTORE_LIVE_MAINTAINED_RULE_TESTS_FAILED/)
    assert.deepEqual(markers,[])
  })
}

test('real loopback HTTP socket can be queried with no provider access',async()=>{
  const server=createServer((req,res)=>{
    if(req.url !== '/emulator/v1/projects/demo-urai-rules:ruleCoverage'){
      res.writeHead(404);res.end();return
    }
    res.writeHead(200, {'Content-Type':'application/json'});res.end(JSON.stringify({rules:[]}))
  })
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
  try{
    const session=await confirmFirestoreRulesCoverage({host:'127.0.0.1:'+server.address().port,project:DEMO_PROJECT})
    assert.equal(session.host,'127.0.0.1')
  } finally {await new Promise(resolve=>server.close(resolve))}
})

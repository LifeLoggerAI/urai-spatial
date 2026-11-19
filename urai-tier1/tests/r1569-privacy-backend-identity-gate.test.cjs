'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const base = path.resolve(__dirname, '..')
const read = p => fs.readFileSync(path.join(base, p), 'utf8')
const backend = read('../apps/functions/src/privacyOperations.ts')
const exportsSource = read('../apps/functions/src/index.ts')
const clientSource = read('src/lib/privacy/operationalPrivacyClient.ts')
const helperSource = read('src/lib/privacy/privacyBackendCapability.ts')
const capability = (overrides = {}) => ({
  schema: 'urai-operational-privacy-capabilities-v1',
  contract: 'operational-v1', uid: 'owner-1', projectId: 'project-1',
  capabilities: { scopedExports: true, scopedDeletion: true, ownerExportDownload: true },
  ...overrides,
})
function transpile(source) {
  return ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  }}).outputText
}
function runModule(source, mocks) {
  const module = { exports: {} }
  new Function('require', 'module', 'exports', transpile(source))(
    id => {
      if (!(id in mocks)) throw Error('UNEXPECTED_DEPENDENCY:' + id)
      return mocks[id]
    }, module, module.exports,
  )
  return module.exports
}
function harness({answer = capability(), uid = 'owner-1', projectId = 'project-1',
                  handshakeError = null, env = 'operational-v1'} = {}) {
  const calls = []
  process.env.NEXT_PUBLIC_URAI_PRIVACY_CONTRACT = env
  const contract = runModule(read('src/lib/privacy/privacyContractAuthority.ts'), {})
  const helper = runModule(helperSource, {})
  const app = { options: { projectId } }
  const m = {
    'firebase/firestore': { collection: ()=>{}, limit:()=>{}, orderBy:()=>{}, query:()=>{}, onSnapshot:()=>{} },
    'firebase/auth': { getAuth: () => ({ currentUser: uid ? { uid } : null }) },
    'firebase/functions': { httpsCallable: (_instance, name) => async payload => {
      calls.push({ name, payload })
      if (name === 'getOperationalPrivacyCapabilities') {
        if (handshakeError) throw handshakeError
        return { data: answer }
      }
      return { data: { jobId: 'synthetic-job', state: 'queued' } }
    } },
    '@/lib/firebase/client': { app, functions: { fake: true }, getFirebaseDb:()=>{} },
    './privacyContractAuthority': contract,
    './privacyBackendCapability': helper,
  }
  return { client: runModule(clientSource, m), calls, helper }
}

test('backend exposes authenticated scoped-capability handshake and public entrypoint', () => {
  assert.match(backend, /export const getOperationalPrivacyCapabilities = functions\.https\.onCall/)
  assert.match(backend, /getOperationalPrivacyCapabilities[\s\S]*?requireUid\(context\)/)
  assert.match(exportsSource, /getOperationalPrivacyCapabilities/)
})
test('scoped export is denied before canonical same-name callable can be invoked', async () => {
  const { client, calls } = harness({handshakeError:new Error('functions/not-found')})
  await assert.rejects(client.createOperationalExportRequest(['consent']), /not-found/)
  assert.deepEqual(calls.map(c=>c.name), ['getOperationalPrivacyCapabilities'])
})
test('scoped deletion is denied before canonical account-wide callable can be invoked', async () => {
  const { client, calls } = harness({handshakeError:new Error('functions/not-found')})
  await assert.rejects(client.createOperationalDeletionRequest({scope:'memories',confirmation:'CONFIRM DELETE'}), /not-found/)
  assert.deepEqual(calls.map(c=>c.name), ['getOperationalPrivacyCapabilities'])
})
test('download URL is denied before wrong backend provides account-wide package', async () => {
  const { client, calls } = harness({answer:capability({contract:'canonical-account-v1'})})
  await assert.rejects(client.getOperationalExportDownloadUrl({jobId:'synthetic-job'}), /BACKEND_UNVERIFIED/)
  assert.deepEqual(calls.map(c=>c.name), ['getOperationalPrivacyCapabilities'])
})
test('backend project and user must independently match client application', async () => {
  for (const answer of [capability({uid:'another-owner'}), capability({projectId:'different-project'})]) {
    const { client, calls } = harness({answer})
    await assert.rejects(client.createOperationalDeletionRequest({scope:'memories',confirmation:'CONFIRM DELETE'}), /BACKEND_UNVERIFIED/)
    assert.equal(calls.length, 1)
  }
})
test('missing or falsified scoped capabilities fail closed', async () => {
  for (const answer of [null, {}, capability({capabilities:{scopedExports:true,scopedDeletion:false,ownerExportDownload:true}}), capability({schema:'outdated'})]) {
    const { client, calls } = harness({answer})
    await assert.rejects(client.createOperationalExportRequest(['audit']), /BACKEND_UNVERIFIED/)
    assert.equal(calls.length, 1)
  }
})
test('missing auth, project or explicit operational env blocks before any network call', async () => {
  for (const setup of [{uid:null}, {projectId:''}, {env:'canonical-account-v1'}]) {
    const { client, calls } = harness(setup)
    await assert.rejects(client.createOperationalExportRequest(['audit']), /UNVERIFIED/)
    assert.equal(calls.length, 0)
  }
})
test('verified operational backend preserves exact requested scopes and confirmation', async () => {
  const { client, calls } = harness()
  await client.createOperationalExportRequest(['consent','audit'], 'export-safe-1234')
  await client.createOperationalDeletionRequest({scope:'memories',confirmation:'CONFIRM DELETE',operationId:'delete-safe-1234'})
  await client.getOperationalExportDownloadUrl({jobId:'synthetic-job',file:'manifest'})
  assert.deepEqual(calls.map(x=>x.name), [
    'getOperationalPrivacyCapabilities','createExportRequest',
    'getOperationalPrivacyCapabilities','createDeletionRequest',
    'getOperationalPrivacyCapabilities','getExportDownloadUrl',
  ])
  assert.deepEqual(calls[1].payload,{scopes:['consent','audit'],operationId:'export-safe-1234'})
  assert.deepEqual(calls[3].payload,{scope:'memories',confirmation:'CONFIRM DELETE',operationId:'delete-safe-1234'})
  assert.deepEqual(calls[5].payload,{jobId:'synthetic-job',file:'manifest'})
})

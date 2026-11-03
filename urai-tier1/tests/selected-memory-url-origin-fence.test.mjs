import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Run the maintained canonical memory parser itself, not a lookalike validator.
const source = fs.readFileSync(new URL('../src/spatial/memory/selectedMemoryContract.ts', import.meta.url), 'utf8')
const transpiled = ts.transpileModule(source, {
  fileName: 'selectedMemoryContract.ts', reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
})
assert.equal(transpiled.diagnostics?.length ?? 0, 0)
const module = { exports: {} }
vm.runInNewContext(transpiled.outputText, { module, exports: module.exports, URL, URLSearchParams }, {
  filename: 'selectedMemoryContract.ts',
})
const { isTrustedMemoryMediaUrl, parseSelectedMemory, buildExplicitDemoMemory } = module.exports
const bucket = 'urai-4dc1d.appspot.com'
const firebase = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/private%2Fphoto.jpg?alt=media`
const google = `https://storage.googleapis.com/${bucket}/private/photo.jpg?X-Goog-Signature=synthetic`
const vhost = `https://${bucket}.storage.googleapis.com/private/photo.jpg`

for (const [description, url] of [
  ['userinfo in Firebase Storage URL', `https://synthetic-user:synthetic-pass@firebasestorage.googleapis.com/v0/b/${bucket}/o/private%2Fphoto.jpg`],
  ['userinfo in Google Storage virtual-host URL', `https://synthetic-user:synthetic-pass@${bucket}.storage.googleapis.com/private/photo.jpg`],
  ['nonstandard Firebase Storage TLS port', `https://firebasestorage.googleapis.com:8443/v0/b/${bucket}/o/private%2Fphoto.jpg`],
  ['nonstandard Google Storage TLS port', `https://storage.googleapis.com:8443/${bucket}/private/photo.jpg`],
  ['nonstandard virtual-host TLS port', `https://${bucket}.storage.googleapis.com:8443/private/photo.jpg`],
]) {
  test(`trusted private media denies ${description}`, () => {
    assert.equal(isTrustedMemoryMediaUrl(url, bucket), false, 'only the canonical HTTPS Storage origins may be trusted')
  })
}

test('canonical HTTPS bucket origins and legitimate query signatures remain available', () => {
  for (const url of [firebase, google, vhost]) {
    assert.equal(isTrustedMemoryMediaUrl(url, bucket), true)
  }
  assert.equal(isTrustedMemoryMediaUrl('https://foreign.invalid/photo', bucket), false)
})

test('selected memory and Replay do not inherit credentialed or foreign-port media URLs', () => {
  const dangerous = `https://synthetic-user:synthetic-pass@storage.googleapis.com:8443/${bucket}/private/photo.jpg`
  const raw = { ...buildExplicitDemoMemory('synthetic-memory'), ownerId: 'synthetic-owner', demo: false, consentState: 'authorized',
    sourceMedia: [{ kind: 'image', url: dangerous }],
    replayManifest: { ...buildExplicitDemoMemory('synthetic-memory').replayManifest, audioUrl: dangerous },
  }
  const result = parseSelectedMemory(raw, 'synthetic-owner', 'synthetic-memory', bucket)
  assert.equal(result.status, 'ready')
  assert.deepEqual(Array.from(result.memory.sourceMedia), [])
  assert.equal(result.memory.replayManifest.audioUrl, undefined)
})

test('private memory requires explicit authorized consent state before admitting data', () => {
  for (const consentState of [undefined, null, 'unknown', 'inactive', false, 'pending', 'revoked']) {
    const raw = { ...buildExplicitDemoMemory('synthetic-memory'), ownerId: 'synthetic-owner', demo: false,
      consentState, title: 'unverified synthetic personal content' }
    const selected = parseSelectedMemory(raw, 'synthetic-owner', 'synthetic-memory', bucket)
    assert.equal(selected.status, 'unauthorized', `invalid consent state ${String(consentState)}`)
    assert.equal(selected.memory, null)
  }
  const authorized = { ...buildExplicitDemoMemory('synthetic-memory'), ownerId: 'synthetic-owner', demo: false, consentState: 'authorized' }
  assert.equal(parseSelectedMemory(authorized, 'synthetic-owner', 'synthetic-memory', bucket).status, 'ready')
})

'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')
const entry = fs.readFileSync(path.join(__dirname, '../src/memoryMedia.ts'), 'utf8')
const index = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8')
const ast = ts.createSourceFile('memoryMedia.ts', entry, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const check = (needle) => assert.ok(entry.includes(needle), 'missing exact activation guard: ' + needle)
test('private activation source is parseable and exported by maintained Functions entry', () => {
  assert.equal(ast.parseDiagnostics.length, 0)
  assert.match(index, /activateFirstPrivateMemory/)
  check("export const activateFirstPrivateMemory = functions.https.onCall")
})
test('private activation cannot run as a file upload side-effect or without a second explicit confirmation', () => {
  check("value.confirmPrivateReplay !== true")
  check("Object.keys(value).length !== allowed.length")
  check("m.privacy !== 'hidden'")
  check("privacy: 'private'")
})
test('ready media registration, fixed source and C1 must still match at private promotion', () => {
  for(const phrase of ["readOwner(transaction, uid, memoryId)", "receipt(ready.data(), uid)",
    "sameAuthority(r, authority)", "r.state !== 'ready'", "r.sha256 !== expectedSha256",
    "r.byteLength !== source.derivativeByteLength", "recorded.canonicalConsentReceiptHash !== authority.consentReceiptHash",
    "authority.consentExpiresAt <= Date.now()", "await requireAuthentication()"]) check(phrase)
})
test('private playback activation requires both world consumer grants and current enforcement', () => {
  for(const phrase of ["policy.get('domains.memory.mode') !== 'granted'",
    "policy.get('domains.memory.lifeMapVisible') !== true",
    "policy.get('domains.memory.replayVisible') !== true",
    "policy.get('enforcement.state') !== 'fully-enforced'"]) check(phrase)
})
test('activation does not set public sharing or carry private source bytes into response', () => {
  const fn = entry.slice(entry.indexOf('export const activateFirstPrivateMemory ='))
  assert.doesNotMatch(fn, /shareable|base64|publicUrl|downloadUrl|signedUrl|storage\.bucket/)
  assert.match(fn, /transaction\.update\(authority\.memory\.ref/)
})

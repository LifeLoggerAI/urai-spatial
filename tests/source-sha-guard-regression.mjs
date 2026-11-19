import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const config = pathToFileURL(resolve('urai-tier1/next.config.mjs')).href
const sha = '4ba1f7a6200bdbeff2dd0953cbb98e786c58ca46'
const stale = '791bd415030b2755030134dff41908af9de10e7d'
const scratch = mkdtempSync(join(tmpdir(), 'urai-source-guard-'))
const attestation = join(scratch, 'self-asserted.json')
writeFileSync(attestation, JSON.stringify({
  protocol: 'urai-r1545-source-attestation-v2',
  reviewedSourceDelta: ['urai-tier1/next.config.mjs'],
  applicationSourceEquivalent: true,
  deployedSourceCommit: sha,
  deployedSourceTree: '9f221e140255fa8d715507b4fe03831b70056533',
  testedApplicationCommit: '66bbc19837a33f0f6017b9dd2362f3d74e2dd800',
  testedApplicationTree: '42ec0c4cb2607d541aaf4b46a54cab29a88b31d7',
  productionPromotion: 'forbidden', privateMemoryWrites: 'disabled',
}))
process.on('exit', () => rmSync(scratch, { recursive: true, force: true }))

function load(env) {
  return spawnSync(process.execPath, ['--input-type=module', '-e',
    `const { default: config } = await import(${JSON.stringify(config)}); console.log(JSON.stringify(await config.headers?.() ?? []))`,
  ], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' })
}

for (const [name, env] of [
  ['matching Git source', { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: sha, NEXT_PUBLIC_URAI_BUILD_SHA: sha }],
  ['explicit local enforcement matches', { URAI_ENFORCE_SOURCE_SHA_MATCH: 'true', VERCEL_GIT_COMMIT_SHA: sha, NEXT_PUBLIC_URAI_BUILD_SHA: sha }],
  ['ordinary local development', {}],
]) {
  test(name, () => {
    const result = load(env)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout)[0].headers, [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
    ])
  })
}

for (const [name, overrides] of [
  ['stale advertised SHA', { NEXT_PUBLIC_URAI_BUILD_SHA: stale }],
  ['missing provider SHA', { VERCEL_GIT_COMMIT_SHA: '' }],
  ['malformed provider SHA', { VERCEL_GIT_COMMIT_SHA: 'invalid' }],
  ['missing advertised SHA', { NEXT_PUBLIC_URAI_BUILD_SHA: '' }],
  ['malformed advertised SHA', { NEXT_PUBLIC_URAI_BUILD_SHA: 'invalid' }],
  ['self-authored attestation and missing provider', { VERCEL_GIT_COMMIT_SHA: '', URAI_NON_GIT_SOURCE_ATTESTATION_PATH: attestation }],
  ['self-authored attestation and stale label', { VERCEL_GIT_COMMIT_SHA: '', NEXT_PUBLIC_URAI_BUILD_SHA: stale, URAI_NON_GIT_SOURCE_ATTESTATION_PATH: attestation }],
  ['malformed Git identity cannot downgrade', { VERCEL_GIT_COMMIT_SHA: 'invalid', URAI_NON_GIT_SOURCE_ATTESTATION_PATH: attestation }],
  ['missing label cannot downgrade', { NEXT_PUBLIC_URAI_BUILD_SHA: '', URAI_NON_GIT_SOURCE_ATTESTATION_PATH: attestation }],
  ['production cannot use self-authored attestation', { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_SHA: '', URAI_NON_GIT_SOURCE_ATTESTATION_PATH: attestation }],
  ['local enforcement cannot use self-authored attestation', { VERCEL: '', URAI_ENFORCE_SOURCE_SHA_MATCH: 'true', VERCEL_GIT_COMMIT_SHA: '', URAI_NON_GIT_SOURCE_ATTESTATION_PATH: attestation }],
]) {
  test(`rejects ${name}`, () => {
    const result = load({ VERCEL: '1', VERCEL_GIT_COMMIT_SHA: sha, NEXT_PUBLIC_URAI_BUILD_SHA: sha, ...overrides })
    assert.notEqual(result.status, 0, 'invalid source evidence was accepted')
    assert.match(result.stderr, /URAI_SOURCE_(SHA_MISMATCH|ATTESTATION_REQUIRED)/)
  })
}

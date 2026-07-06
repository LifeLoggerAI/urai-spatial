import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const versions = [
  { version: 'v1', expected: 53, prefix: 'assets/urai/' },
  { version: 'v2', expected: 80, prefix: 'assets/urai/v2/' },
  { version: 'v3', expected: 14, prefix: 'assets/urai/v3/' },
  { version: 'v4', expected: 39, prefix: 'assets/urai/xr/' },
  { version: 'v5', expected: 27, prefix: 'assets/urai/v5/' },
]

const safeCanonicalPath = /^[A-Za-z0-9_./-]+$/

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

function variable(name) {
  return `--urai-asset-${name.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`
}

test('canonical V1-V5 manifests remain structurally valid before and after provider drop-in', async () => {
  for (const contract of versions) {
    const source = await read(`../public/assets/urai/final/manifests/${contract.version}-asset-factory-spatial-handoff.json`)
    const manifest = JSON.parse(source)

    assert.equal(manifest.schemaVersion, '3.0.0')
    assert.equal(manifest.version, contract.version)
    if (manifest.expectedOutputs !== undefined) {
      assert.equal(manifest.expectedOutputs, contract.expected)
    }
    assert.equal(Number.isSafeInteger(manifest.ready), true)
    assert.equal(Number.isSafeInteger(manifest.missing), true)
    assert.equal(manifest.ready + manifest.missing, contract.expected)
    assert.equal(Array.isArray(manifest.assets), true)
    assert.equal(manifest.assets.length, manifest.ready)

    const names = new Set()
    const paths = new Set()
    const variableKeys = new Set()
    for (const asset of manifest.assets) {
      assert.equal(asset.status, 'ready')
      assert.equal(asset.renderer, 'provider')
      assert.equal(typeof asset.name, 'string')
      assert.ok(asset.name.trim().length > 0)
      assert.equal(asset.name, asset.name.trim())
      assert.equal(typeof asset.canonicalPath, 'string')
      assert.match(asset.canonicalPath, safeCanonicalPath)
      assert.equal(asset.canonicalPath.startsWith('/'), false)
      assert.equal(asset.canonicalPath.includes('..'), false)
      assert.equal(asset.canonicalPath.split('/').some((part) => part.length === 0), false)
      assert.ok(asset.canonicalPath.startsWith(contract.prefix))
      assert.match(asset.sha256, /^[a-f0-9]{64}$/i)
      assert.equal(Number.isSafeInteger(asset.bytes), true)
      assert.ok(asset.bytes > 0)
      assert.equal(names.has(asset.name), false, `duplicate asset name: ${asset.name}`)
      assert.equal(paths.has(asset.canonicalPath), false, `duplicate canonical path: ${asset.canonicalPath}`)

      const key = variable(asset.name)
      assert.notEqual(key, '--urai-asset-')
      assert.equal(variableKeys.has(key), false, `colliding CSS asset variable: ${key}`)
      names.add(asset.name)
      paths.add(asset.canonicalPath)
      variableKeys.add(key)
    }
  }
})

test('canonical asset activation fails closed and fully cleans document state', async () => {
  const source = await read('../src/app/CanonicalAssetGates.tsx')

  for (const contract of versions) {
    assert.match(source, new RegExp(`version: '${contract.version}'`))
    assert.match(source, new RegExp(`expectedOutputs: ${contract.expected}`))
  }

  assert.match(source, /schemaVersion === '3\.0\.0'/)
  assert.match(source, /asset\.renderer !== 'provider'/)
  assert.match(source, /safeCanonicalPath\.test\(asset\.canonicalPath\)/)
  assert.match(source, /assetNames\.has\(asset\.name\)/)
  assert.match(source, /canonicalPaths\.has\(asset\.canonicalPath\)/)
  assert.match(source, /variableKeys\.has\(key\)/)
  assert.match(source, /\^\[a-f0-9\]\{64\}\$\/i/)
  assert.match(source, /Number\.isSafeInteger\(asset\.bytes\)/)
  assert.match(source, /asset\.canonicalPath\.includes\('\.\.'\)/)
  assert.match(source, /if \(controller\.signal\.aborted\) return/)
  assert.match(source, /root\.classList\.remove\(check\.className\)/)
  assert.match(source, /delete root\.dataset\[check\.dataKey\]/)
  assert.match(source, /root\.dataset\[check\.dataKey\] = 'fallback'/)
  assert.match(source, /root\.dataset\[check\.dataKey\] = 'ready'/)
})

test('V5 visual wiring cannot activate without the verified ready class', async () => {
  const css = await read('../src/app/v5-becoming-asset-wiring.css')
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*--urai-v5-[^{}]*)\}/g)]
  assert.ok(blocks.length > 0)
  for (const block of blocks) assert.match(block[1], /html\.urai-v5-assets-ready/)

  for (const variableName of [
    '--urai-v5-life-layer',
    '--urai-v5-global-weather',
    '--urai-v5-autonomous-city',
    '--urai-v5-memory-universe',
    '--urai-v5-identity-vault',
    '--urai-v5-cross-device',
    '--urai-v5-legacy-archive',
    '--urai-v5-final-orb',
  ]) {
    assert.ok(css.includes(variableName), `missing V5 wiring variable: ${variableName}`)
  }
})

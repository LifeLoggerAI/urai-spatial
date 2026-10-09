import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { ANDROID_GRADLE_INTEGRITY, prepareAndroidGradleIntegrity } from '../../scripts/prepare-native-gradle-integrity.mjs'

// Resolve the real declared Android consumer, rather than a root/tier1 package
// that does not declare @capacitor/cli in the frozen workspace graph.
const require = createRequire(new URL('../../distribution/android-shell/package.json', import.meta.url))
const cli = require.resolve('@capacitor/cli/package.json')
assert.equal(JSON.parse(await fs.readFile(cli, 'utf8')).version, '8.5.2')
const archive = gunzipSync(await fs.readFile(path.join(path.dirname(cli), 'assets/android-template.tar.gz')))
function vendorFile(suffix) {
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512)
    const name = header.subarray(0, 100).toString().replace(/\0.*$/, '')
    if (!name) break
    const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim() || '0', 8)
    if (name.endsWith(suffix)) return Buffer.from(archive.subarray(offset + 512, offset + 512 + size))
    offset += 512 + Math.ceil(size / 512) * 512
  }
  throw new Error(`Pinned vendor template lacks ${suffix}`)
}
const vendorProperties = vendorFile('gradle/wrapper/gradle-wrapper.properties')
const vendorJar = vendorFile('gradle/wrapper/gradle-wrapper.jar')
async function fixture(run) {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), 'urai-native-gradle-integrity-'))
  const wrapper = path.join(project, 'gradle/wrapper')
  try {
    await fs.mkdir(wrapper, { recursive: true })
    await fs.writeFile(path.join(wrapper, 'gradle-wrapper.properties'), vendorProperties)
    await fs.writeFile(path.join(wrapper, 'gradle-wrapper.jar'), vendorJar)
    await run(project, wrapper)
  } finally { await fs.rm(project, { recursive: true, force: true }) }
}

test('actual integrity-pinned Capacitor8.5.2 wrapper is the published Gradle8.14.3 JAR and ALL distribution', async () => {
  assert.equal(createHash('sha256').update(vendorJar).digest('hex'), ANDROID_GRADLE_INTEGRITY.wrapperJarSha256)
  assert.equal(vendorJar.length, 43764)
  assert.match(vendorProperties.toString(), /gradle-8\.14\.3-all\.zip/)
  assert.doesNotMatch(vendorProperties.toString(), /distributionSha256Sum/)
  await fixture(async (project, wrapper) => {
    const receipt = await prepareAndroidGradleIntegrity(project)
    const after = await fs.readFile(path.join(wrapper, 'gradle-wrapper.properties'), 'utf8')
    assert.equal(after, vendorProperties.toString() + `distributionSha256Sum=${ANDROID_GRADLE_INTEGRITY.distributionSha256}\n`)
    assert.equal(receipt.distributionChecksumAdded, true)
    assert.equal(receipt.signingPerformed, false)
    assert.equal(receipt.releaseAccepted, false)
    const repeated = await prepareAndroidGradleIntegrity(project)
    assert.equal(repeated.distributionChecksumAdded, false)
    assert.equal(await fs.readFile(path.join(wrapper, 'gradle-wrapper.properties'), 'utf8'), after)
    assert.equal(createHash('sha256').update(await fs.readFile(path.join(wrapper, 'gradle-wrapper.jar'))).digest('hex'), ANDROID_GRADLE_INTEGRITY.wrapperJarSha256)
  })
})

const invalidProperties = [
  ['different transport', text => text.replace('https\\:', 'http\\:')],
  ['different origin', text => text.replace('services.gradle.org', 'unsupported.invalid')],
  ['different version', text => text.replace('8.14.3-all', '8.14.4-all')],
  ['different artifact', text => text.replace('-all.zip', '-bin.zip')],
  ['disabled URL validation', text => text.replace('validateDistributionUrl=true', 'validateDistributionUrl=false')],
  ['unbounded timeout', text => text.replace('networkTimeout=10000', 'networkTimeout=0')],
  ['wrong existing checksum', text => text + `distributionSha256Sum=${'0'.repeat(64)}\n`],
  ['duplicate key', text => text + 'distributionBase=GRADLE_USER_HOME\n'],
  ['missing key', text => text.replace('zipStoreBase=GRADLE_USER_HOME\n', '')],
  ['unknown extra property', text => text + 'distributionPathOverride=other\n'],
  ['Unicode key alias', text => text.replace('distributionUrl=', 'distribution\\u0055rl=')],
  ['alternate separator', text => text.replace('distributionBase=', 'distributionBase:')],
  ['continuation line', text => text.replace('distributionUrl=', 'distributionUrl=\\\n')],
  ['invalid UTF8', text => Buffer.concat([Buffer.from(text), Buffer.from([0xff])])],
]
for (const [label, mutate] of invalidProperties) {
  test(`rejects ${label} without rewriting an unadmitted wrapper`, async () => fixture(async (project, wrapper) => {
    const properties = path.join(wrapper, 'gradle-wrapper.properties')
    await fs.writeFile(properties, mutate(vendorProperties.toString()))
    const before = await fs.readFile(properties)
    await assert.rejects(prepareAndroidGradleIntegrity(project))
    assert.deepEqual(await fs.readFile(properties), before)
    assert.deepEqual((await fs.readdir(wrapper)).sort(), ['gradle-wrapper.jar', 'gradle-wrapper.properties'])
  }))
}
test('rejects a changed actual wrapper JAR before writing a distribution pin', async () => fixture(async (project, wrapper) => {
  const jar = Buffer.from(vendorJar); jar[12] ^= 1
  await fs.writeFile(path.join(wrapper, 'gradle-wrapper.jar'), jar)
  await assert.rejects(prepareAndroidGradleIntegrity(project), /WRAPPER_JAR_CHECKSUM_MISMATCH/)
  assert.deepEqual(await fs.readFile(path.join(wrapper, 'gradle-wrapper.properties')), vendorProperties)
}))
test('refuses wrapper properties symlinks without modifying their target', async () => fixture(async (project, wrapper) => {
  const target = path.join(project, 'untouched.properties')
  await fs.writeFile(target, vendorProperties)
  await fs.rm(path.join(wrapper, 'gradle-wrapper.properties'))
  await fs.symlink(target, path.join(wrapper, 'gradle-wrapper.properties'))
  await assert.rejects(prepareAndroidGradleIntegrity(project))
  assert.deepEqual(await fs.readFile(target), vendorProperties)
}))
test('both native workflows execute integrity verification and tests before Gradle without adding signing authority', async () => {
  for (const name of ['android-package-prep.yml', 'android-governed-signing-prep.yml']) {
    const source = await fs.readFile(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8')
    assert.ok(source.includes('node --test urai-tier1/tests/native-gradle-integrity.test.mjs'))
    assert.ok(source.includes('node ../../scripts/prepare-native-gradle-integrity.mjs --android-project android'))
    const generation = source.slice(source.indexOf('      - name: Generate and sync Android project'), source.indexOf('      - name: Apply governed Android version'))
    assert.ok(generation.includes('set -euo pipefail'))
    assert.ok(generation.indexOf('set -euo pipefail') < generation.indexOf('prepare-native-gradle-integrity.mjs'))
    assert.ok(source.indexOf('prepare-native-gradle-integrity.mjs --android-project') < source.indexOf('run: ./gradlew bundleRelease'))
    assert.ok(source.includes('--workflow-run-id "$GITHUB_RUN_ID" --verify-only'))
  }
})

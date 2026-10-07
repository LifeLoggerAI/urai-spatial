import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { prepareNativeStaticProvenance } from '../../scripts/prepare-native-static-provenance.mjs'

const sourceSha = 'a'.repeat(40)
const predecessor = 'b'.repeat(40)
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-native-provenance-'))
  fs.mkdirSync(path.join(directory, 'api/system'), { recursive: true })
  fs.writeFileSync(path.join(directory, 'index.html'), `<html data-deployed-sha="${sourceSha}"><body>UrAi</body></html>`)
  const proof = { repository: 'LifeLoggerAI/urai-spatial', deploymentFreshness: { commitSha: sourceSha, commitShaKnown: true }, environment: { commitSha: sourceSha, firebaseProject: 'urai-4dc1d' } }
  fs.writeFileSync(path.join(directory, 'api/system/deploy-proof'), JSON.stringify(proof))
  return { directory, proof, options: { directory, sourceSha, platform: 'android', workflowRunId: '987' } }
}
test('native static bytes retain exact source identity and verify after shell packaging', () => {
  const { directory, options } = fixture()
  const packaged = `${directory}-packaged`
  try {
    const receipt = prepareNativeStaticProvenance(options)
    assert.equal(receipt.sourceSha, sourceSha)
    assert.equal(receipt.physicalDeviceAcceptance, false)
    fs.cpSync(directory, packaged, { recursive: true })
    assert.deepEqual(prepareNativeStaticProvenance({ ...options, directory: packaged, verifyOnly: true }), receipt)
    fs.appendFileSync(path.join(packaged, 'index.html'), '<!-- altered output -->')
    assert.throws(() => prepareNativeStaticProvenance({ ...options, directory: packaged, verifyOnly: true }), /PACKAGED_FINGERPRINT_MISMATCH/)
  } finally { fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(packaged, { recursive: true, force: true }) }
})
test('a PR merge SHA or unknown static readback cannot accept an exact-head build', () => {
  const { directory, proof, options } = fixture()
  try {
    for (const altered of [
      { ...proof, deploymentFreshness: { commitSha: predecessor, commitShaKnown: true } },
      { ...proof, environment: { ...proof.environment, commitSha: predecessor } },
      { ...proof, deploymentFreshness: { commitSha: sourceSha, commitShaKnown: false } },
      { ...proof, environment: { ...proof.environment, firebaseProject: 'foreign' } },
    ]) {
      fs.writeFileSync(path.join(directory, 'api/system/deploy-proof'), JSON.stringify(altered))
      assert.throws(() => prepareNativeStaticProvenance(options), /STATIC_READBACK_MISMATCH/)
    }
    assert.equal(fs.existsSync(path.join(directory, 'native-build-fingerprint.json')), false)
  } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})
test('HTML, source, platform and run identity are required independently', () => {
  const { directory, options } = fixture()
  try {
    fs.writeFileSync(path.join(directory, 'index.html'), `<html data-deployed-sha="${predecessor}"></html>`)
    assert.throws(() => prepareNativeStaticProvenance(options), /HTML_SOURCE_MISMATCH/)
    assert.throws(() => prepareNativeStaticProvenance({ ...options, sourceSha: 'prefix' }), /EXACT_SOURCE_REQUIRED/)
    assert.throws(() => prepareNativeStaticProvenance({ ...options, platform: 'web' }), /PLATFORM_RUN_REQUIRED/)
    assert.throws(() => prepareNativeStaticProvenance({ ...options, workflowRunId: 'unknown' }), /PLATFORM_RUN_REQUIRED/)
  } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})
test('packaged stale fingerprints and symbolic links fail closed', () => {
  const { directory, options } = fixture()
  try {
    const receipt = prepareNativeStaticProvenance(options)
    fs.writeFileSync(path.join(directory, 'native-build-fingerprint.json'), JSON.stringify({ ...receipt, sourceSha: predecessor }))
    assert.throws(() => prepareNativeStaticProvenance({ ...options, verifyOnly: true }), /PACKAGED_FINGERPRINT_MISMATCH/)
    fs.renameSync(path.join(directory, 'index.html'), path.join(directory, 'source.html'))
    fs.symlinkSync('source.html', path.join(directory, 'index.html'))
    assert.throws(() => prepareNativeStaticProvenance(options), /FILE_INVALID/)
  } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})

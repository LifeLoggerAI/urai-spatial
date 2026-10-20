import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
function readRegular(file, maximumBytes) {
  const stat = fs.lstatSync(file)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) throw new Error('NATIVE_PROVENANCE_FILE_INVALID')
  return fs.readFileSync(file)
}

export function prepareNativeStaticProvenance({ directory, sourceSha, platform, workflowRunId, verifyOnly = false }) {
  if (!/^[0-9a-f]{40}$/.test(sourceSha ?? '')) throw new Error('NATIVE_PROVENANCE_EXACT_SOURCE_REQUIRED')
  if (!['android', 'ios'].includes(platform) || !/^[1-9][0-9]*$/.test(String(workflowRunId ?? ''))) throw new Error('NATIVE_PROVENANCE_PLATFORM_RUN_REQUIRED')
  const html = readRegular(path.join(directory, 'index.html'), 5 * 1024 * 1024)
  const proof = readRegular(path.join(directory, 'api/system/deploy-proof'), 64 * 1024)
  const readback = JSON.parse(proof)
  if (readback.repository !== 'LifeLoggerAI/urai-spatial' || readback.environment?.firebaseProject !== 'urai-4dc1d' || readback.deploymentFreshness?.commitSha !== sourceSha || readback.environment?.commitSha !== sourceSha || readback.deploymentFreshness?.commitShaKnown !== true) throw new Error('NATIVE_PROVENANCE_STATIC_READBACK_MISMATCH')
  const rootSha = /\bdata-deployed-sha=["']([0-9a-f]{40})["']/.exec(html.toString('utf8'))?.[1]
  if (rootSha !== sourceSha) throw new Error('NATIVE_PROVENANCE_HTML_SOURCE_MISMATCH')
  const receipt = {
    schemaVersion: 'urai-native-static-provenance-v1',
    status: 'STATIC_IDENTITY_ONLY_NATIVE_ACCEPTANCE_PENDING',
    repository: 'LifeLoggerAI/urai-spatial', sourceSha, platform,
    workflowRunId: String(workflowRunId), firebaseProject: 'urai-4dc1d', apiOrigin: 'https://urai.app',
    htmlSha256: digest(html), deployProofSha256: digest(proof),
    nativeAcceptance: false, physicalDeviceAcceptance: false, productionAcceptance: false,
  }
  const output = path.join(directory, 'native-build-fingerprint.json')
  if (verifyOnly) {
    const retained = JSON.parse(readRegular(output, 64 * 1024))
    if (JSON.stringify(retained) !== JSON.stringify(receipt)) throw new Error('NATIVE_PROVENANCE_PACKAGED_FINGERPRINT_MISMATCH')
  } else {
    if (fs.existsSync(output)) {
      const stat = fs.lstatSync(output)
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('NATIVE_PROVENANCE_FILE_INVALID')
    }
    fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`)
  }
  return receipt
}

function main() {
  const options = {}
  const keys = { '--directory': 'directory', '--source-sha': 'sourceSha', '--platform': 'platform', '--workflow-run-id': 'workflowRunId' }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index++) {
    const option = args[index]
    if (option === '--verify-only' && !options.verifyOnly) { options.verifyOnly = true; continue }
    if (!keys[option] || options[keys[option]] !== undefined || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('NATIVE_PROVENANCE_OPTION_INVALID')
    options[keys[option]] = args[++index]
  }
  console.log(JSON.stringify(prepareNativeStaticProvenance(options), null, 2))
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) { console.error(error.message); process.exitCode = 1 }
}

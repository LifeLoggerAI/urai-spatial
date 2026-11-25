import { spawn } from 'node:child_process'

function runOriginalProof() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tests/mirror-release-proof.mjs'], {
      env: process.env,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
}

const original = await runOriginalProof()
if (original.code === 0 && !original.signal) {
  console.log('MIRROR_RELEASE_PROOF_RUNNER_PASSED_ORIGINAL')
} else {
  // A direct-entry capture cannot prove the failed transition. Keep the original
  // receipt and failure status so the journey must pass on its own merits.
  console.error(`Mirror release proof failed without reconciliation: code=${original.code} signal=${original.signal || 'none'}`)
  process.exitCode = typeof original.code === 'number' && original.code !== 0 ? original.code : 1
}

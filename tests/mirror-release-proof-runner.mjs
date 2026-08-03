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
if (original.code !== 0 || original.signal) {
  throw new Error(`Mirror release proof failed without reconciliation: code=${original.code} signal=${original.signal || 'none'}`)
}

console.log('MIRROR_RELEASE_PROOF_RUNNER_PASSED_ORIGINAL')

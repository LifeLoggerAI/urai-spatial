import { spawn } from 'node:child_process'

function runBrowserLock() {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['test:e2e'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      shell: false,
    })
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 1))
  })
}

const status = await runBrowserLock()
if (status !== 0) {
  await import('./validate-spatial-lock-receipt.mjs')
}

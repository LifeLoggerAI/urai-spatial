import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, open, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Keep application and browser in one authorized network namespace.
// This runner never elevates permissions or changes the product's dependencies.
const require = createRequire(import.meta.url)
const root = path.resolve(process.env.URAI_MOTION_APP_ROOT || '.')
const output = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/motion-proof')
const port = Number(process.env.URAI_MOTION_PORT || 4173)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local proof port')
await mkdir(output, { recursive: true })
const log = await open(path.join(output, 'next-runtime.log'), 'w')
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', path.join(root, 'urai-tier1'), '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', log.fd, log.fd],
})
let serverExit = null
server.on('exit', (code, signal) => { serverExit = { code, signal } })
const base = `http://127.0.0.1:${port}`
const started = Date.now()
try {
  let ready = false
  while (Date.now() - started < 120_000) {
    if (serverExit) throw new Error(`Next server exited ${JSON.stringify(serverExit)}`)
    try { const response = await fetch(`${base}/home/?demo=1`); if (response.ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  if (!ready) throw new Error('Local baseline application did not become available')
  const warmup = { source:'real-local-HTTP-route-compile-warmup-only', applicationRoot:root, exactHead:process.env.URAI_EXACT_HEAD || null, enabled:process.env.URAI_MOTION_WARM_ROUTES === '1', routes:[], limitation:'HTTP GETs compile the real demo routes before recording. They do not navigate the recording page, alter camera state, or change runtime watchdogs.' }
  if (warmup.enabled) {
    const demo='demo=1&memoryId=demo%3Aquiet-reset&node=quiet-reset&manifestId=replay-recovery-thread'
    for (const route of ['/home/?demo=1','/life-map/?demo=1',`/focus/?${demo}`,`/replay/?${demo}`]) {
      const begin=Date.now()
      const response=await fetch(base+route,{signal:AbortSignal.timeout(120_000)})
      await response.arrayBuffer()
      warmup.routes.push({path:route,status:response.status,durationMs:Date.now()-begin})
      await writeFile(path.join(output,'route-warmup.json'),JSON.stringify(warmup,null,2)+'\n')
      if (!response.ok) throw new Error(`Actual demo route compile warmup failed ${route}: HTTP ${response.status}`)
    }
  }
  await writeFile(path.join(output,'route-warmup.json'),JSON.stringify(warmup,null,2)+'\n')
  process.env.URAI_MOTION_RUNTIME_SETUP_JSON=JSON.stringify(warmup)
  process.env.URAI_PROOF_BASE = base
  process.env.URAI_PROOF_RECORD_MOTION = '1'
  const entry = process.env.URAI_MOTION_PROOF_ENTRY || './capture-canonical-journey-proof.mjs'
  await import(new URL(entry, import.meta.url))
} catch (error) {
  await writeFile(path.join(output, 'runtime-blocker.json'), JSON.stringify({
    exactHead: process.env.URAI_EXACT_HEAD || null,
    evidenceClass: 'actual-application-runtime-attempt-no-fabricated-recording',
    startedAt: new Date(started).toISOString(),
    base, applicationRoot: root, error: error?.stack || String(error),
    browserExecutable: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || 'Playwright-default',
  }, null, 2) + '\n')
  throw error
} finally {
  server.kill('SIGTERM')
  await log.close()
}

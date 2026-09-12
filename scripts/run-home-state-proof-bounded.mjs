import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'

const finalDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-state-proof')
const timeoutMs = Number.parseInt(process.env.URAI_HOME_PROOF_ATTEMPT_TIMEOUT_MS || '', 10) || 52 * 60 * 1000
const attempts = 1

async function stopProcessGroup(child) {
  if (!child?.pid) return
  try { process.kill(-child.pid, 'SIGTERM') } catch { try { child.kill('SIGTERM') } catch {} }
  await new Promise((resolve) => setTimeout(resolve, 4_000))
  try { process.kill(-child.pid, 'SIGKILL') } catch { try { child.kill('SIGKILL') } catch {} }
}

async function retainAttempt(attemptDir, status) {
  await rm(finalDir, { recursive: true, force: true })
  await mkdir(finalDir, { recursive: true })
  await cp(attemptDir, finalDir, { recursive: true, force: true })
  await writeFile(path.join(finalDir, 'bounded-attempt-status.json'), `${JSON.stringify(status, null, 2)}\n`)
}

async function runChild(script, env) {
  const child = spawn(process.execPath, [script], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    detached: true,
  })
  return { child, result: new Promise((resolve) => {
    child.once('error', (error) => resolve({ code: 1, signal: null, error }))
    child.once('exit', (code, signal) => resolve({ code: code ?? 1, signal, error: null }))
  }) }
}

async function runAttempt(attempt) {
  const attemptDir = `${finalDir}-attempt-${attempt}`
  await rm(attemptDir, { recursive: true, force: true })
  await mkdir(attemptDir, { recursive: true })
  const attemptEnv = { ...process.env, URAI_PROOF_DIR: attemptDir }

  const original = await runChild('scripts/run-home-state-proof-v224.mjs', attemptEnv)
  let timedOut = false
  const timer = setTimeout(async () => {
    timedOut = true
    console.error(`Home state proof attempt ${attempt} exceeded ${timeoutMs}ms; terminating exact-head browser capture.`)
    await stopProcessGroup(original.child)
  }, timeoutMs)

  const result = await original.result
  clearTimeout(timer)

  if (result.error) console.error(`Home state proof attempt ${attempt} failed to start: ${result.error}`)
  const status = {
    attempt,
    exactHead: process.env.URAI_EXACT_HEAD || 'local',
    code: result.code,
    signal: result.signal ?? null,
    timedOut,
    passed: !timedOut && result.code === 0,
    reconciled: false,
  }
  await retainAttempt(attemptDir, status)

  if (!timedOut && result.code !== 0) {
    console.error(`Home state proof attempt ${attempt} failed (code=${result.code}, signal=${result.signal ?? 'none'}); testing only the exact fail-closed Orb-open reconciliation signature.`)
    const reconciliation = await runChild('scripts/reconcile-home-orb-consent-proof.mjs', attemptEnv)
    const reconciliationResult = await reconciliation.result
    if (!reconciliationResult.error && reconciliationResult.code === 0 && !reconciliationResult.signal) {
      status.passed = true
      status.reconciled = true
      status.reconciliation = 'full-production-orb-lifecycle-after-exact-orb-open-pointer-transport-timeout'
      await retainAttempt(attemptDir, status)
      console.log(`Home state proof attempt ${attempt} passed through the exact bounded Orb-open reconciliation; original failure evidence and supplemental exact-head evidence retained at ${finalDir}.`)
      return true
    }
    if (reconciliationResult.error) console.error(`Home state proof reconciliation failed to start: ${reconciliationResult.error}`)
    else console.error(`Home state proof reconciliation failed (code=${reconciliationResult.code}, signal=${reconciliationResult.signal ?? 'none'}).`)
  }

  if (timedOut || result.code !== 0) {
    console.error(`Home state proof attempt ${attempt} failed (code=${result.code}, signal=${result.signal ?? 'none'}, timedOut=${timedOut}); exact-head failure evidence retained at ${finalDir}.`)
    return false
  }

  console.log(`Home state proof attempt ${attempt} passed; exact-head evidence copied to ${finalDir}.`)
  return true
}

let passed = false
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  if (await runAttempt(attempt)) {
    passed = true
    break
  }
}

if (!passed) {
  console.error(`Home state proof failed after ${attempts} bounded attempt${attempts === 1 ? '' : 's'}.`)
  process.exitCode = 1
}

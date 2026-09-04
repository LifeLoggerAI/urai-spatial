import { cp, mkdir, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'

const finalDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-state-proof')
const timeoutMs = Number.parseInt(process.env.URAI_HOME_PROOF_ATTEMPT_TIMEOUT_MS || '', 10) || 25 * 60 * 1000
const attempts = 2

async function stopProcessGroup(child) {
  if (!child?.pid) return
  try { process.kill(-child.pid, 'SIGTERM') } catch { try { child.kill('SIGTERM') } catch {} }
  await new Promise((resolve) => setTimeout(resolve, 4_000))
  try { process.kill(-child.pid, 'SIGKILL') } catch { try { child.kill('SIGKILL') } catch {} }
}

async function runAttempt(attempt) {
  const attemptDir = `${finalDir}-attempt-${attempt}`
  await rm(attemptDir, { recursive: true, force: true })
  await mkdir(attemptDir, { recursive: true })

  const child = spawn(process.execPath, ['scripts/capture-home-state-proof.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, URAI_PROOF_DIR: attemptDir },
    stdio: 'inherit',
    detached: true,
  })

  let timedOut = false
  const timer = setTimeout(async () => {
    timedOut = true
    console.error(`Home state proof attempt ${attempt} exceeded ${timeoutMs}ms; terminating exact-head browser capture.`)
    await stopProcessGroup(child)
  }, timeoutMs)

  const result = await new Promise((resolve) => {
    child.once('error', (error) => resolve({ code: 1, signal: null, error }))
    child.once('exit', (code, signal) => resolve({ code: code ?? 1, signal, error: null }))
  })
  clearTimeout(timer)

  if (result.error) console.error(`Home state proof attempt ${attempt} failed to start: ${result.error}`)
  if (timedOut || result.code !== 0) {
    console.error(`Home state proof attempt ${attempt} failed (code=${result.code}, signal=${result.signal ?? 'none'}, timedOut=${timedOut}).`)
    return false
  }

  await mkdir(finalDir, { recursive: true })
  await cp(attemptDir, finalDir, { recursive: true, force: true })
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
  console.error(`Home state proof failed after ${attempts} bounded attempts.`)
  process.exitCode = 1
}

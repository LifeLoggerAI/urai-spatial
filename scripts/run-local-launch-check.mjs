import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import process from 'node:process'

const port = process.env.PORT ?? '3015'
const host = process.env.HOST ?? `http://127.0.0.1:${port}`
const root = process.cwd()
const launchEnv = {
  NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES: process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES ?? 'true',
  URAI_ALLOW_PUBLIC_DEMO_ROUTES: process.env.URAI_ALLOW_PUBLIC_DEMO_ROUTES ?? 'true',
}
const browserE2eEnv = {
  ...launchEnv,
  URAI_SPATIAL_BASE_URL: host,
  URAI_SPATIAL_USE_EXISTING_SERVER: 'true',
  URAI_SPATIAL_ARTIFACT_DIR: process.env.URAI_SPATIAL_ARTIFACT_DIR ?? 'artifacts/local-launch-spatial-lock',
}

const serverLogLines = []
const MAX_SERVER_LOG_LINES = 200

function rememberServerLog(chunk) {
  const lines = chunk.toString().split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    serverLogLines.push(line)
    if (serverLogLines.length > MAX_SERVER_LOG_LINES) serverLogLines.shift()
  }
}

function printRecentServerLogs() {
  if (!serverLogLines.length) {
    console.error('\n[URAI Spatial] No Next server logs captured before failure.')
    return
  }

  console.error(`\n[URAI Spatial] Last ${Math.min(serverLogLines.length, MAX_SERVER_LOG_LINES)} Next server log lines:`)
  for (const line of serverLogLines) console.error(line)
}

function candidatePnpmEntrypoints() {
  const candidates = []
  const npmExecPath = process.env.npm_execpath

  if (npmExecPath && /pnpm/i.test(npmExecPath)) {
    candidates.push(npmExecPath)
  }

  candidates.push(path.join(root, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'))
  candidates.push(path.join(root, 'node_modules', '.pnpm', 'pnpm@10.0.0', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'))

  return candidates.filter(Boolean)
}

function resolvePnpmCommand() {
  for (const entrypoint of candidatePnpmEntrypoints()) {
    if (fs.existsSync(entrypoint)) {
      return { command: process.execPath, argsPrefix: [entrypoint], displayCommand: 'pnpm' }
    }
  }

  return { command: 'pnpm', argsPrefix: [], displayCommand: 'pnpm' }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const displayCommand = options.displayCommand ?? command
    const displayArgs = options.displayArgs ?? args
    const child = spawn(command, args, {
      stdio: options.stdio ?? 'inherit',
      shell: false,
      env: { ...process.env, ...launchEnv, ...(options.env ?? {}) },
      cwd: options.cwd ?? process.cwd(),
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) resolve({ code, signal })
      else reject(new Error(`${displayCommand} ${displayArgs.join(' ')} failed with code ${code ?? signal}`))
    })
  })
}

function runPnpm(args, options = {}) {
  const pnpm = resolvePnpmCommand()
  console.log(`[URAI Spatial] $ ${pnpm.displayCommand} ${args.join(' ')}`)
  return run(pnpm.command, [...pnpm.argsPrefix, ...args], {
    ...options,
    displayCommand: pnpm.displayCommand,
    displayArgs: args,
  })
}

function runCapture(command, args, options = {}) {
  return new Promise((resolve) => {
    let output = ''
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env, ...launchEnv, ...(options.env ?? {}) },
      cwd: options.cwd ?? process.cwd(),
    })

    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
      process.stdout.write(chunk)
    })

    child.stderr.on('data', (chunk) => {
      output += chunk.toString()
      process.stderr.write(chunk)
    })

    child.on('error', (error) => resolve({ code: 1, output: String(error) }))
    child.on('exit', (code) => resolve({ code: code ?? 1, output }))
  })
}

function runPnpmCapture(args, options = {}) {
  const pnpm = resolvePnpmCommand()
  console.log(`[URAI Spatial] $ ${pnpm.displayCommand} ${args.join(' ')}`)
  return runCapture(pnpm.command, [...pnpm.argsPrefix, ...args], options)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(url, timeoutMs = 20_000) {
  const startedAt = Date.now()
  let lastError = null

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = new Error(`${url} returned ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await wait(500)
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? 'no response'}`)
}

function parsePidList(output) {
  return output
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value))
}

async function stopPort() {
  const result = await runCapture('lsof', ['-ti', `:${port}`], { stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.code !== 0) {
    console.warn(`[URAI Spatial] Could not inspect port ${port} with lsof; continuing without port cleanup.`)
    return
  }

  const pids = parsePidList(result.output)
  if (!pids.length) return

  console.log(`[URAI Spatial] Stopping existing process(es) on port ${port}: ${pids.join(', ')}`)
  const killResult = await runCapture('kill', pids)
  if (killResult.code !== 0) {
    console.warn(`[URAI Spatial] Could not stop all processes on port ${port}; continuing and letting Next report any bind error.`)
  }
  await wait(1000)
}

async function cleanNextBuild() {
  console.log('[URAI Spatial] Removing stale urai-tier1/.next build output')
  await fsp.rm('urai-tier1/.next', { recursive: true, force: true })
}

function startServer() {
  const pnpm = resolvePnpmCommand()
  const child = spawn(pnpm.command, [...pnpm.argsPrefix, '--filter', 'urai-tier1', 'exec', 'next', 'start', '-p', port], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    env: { ...process.env, ...launchEnv },
  })

  child.stdout.on('data', (chunk) => {
    rememberServerLog(chunk)
    process.stdout.write(chunk)
  })
  child.stderr.on('data', (chunk) => {
    rememberServerLog(chunk)
    process.stderr.write(chunk)
  })
  return child
}

function isPlaywrightInfraBlock(output) {
  return (
    output.includes('Playwright Chromium cannot launch') ||
    output.includes('error while loading shared libraries') ||
    output.includes('Executable doesn\'t exist') ||
    output.includes('install-deps chromium') ||
    output.includes('libglib-2.0.so.0')
  )
}

let server = null

try {
  console.log('[URAI Spatial] Local launch check starting')
  console.log(`[URAI Spatial] Smoke host: ${host}`)
  console.log('[URAI Spatial] Public demo routes enabled for local smoke only')

  await stopPort()
  await cleanNextBuild()

  await runPnpm(['check:source-integrity'])
  await runPnpm(['check:production-routes'])
  await runPnpm(['check:spatial-copy'])
  await runPnpm(['check:launch-boundary-contract'])
  await runPnpm(['check:spatial'])
  await runPnpm(['typecheck'])
  await runPnpm(['build'])

  await stopPort()
  server = startServer()
  await waitForServer(`${host}/`)
  await runPnpm(['smoke'], { env: { HOST: host } })

  const e2e = await runPnpmCapture(['test:e2e'], { env: browserE2eEnv })
  if (e2e.code !== 0) {
    if (isPlaywrightInfraBlock(e2e.output)) {
      console.warn('\n[URAI Spatial] Browser E2E blocked by local workstation Playwright/OS dependencies.')
      console.warn('[URAI Spatial] Code gates and smoke passed. Run full browser E2E in CI with pnpm playwright:ensure.')
      process.exitCode = 0
    } else {
      throw new Error('Browser E2E failed for a non-infrastructure reason.')
    }
  } else {
    console.log('[URAI Spatial] Browser E2E passed locally.')
  }

  console.log('\n[URAI Spatial] Local launch check complete.')
} catch (error) {
  printRecentServerLogs()
  throw error
} finally {
  if (server && !server.killed) server.kill('SIGTERM')
}

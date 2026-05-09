#!/usr/bin/env node
import { spawn } from 'node:child_process'

const host = process.env.HOST || 'http://127.0.0.1:3000'
const timeoutMs = Number(process.env.SMOKE_SERVER_TIMEOUT_MS || 45000)
const startedAt = Date.now()

const server = spawn('pnpm', ['start'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    PORT: '3000',
  },
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer() {
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(host, { redirect: 'manual' })
      if (response.status > 0 && response.status < 500) return
    } catch {
      // Server is still starting.
    }
    await sleep(750)
  }

  throw new Error(`Smoke server did not become reachable at ${host} within ${timeoutMs}ms.\n${serverOutput.slice(-4000)}`)
}

try {
  await waitForServer()
  const smoke = spawn('node', ['scripts/smoke-routes.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, HOST: host },
  })

  const code = await new Promise((resolve) => smoke.on('exit', resolve))
  server.kill('SIGTERM')
  process.exit(code ?? 1)
} catch (error) {
  server.kill('SIGTERM')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

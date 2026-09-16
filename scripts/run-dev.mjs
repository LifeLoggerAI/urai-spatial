import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import net from 'node:net'

const app = fileURLToPath(new URL('../urai-tier1/', import.meta.url))
const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const input = process.argv.slice(2)
const strict = input.includes('--strictPort')
const args = input.filter((arg) => arg !== '--strictPort').map((arg) => arg === '--host' ? '--hostname' : arg)
const portIndex = args.findIndex((arg) => arg === '--port' || arg === '-p')
const hostIndex = args.findIndex((arg) => arg === '--hostname' || arg === '-H')
const port = portIndex < 0 ? 3000 : Number(args[portIndex + 1])
const host = hostIndex < 0 ? '0.0.0.0' : args[hostIndex + 1]

// Next normally chooses another port when busy. Supervised previews require
// the requested port, so fail before startup instead of silently moving it.
if (strict) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(port, host, () => probe.close(resolve))
  })
}

const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...args], {
  cwd: app,
  env: process.env,
  stdio: 'inherit',
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('error', (error) => { console.error(error); process.exitCode = 1 })
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0) })

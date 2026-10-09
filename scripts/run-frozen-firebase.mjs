#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve from the reviewed candidate, including when deploying prepared rollback
// source from another working directory. This never fetches a second CLI graph.
const candidateRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const declaration = JSON.parse(readFileSync(path.join(candidateRoot, 'package.json'), 'utf8'))
const expectedVersion = declaration.devDependencies?.['firebase-tools']
if (typeof expectedVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(expectedVersion)) {
  throw new Error('Firebase CLI must have an exact candidate dependency declaration')
}
const moduleRoot = realpathSync(path.join(candidateRoot, 'node_modules'))
const packageRoot = realpathSync(path.join(moduleRoot, 'firebase-tools'))
if (!packageRoot.startsWith(`${moduleRoot}${path.sep}`)) {
  throw new Error('Firebase CLI resolves outside the installed candidate graph')
}
const installed = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
if (installed.name !== 'firebase-tools' || installed.version !== expectedVersion) {
  throw new Error('Installed Firebase CLI does not match the exact candidate declaration')
}
if (installed.bin?.firebase !== './lib/bin/firebase.js') {
  throw new Error('Installed Firebase CLI entry point is not the expected package entry')
}
const cliPath = realpathSync(path.join(packageRoot, installed.bin.firebase))
if (!cliPath.startsWith(`${packageRoot}${path.sep}`) || !lstatSync(cliPath).isFile()) {
  throw new Error('Firebase CLI entry point must remain inside its installed package')
}
const child = spawn(process.execPath, [cliPath, ...process.argv.slice(2)], {
  cwd: process.cwd(), env: process.env, stdio: 'inherit', shell: false,
})
let requestedSignal = null
const forwardSignal = (signal) => { requestedSignal = signal; child.kill(signal) }
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => forwardSignal(signal))
}
child.on('error', (error) => { console.error(`Firebase CLI failed to start: ${error.message}`); process.exitCode = 1 })
child.on('exit', (code, signal) => {
  if (signal) console.error(`Firebase CLI terminated with ${signal}`)
  process.exitCode = requestedSignal ? { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 }[requestedSignal] : code ?? 1
})

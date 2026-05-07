#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const packageJsonPath = resolve(root, 'package.json')
const lockfilePath = resolve(root, 'pnpm-lock.yaml')

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (!existsSync(packageJsonPath)) fail('package.json is missing from the repository root.')
if (!existsSync(lockfilePath)) fail('pnpm-lock.yaml is missing from the repository root.')

const lockfile = readFileSync(lockfilePath, 'utf8')
if (!lockfile.includes('lockfileVersion:')) fail('pnpm-lock.yaml does not include a lockfileVersion entry.')

console.log('Lockfile presence check passed.')

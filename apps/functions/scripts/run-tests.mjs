#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const testRoots = ['test', 'tests'].map(dir => path.resolve(dir))
const files = []

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
    } else if (entry.isFile() && /\.test\.(?:js|mjs)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
}

for (const testRoot of testRoots) walk(testRoot)
files.sort()

if (files.length === 0) {
  console.error('No Functions tests found; refusing an empty test gate.')
  process.exit(1)
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' })
process.exit(result.status ?? 1)

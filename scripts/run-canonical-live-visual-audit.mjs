#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const sourcePath = fileURLToPath(new URL('./live-visual-audit.mjs', import.meta.url))
let source = readFileSync(sourcePath, 'utf8')

const replacements = [
  ["markers: ['Your real life has a place', 'private operating world']", "markers: ['Your private workforce.', 'RECEPTION', 'ARCHIVE']"],
  ["route: '/life-map',\n    markers: ['Life Map', 'Wheel', 'Drag', 'memory star']", "route: '/life-map?node=quiet-reset&memoryId=quiet-reset',\n    markers: ['Step inside the map.', 'Focus and Replay keep the same memory identity']"],
  ["markers: ['The Quiet Reset', 'Selected memory camera chamber', 'Replay']", "markers: ['The Quiet Reset', 'The moment pressure became permission to begin again.', 'Replay']"],
  ["markers: ['World online', 'Route matrix', 'Tracked']", "markers: ['The route matrix is visible.', 'Availability and proof stay separate']"],
  ["markers: ['Step inside the Life Map', 'Quest', 'manual']", "markers: ['Explorable entry chamber', 'Enter VR in Quest']"],
  ["name: 'life-map-to-focus',\n    start: '/life-map',", "name: 'life-map-to-focus',\n    start: '/life-map?node=quiet-reset&memoryId=quiet-reset',"],
]

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Canonical audit patch target missing: ${before}`)
  }
  source = source.replace(before, after)
}

const dir = mkdtempSync(join(tmpdir(), 'urai-canonical-audit-'))
const patchedPath = join(dir, 'live-visual-audit-canonical.mjs')
writeFileSync(patchedPath, source)

const result = spawnSync(process.execPath, [patchedPath], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
})

rmSync(dir, { recursive: true, force: true })
process.exit(typeof result.status === 'number' ? result.status : 1)

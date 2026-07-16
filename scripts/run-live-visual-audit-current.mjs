import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(scriptDir, 'live-visual-audit.mjs')
const generatedPath = join(scriptDir, `.live-visual-audit-current-${process.pid}.mjs`)

const replacements = new Map([
  ["markers: ['Your real life has a place', 'private operating world']", "markers: ['Your private workforce.', 'Nothing acts without you']"],
  ["markers: ['Life Map', 'Wheel', 'Drag', 'memory star']", "markers: ['Step inside the map.', 'Focus', 'Replay']"],
  ["markers: ['The Quiet Reset', 'Selected memory camera chamber', 'Replay']", "markers: ['The Quiet Reset', 'Selected memory chamber.', 'Replay']"],
  ["markers: ['World online', 'Route matrix', 'Tracked']", "markers: ['Launch locked. Proof before expansion.', 'Tracked', 'Pending proof']"],
  ["markers: ['Step inside the Life Map', 'Quest', 'manual']", "markers: ['Explorable entry chamber', 'Enter VR in Quest', 'Desktop and mobile']"],
])

let source = readFileSync(sourcePath, 'utf8')
for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Current-canon audit wrapper could not find expected marker contract: ${before}`)
  }
  source = source.replace(before, after)
}

writeFileSync(generatedPath, source)
try {
  const result = spawnSync(process.execPath, [generatedPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  process.exitCode = result.status ?? 1
} finally {
  rmSync(generatedPath, { force: true })
}

#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const sourceRoot = process.cwd()
const manifestRelativePath = 'operations/assets/launch-critical-assets.json'
const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, manifestRelativePath), 'utf8'))
const auditRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-launch-candidate-audit-'))

try {
  const candidateManifest = {
    ...manifest,
    assets: manifest.assets.map((asset) => ({
      ...asset,
      releaseState: 'candidate-not-production-ready',
    })),
  }

  copyText(
    path.join(auditRoot, manifestRelativePath),
    JSON.stringify(candidateManifest, null, 2) + '\n',
  )

  for (const asset of manifest.assets) {
    copyFile(asset.fixedPath)
    copyCandidateReceipt(path.posix.join(manifest.receiptRoot, `${asset.id}.json`), asset.id)
  }

  const auditorPath = path.join(sourceRoot, 'scripts/audit-launch-critical-artifact.mjs')
  const result = spawnSync(process.execPath, [auditorPath], {
    cwd: auditRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  fs.rmSync(auditRoot, { recursive: true, force: true })
}

function copyFile(relativePath) {
  const source = path.join(sourceRoot, relativePath)
  const destination = path.join(auditRoot, relativePath)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(source, destination)
}

function copyCandidateReceipt(relativePath, assetId) {
  const source = path.join(sourceRoot, relativePath)
  const destination = path.join(auditRoot, relativePath)
  const receipt = JSON.parse(fs.readFileSync(source, 'utf8'))
  if (receipt.releaseState !== 'candidate-not-production-ready') {
    throw new Error(`candidate receipt ${assetId} must declare candidate-not-production-ready; found ${String(receipt.releaseState || 'missing')}`)
  }
  copyText(destination, JSON.stringify(receipt, null, 2) + '\n')
}

function copyText(destination, content) {
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, content, 'utf8')
}

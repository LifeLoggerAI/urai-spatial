#!/usr/bin/env node
// The original modeled World001 source is intentionally NOT under Next.js public/.
// This staging command exposes it locally only for an explicit development review.
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modelName = 'URAI_WORLD001_FOUNDER_HOME_ARCHITECTURE_v3.glb'
const modelRelativePath = 'assets/urai/world001-preview/' + modelName
const source = path.join(repositoryRoot, 'urai-tier1', 'dev-preview-sources', 'world001', modelName)
const publicAsset = path.join(repositoryRoot, 'urai-tier1', 'public', modelRelativePath)
const exportedAsset = path.join(repositoryRoot, 'urai-tier1', 'out', modelRelativePath)
const expectedBytes = 2742444
const expectedSha256 = '84727ed6d335b51f736194a3850d5390a3d4ab8876f07acc8bb08593c5c33717'

async function attest(file) {
  const bytes = await readFile(file)
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== expectedBytes || digest !== expectedSha256) {
    throw new Error('World001 preview asset identity mismatch at ' + file + ': bytes=' + bytes.length + ' sha256=' + digest)
  }
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error('World001 preview is not the exact valid glTF 2.0 GLB at ' + file)
  }
  return { bytes: bytes.length, sha256: digest }
}

async function execute(command) {
  if (command === 'verify-source') {
    return { command, ...(await attest(source)), classification: 'MODELED_INTERPRETIVE_NONPRODUCTION' }
  }
  if (command === 'stage') {
    if (process.env.NODE_ENV === 'production' || process.env.URAI_FIREBASE_STATIC_EXPORT === 'true' || process.env.CI === 'true' && process.env.URAI_V3_DEV_BROWSER_PROOF !== 'true') {
      throw new Error('World001 candidate staging is forbidden outside an explicitly authorized development browser session')
    }
    await attest(source)
    await mkdir(path.dirname(publicAsset), { recursive: true })
    await rm(publicAsset, { force: true })
    await copyFile(source, publicAsset)
    return { command, ...(await attest(publicAsset)), publicServedInExplicitDevelopmentSession: true }
  }
  if (command === 'clean') {
    await rm(publicAsset, { force: true })
    return { command, publicAssetAbsent: !existsSync(publicAsset) }
  }
  if (command === 'assert-excluded' || command === 'assert-build-excluded') {
    if (existsSync(publicAsset)) throw new Error('Release guard: staged World001 preview binary remains in public/: ' + publicAsset)
    if (command === 'assert-build-excluded' && existsSync(exportedAsset)) {
      throw new Error('Release guard: World001 preview binary was distributed in static output: ' + exportedAsset)
    }
    return { command, publicAssetAbsent: true, ...(command === 'assert-build-excluded' ? { exportedAssetAbsent: true } : {}) }
  }
  throw new Error('Usage: node scripts/world001-v3-preview-asset.mjs verify-source|stage|clean|assert-excluded|assert-build-excluded')
}

try {
  console.log(JSON.stringify({ schemaVersion: 'urai-world001-v3-dev-asset-guard-1', ...(await execute(process.argv[2])) }))
} catch (error) {
  console.error(String(error?.stack || error))
  process.exitCode = 1
}

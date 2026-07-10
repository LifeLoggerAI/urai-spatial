#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, normalize, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const assetRoot = join(root, 'urai-tier1', 'public', 'assets', 'urai')
const receiptPath = join(root, 'docs', 'final-asset-receipt.md')
const handoffPath = join(assetRoot, 'final', 'manifests', 'asset-factory-spatial-handoff.json')
const errors = []

if (!existsSync(receiptPath)) errors.push('Missing docs/final-asset-receipt.md. Run receipt:assets first.')
if (!existsSync(handoffPath)) errors.push('Missing canonical provider handoff manifest.')

const receipt = existsSync(receiptPath) ? readFileSync(receiptPath, 'utf8') : ''
const placeholderMatch = receipt.match(/Placeholder-final core assets:\s*(\d+)/)
const providerMatch = receipt.match(/Provider-final core assets:\s*(\d+)/)
const requiredMatch = receipt.match(/Core launch assets checked:\s*(\d+)/)
const missingMatch = receipt.match(/Core launch assets missing:\s*(\d+)/)

const placeholders = Number(placeholderMatch?.[1] ?? Number.NaN)
const providerFinal = Number(providerMatch?.[1] ?? Number.NaN)
const required = Number(requiredMatch?.[1] ?? Number.NaN)
const missing = Number(missingMatch?.[1] ?? Number.NaN)

if (![placeholders, providerFinal, required, missing].every(Number.isSafeInteger)) {
  errors.push('Receipt is missing strict production counts.')
} else {
  if (missing !== 0) errors.push(`${missing} core launch assets are missing.`)
  if (placeholders !== 0) errors.push(`${placeholders} placeholder-final core assets remain.`)
  if (providerFinal !== required) errors.push(`Only ${providerFinal}/${required} core assets are provider-final.`)
}

if (existsSync(handoffPath)) {
  let handoff
  try {
    handoff = JSON.parse(readFileSync(handoffPath, 'utf8'))
  } catch (error) {
    errors.push(`Provider handoff is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  const assets = Array.isArray(handoff?.assets) ? handoff.assets : []
  const seenPaths = new Set()
  const seenNames = new Set()

  for (const [index, asset] of assets.entries()) {
    const label = `handoff asset ${index + 1}`
    if (asset?.status !== 'ready') errors.push(`${label}: status must be ready.`)
    if (asset?.renderer !== 'provider') errors.push(`${label}: renderer must be provider.`)
    if (typeof asset?.name !== 'string' || !asset.name.trim()) errors.push(`${label}: name is required.`)
    else if (seenNames.has(asset.name)) errors.push(`${label}: duplicate name ${asset.name}.`)
    else seenNames.add(asset.name)

    if (typeof asset?.canonicalPath !== 'string' || !asset.canonicalPath.startsWith('assets/urai/')) {
      errors.push(`${label}: canonicalPath must start with assets/urai/.`)
      continue
    }
    if (asset.canonicalPath.startsWith('/') || asset.canonicalPath.includes('..') || asset.canonicalPath.includes('\\')) {
      errors.push(`${label}: unsafe canonicalPath ${asset.canonicalPath}.`)
      continue
    }
    if (seenPaths.has(asset.canonicalPath)) errors.push(`${label}: duplicate canonicalPath ${asset.canonicalPath}.`)
    else seenPaths.add(asset.canonicalPath)

    const relativeAssetPath = asset.canonicalPath.replace(/^assets\/urai\//, '')
    const absolutePath = resolve(assetRoot, normalize(relativeAssetPath))
    const rootPrefix = resolve(assetRoot) + sep
    if (!absolutePath.startsWith(rootPrefix)) {
      errors.push(`${label}: path escapes canonical asset root.`)
      continue
    }
    if (!existsSync(absolutePath)) {
      errors.push(`${label}: missing file ${relative(root, absolutePath)}.`)
      continue
    }

    const bytes = readFileSync(absolutePath)
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || asset.bytes !== bytes.length) {
      errors.push(`${label}: byte receipt mismatch for ${asset.canonicalPath}.`)
    }
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    if (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(asset.sha256) || asset.sha256.toLowerCase() !== sha256) {
      errors.push(`${label}: SHA-256 mismatch for ${asset.canonicalPath}.`)
    }
  }
}

const report = {
  ok: errors.length === 0,
  mode: 'strict-production',
  coreRequired: Number.isSafeInteger(required) ? required : null,
  providerFinal: Number.isSafeInteger(providerFinal) ? providerFinal : null,
  placeholderFinal: Number.isSafeInteger(placeholders) ? placeholders : null,
  missing: Number.isSafeInteger(missing) ? missing : null,
  errors,
}

console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1

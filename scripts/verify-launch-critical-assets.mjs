#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'operations/assets/launch-critical-assets.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const errors = []
const results = []

for (const asset of manifest.assets) {
  const assetPath = path.join(root, asset.fixedPath)
  // Production assets use promoted receipts; generated receipts preserve old candidates.
  const isPromoted = asset.releaseState === 'production-ready'
  const receiptRelative = isPromoted
    ? path.join('operations/assets/production-receipts', asset.id + '.json')
    : path.join(manifest.receiptRoot, asset.id + '.json')
  const receiptPath = path.join(root, receiptRelative)

  if (!fs.existsSync(assetPath)) {
    errors.push(`${asset.id}: missing asset ${asset.fixedPath}`)
    continue
  }
  if (!fs.existsSync(receiptPath)) {
    errors.push(`${asset.id}: missing receipt ${path.relative(root, receiptPath)}`)
    continue
  }

  const bytes = fs.readFileSync(assetPath)
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')

  if (receipt.sha256 !== sha256) errors.push(`${asset.id}: receipt SHA-256 does not match file`)
  if (receipt.bytes !== bytes.length) errors.push(`${asset.id}: receipt byte count does not match file`)
  if (!asset.fallback) errors.push(`${asset.id}: fallback is required`)
  if (!asset.source || !asset.license) errors.push(`${asset.id}: source and license are required`)
  if (asset.maxBytes && bytes.length > asset.maxBytes) errors.push(`${asset.id}: ${bytes.length} bytes exceeds ${asset.maxBytes}`)
  if (asset.kind === 'model' && receipt.measured?.triangleCount > asset.maxTriangles) {
    errors.push(`${asset.id}: ${receipt.measured.triangleCount} triangles exceeds ${asset.maxTriangles}`)
  }

  if (receipt.fixedPath !== asset.fixedPath) errors.push(asset.id + ': receipt asset path mismatch')
  if (isPromoted) {
    if (receipt.releaseState !== 'production-ready') errors.push(asset.id + ': production-ready manifest requires production-ready receipt')
    if (receipt.source !== asset.source || receipt.license !== asset.license) errors.push(asset.id + ': production source/license mismatch')
    if (receipt.deploymentAuthorized !== true || receipt.visualAcceptance?.accepted !== true) errors.push(asset.id + ': missing production acceptance')
    const decisionPath = path.join(root, 'operations/assets/promotion-decisions', asset.id + '.json')
    if (!fs.existsSync(decisionPath)) {
      errors.push(asset.id + ': missing governed promotion decision')
    } else {
      const decision = JSON.parse(fs.readFileSync(decisionPath, 'utf8'))
      if (decision.receiptPath !== receiptRelative || decision.canonicalPath !== asset.fixedPath ||
          decision.sha256 !== sha256 || decision.bytes !== bytes.length ||
          decision.fallback !== asset.fallback || decision.promote !== true ||
          decision.humanReviewApproved !== true || decision.visualProofVerified !== true ||
          decision.licenseApproved !== true || !decision.reviewer || !decision.producer ||
          decision.reviewer === decision.producer) {
        errors.push(asset.id + ': promotion decision does not authorize exact asset and receipt')
      }
    }
  }

  const receiptReleaseState = String(receipt.releaseState || '').trim()
  const receiptCompressionStatus = String(receipt.compressionStatus || '').trim()
  if (!receiptReleaseState) errors.push(`${asset.id}: receipt release state is required`)
  if (!receiptCompressionStatus) errors.push(`${asset.id}: receipt compression status is required`)
  if (receiptReleaseState === 'production-ready' && receiptCompressionStatus.includes('candidate')) {
    errors.push(`${asset.id}: receipt cannot be production-ready with candidate compression status`)
  }

  results.push({
    id: asset.id,
    path: asset.fixedPath,
    receiptPath: receiptRelative,
    bytes: bytes.length,
    sha256,
    compressionStatus: receiptCompressionStatus,
    manifestReleaseState: asset.releaseState,
    receiptReleaseState,
    measured: receipt.measured,
  })
}

const report = {
  ok: errors.length === 0,
  manifestId: manifest.manifestId,
  checkedAt: new Date().toISOString(),
  checkedAssets: results.length,
  expectedAssets: manifest.assets.length,
  results,
  errors,
}

console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1

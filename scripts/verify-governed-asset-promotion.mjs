#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = 'operations/assets/launch-critical-assets.json'
const decisionPath = process.env.URAI_ASSET_PROMOTION_DECISION || 'operations/assets/promotion-rehearsal/spatial-particle-atlas-v1.json'
const failures = []
const requireCondition = (condition, message) => { if (!condition) failures.push(message) }
const readJson = (relative) => JSON.parse(readFileSync(path.resolve(root, relative), 'utf8'))
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
const safePath = (value) => typeof value === 'string' && value.length > 0 && !value.startsWith('/') && !value.includes('\\') && path.posix.normalize(value) === value && value.split('/').every((segment) => segment && segment !== '.' && segment !== '..')

requireCondition(existsSync(path.resolve(root, manifestPath)), `missing canonical manifest: ${manifestPath}`)
requireCondition(safePath(decisionPath), 'promotion decision path is unsafe')
if (safePath(decisionPath)) requireCondition(existsSync(path.resolve(root, decisionPath)), `missing promotion decision: ${decisionPath}`)
if (failures.length) {
  console.error('GOVERNED_ASSET_PROMOTION=RED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

const manifest = readJson(manifestPath)
const decision = readJson(decisionPath)
const assets = Array.isArray(manifest.assets) ? manifest.assets : []
const aliasOfAssetId = typeof decision.aliasOfAssetId === 'string' ? decision.aliasOfAssetId : null
const asset = assets.find((entry) => entry.id === (aliasOfAssetId || decision.assetId))
const aliasMode = Boolean(aliasOfAssetId)

requireCondition(decision.schemaVersion === 1, 'decision schemaVersion must equal 1')
requireCondition(decision.mode === 'rehearsal' || decision.mode === 'promotion', 'decision mode must be rehearsal or promotion')
requireCondition(decision.repository === 'LifeLoggerAI/urai-spatial', 'decision repository must target LifeLoggerAI/urai-spatial')
requireCondition(typeof decision.assetId === 'string' && decision.assetId.length > 0, 'decision assetId is required')
requireCondition(Boolean(asset), aliasMode ? `aliased canonical asset is absent from manifest: ${aliasOfAssetId}` : `asset is absent from canonical manifest: ${decision.assetId || 'missing'}`)
requireCondition(typeof decision.producer === 'string' && decision.producer.length > 0, 'producer identity is required')
requireCondition(typeof decision.reviewer === 'string' && decision.reviewer.length > 0, 'reviewer identity is required')
requireCondition(decision.producer !== decision.reviewer, 'producer and reviewer must be independent identities')
requireCondition(decision.fallbackVerified === true, 'fallback verification is required')
requireCondition(decision.routeConsumptionVerified === true, 'route consumption verification is required')
requireCondition(decision.licenseApproved === true, 'license approval is required')
requireCondition(decision.optimizationVerified === true, 'optimization verification is required')
requireCondition(decision.exactHeadChecksPassed === true, 'exact-head checks must pass')
requireCondition(typeof decision.reviewedAt === 'string' && !Number.isNaN(Date.parse(decision.reviewedAt)), 'reviewedAt must be an ISO timestamp')

if (aliasMode) {
  requireCondition(decision.mode === 'rehearsal', 'binary aliases are rehearsal-only and may not be promoted independently')
  requireCondition(decision.assetId !== aliasOfAssetId, 'binary alias must have a distinct semantic assetId')
  requireCondition(safePath(decision.canonicalPath), 'alias canonicalPath is unsafe')
  requireCondition(Boolean(asset?.fixedPath) && safePath(asset?.fixedPath), 'aliased canonical manifest path is unsafe')
} else if (asset) {
  requireCondition(decision.canonicalPath === asset.fixedPath, 'decision canonicalPath must equal the manifest fixedPath')
}

if (asset) {
  requireCondition(safePath(decision.canonicalPath), 'canonicalPath is unsafe')
  requireCondition(typeof decision.source === 'string' && decision.source.length > 0, 'decision source is required')
  requireCondition(decision.source === asset.source, 'decision source must equal the canonical manifest source')
  requireCondition(decision.fallback === asset.fallback, 'decision fallback must equal the canonical manifest fallback')
  requireCondition(decision.license === asset.license, 'decision license must equal the canonical manifest license')
  requireCondition(asset.releaseState === 'pending-final-review' || asset.releaseState === 'production-ready', `unsupported manifest releaseState: ${asset.releaseState}`)
}

if (safePath(decision.canonicalPath)) {
  const absolute = path.resolve(root, decision.canonicalPath)
  requireCondition(absolute.startsWith(`${root}${path.sep}`), 'canonicalPath escapes repository root')
  requireCondition(existsSync(absolute), `promoted asset does not exist: ${decision.canonicalPath}`)
  if (existsSync(absolute)) {
    const stat = lstatSync(absolute)
    const isSymlink = stat.isSymbolicLink()
    const isFile = stat.isFile()
    requireCondition(!isSymlink, 'promoted asset may not be a symlink')
    requireCondition(isFile, 'promoted asset must be a regular file')
    if (isFile && !isSymlink) {
      const buffer = readFileSync(absolute)
      requireCondition(Number.isInteger(decision.bytes) && decision.bytes === buffer.length, `byte mismatch expected=${decision.bytes} actual=${buffer.length}`)
      requireCondition(/^[0-9a-f]{64}$/.test(String(decision.sha256 || '')), 'decision SHA-256 is invalid')
      requireCondition(decision.sha256 === sha256(buffer), 'decision SHA-256 does not match asset bytes')
      if (aliasMode && asset?.fixedPath && safePath(asset.fixedPath)) {
        const canonicalAbsolute = path.resolve(root, asset.fixedPath)
        requireCondition(existsSync(canonicalAbsolute), `aliased canonical asset does not exist: ${asset.fixedPath}`)
        if (existsSync(canonicalAbsolute)) {
          const canonicalBuffer = readFileSync(canonicalAbsolute)
          requireCondition(buffer.length === canonicalBuffer.length, 'alias bytes differ in length from canonical asset')
          requireCondition(sha256(buffer) === sha256(canonicalBuffer), 'alias bytes differ from canonical asset')
        }
      }
    }
  }
}

if (decision.mode === 'rehearsal') {
  requireCondition(decision.promote === false, 'rehearsal must set promote=false')
  requireCondition(asset?.releaseState !== 'production-ready', 'rehearsal may not mark canonical manifest production-ready')
  requireCondition(decision.humanReviewApproved === false, 'rehearsal must not claim human approval')
  requireCondition(decision.visualProofVerified === false, 'rehearsal must not claim final visual proof')
  requireCondition(!decision.receiptPath, 'rehearsal must not attach a production receipt')
} else {
  requireCondition(decision.promote === true, 'promotion must set promote=true')
  requireCondition(asset?.releaseState === 'production-ready', 'promotion requires manifest releaseState=production-ready')
  requireCondition(decision.humanReviewApproved === true, 'promotion requires human review approval')
  requireCondition(decision.visualProofVerified === true, 'promotion requires verified visual proof')
  requireCondition(typeof decision.receiptPath === 'string' && safePath(decision.receiptPath), 'promotion receiptPath must be safe')
  if (typeof decision.receiptPath === 'string' && safePath(decision.receiptPath)) {
    requireCondition(existsSync(path.resolve(root, decision.receiptPath)), `promotion receipt missing: ${decision.receiptPath}`)
  }
}

if (failures.length) {
  console.error('GOVERNED_ASSET_PROMOTION=RED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('GOVERNED_ASSET_PROMOTION=GREEN')
console.log(`MODE=${decision.mode}`)
console.log(`ASSET_ID=${decision.assetId}`)
if (aliasMode) console.log(`ALIAS_OF_ASSET_ID=${aliasOfAssetId}`)
console.log(`CANONICAL_PATH=${decision.canonicalPath}`)
console.log(`PROMOTE=${decision.promote}`)

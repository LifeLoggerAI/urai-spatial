#!/usr/bin/env node
import fs from 'node:fs'
import crypto from 'node:crypto'
import * as admin from 'firebase-admin'

const MAX_DESKTOP_BYTES = 160 * 1024 * 1024
const TOKEN = /^[A-Za-z0-9._-]{1,128}$/
const SHA256 = /^[a-f0-9]{64}$/

function parseArgs(argv) {
  const out = { sourceIds: [], apply: false, privacyAccepted: false }
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (key === '--apply') { out.apply = true; continue }
    if (key === '--privacy-review-accepted') { out.privacyAccepted = true; continue }
    const value = argv[++index]
    if (!value) throw new Error(`Missing value for ${key}`)
    if (key === '--file') out.file = value
    else if (key === '--expected-sha256') out.expectedSha256 = value.toLowerCase()
    else if (key === '--owner-uid') out.ownerUid = value
    else if (key === '--asset-id') out.assetId = value
    else if (key === '--anchor-entity-id') out.anchorEntityId = value
    else if (key === '--source-id') out.sourceIds.push(value)
    else if (key === '--truth-label') out.truthLabel = value
    else if (key === '--privacy-receipt-ref') out.privacyReceiptRef = value
    else throw new Error(`Unknown argument: ${key}`)
  }
  return out
}

function requireToken(value, label) {
  if (typeof value !== 'string' || !TOKEN.test(value)) throw new Error(`${label} must be a safe nonempty token`)
  return value
}

function validateArgs(args) {
  if (!args.file || !fs.existsSync(args.file) || !fs.statSync(args.file).isFile()) throw new Error('--file must name an existing regular file')
  if (!SHA256.test(args.expectedSha256 ?? '')) throw new Error('--expected-sha256 must be 64 lowercase hex characters')
  requireToken(args.ownerUid, '--owner-uid')
  requireToken(args.assetId, '--asset-id')
  requireToken(args.anchorEntityId, '--anchor-entity-id')
  if (!args.sourceIds.length) throw new Error('At least one --source-id is required')
  for (const sourceId of args.sourceIds) requireToken(sourceId, '--source-id')
  if (typeof args.truthLabel !== 'string' || !args.truthLabel.trim() || args.truthLabel.length > 240) throw new Error('--truth-label is required and must be <=240 characters')
  if (typeof args.privacyReceiptRef !== 'string' || !args.privacyReceiptRef.trim() || args.privacyReceiptRef.length > 512) throw new Error('--privacy-receipt-ref is required')
  if (args.apply && !args.privacyAccepted) throw new Error('--apply requires --privacy-review-accepted; technical integrity cannot self-authorize privacy')
  if (args.apply && !process.env.FIREBASE_STORAGE_BUCKET) throw new Error('FIREBASE_STORAGE_BUCKET must be set explicitly; bucket names are never guessed')
}

function hashFile(path) {
  const bytes = fs.readFileSync(path)
  return { bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  validateArgs(args)
  const { bytes, sha256 } = hashFile(args.file)
  if (sha256 !== args.expectedSha256) throw new Error(`SHA-256 mismatch: expected ${args.expectedSha256}, got ${sha256}`)
  if (bytes.length <= 0 || bytes.length % 32 !== 0) throw new Error('Runtime splat must contain complete 32-byte records')
  if (bytes.length > MAX_DESKTOP_BYTES) throw new Error('Runtime splat exceeds the governed desktop byte budget')

  const runtimeObject = `private-captured-reality/${args.ownerUid}/${args.assetId}/runtime/${sha256}.splat`
  const receipt = {
    classification: args.apply ? 'PRIVATE_TECHNICAL_PROOF_IMPORTED' : 'PRIVATE_TECHNICAL_PROOF_DRY_RUN',
    assetId: args.assetId,
    runtimeSha256: sha256,
    runtimeBytes: bytes.length,
    runtimeRecords: bytes.length / 32,
    runtimeObject,
    reviewState: 'rejected',
    visualAcceptance: false,
    browserCertified: false,
    mobileCertified: false,
    xrCertified: false,
    proofState: 'technical-preview',
    proofIntegrityVerified: true,
    proofPrivacyReviewed: args.apply && args.privacyAccepted,
    releaseState: 'private-pilot',
    sourceCount: args.sourceIds.length,
  }

  if (!args.apply) {
    process.stdout.write(JSON.stringify(receipt, null, 2) + '\n')
    return
  }

  if (!admin.apps.length) admin.initializeApp({ storageBucket: process.env.FIREBASE_STORAGE_BUCKET })
  const db = admin.firestore()
  const bucket = admin.storage().bucket()
  const assetRef = db.doc(`users/${args.ownerUid}/capturedRealityAssets/${args.assetId}`)
  const existing = await assetRef.get()
  if (existing.exists) throw new Error('Captured Reality asset already exists; proof import is create-only')

  const object = bucket.file(runtimeObject)
  const [exists] = await object.exists()
  if (exists) throw new Error('Private runtime object already exists; proof import will not overwrite it')

  await object.save(bytes, {
    resumable: false,
    validation: 'crc32c',
    metadata: {
      contentType: 'application/octet-stream',
      cacheControl: 'private, no-store, max-age=0',
      metadata: {
        uraiAssetId: args.assetId,
        uraiRuntimeSha256: sha256,
        uraiClassification: 'private-technical-proof',
      },
    },
  })

  try {
    await assetRef.create({
      ownerId: args.ownerUid,
      label: 'Private captured-place technical proof',
      anchorEntityId: args.anchorEntityId,
      sourceIds: args.sourceIds,
      truthClass: 'spatially-reconstructable',
      reconstructionMethod: '3dgs',
      state: 'proof-ready',
      reviewState: 'rejected',
      visualAcceptance: false,
      proofState: 'technical-preview',
      proofIntegrityVerified: true,
      proofPrivacyReviewed: true,
      proofPrivacyReceiptRef: args.privacyReceiptRef,
      releaseState: 'private-pilot',
      browserCertified: false,
      mobileCertified: false,
      xrCertified: false,
      runtimeObject,
      runtimeSha256: sha256,
      runtimeBytes: bytes.length,
      truthLabel: args.truthLabel.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    await object.delete({ ignoreNotFound: true })
    throw error
  }

  process.stdout.write(JSON.stringify(receipt, null, 2) + '\n')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

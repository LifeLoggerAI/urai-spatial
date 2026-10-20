import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import path from 'node:path'

const safeRelativePath = value => typeof value === 'string' && value.length > 0
  && !value.startsWith('/') && !value.includes('\\')
  && path.posix.normalize(value) === value
  && value.split('/').every(segment => segment && segment !== '.' && segment !== '..')
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex')

export function verifyProductionAssetReceiptBindings({
  root,
  manifestPath = 'operations/assets/launch-critical-assets.json',
  receiptDirectory = 'operations/assets/production-receipts',
}) {
  const repositoryRoot = realpathSync(root)
  const errors = []
  const records = []
  const excluded = []
  const failure = (code, receiptPath, detail) => ({ code, receiptPath, detail })
  const readJson = relative => JSON.parse(readFileSync(path.join(repositoryRoot, relative), 'utf8'))
  const regularFile = relative => {
    if (!safeRelativePath(relative)) return { code: 'UNSAFE_PATH', detail: String(relative) }
    let absolute = repositoryRoot
    for (const component of relative.split('/')) {
      absolute = path.join(absolute, component)
      if (!existsSync(absolute)) return { code: 'FILE_MISSING', detail: relative }
      if (lstatSync(absolute).isSymbolicLink()) return { code: 'SYMLINK_PATH', detail: relative }
    }
    if (!lstatSync(absolute).isFile()) return { code: 'NOT_REGULAR_FILE', detail: relative }
    return { absolute }
  }
  let manifest
  try {
    const manifestFile = regularFile(manifestPath)
    if (manifestFile.code) throw new Error(manifestFile.detail)
    manifest = readJson(manifestPath)
    if (!Array.isArray(manifest.assets)) throw new Error('manifest assets must be an array')
    const ownerIds = new Set()
    const ownerPaths = new Set()
    for (const asset of manifest.assets) {
      if (!asset || typeof asset !== 'object' || Array.isArray(asset)
        || typeof asset.id !== 'string' || asset.id.trim().length === 0
        || !safeRelativePath(asset.fixedPath)) {
        throw new Error('manifest assets must bind a nonempty owner id and safe fixedPath')
      }
      if (ownerIds.has(asset.id) || ownerPaths.has(asset.fixedPath)) {
        throw new Error('manifest asset owner ids and fixedPaths must be unique')
      }
      ownerIds.add(asset.id)
      ownerPaths.add(asset.fixedPath)
    }
  } catch (error) {
    errors.push(failure('MANIFEST_INVALID', manifestPath, String(error.message)))
    manifest = null
  }
  let receiptNames = []
  try {
    if (!safeRelativePath(receiptDirectory)) throw new Error('unsafe receipt directory')
    const directory = path.join(repositoryRoot, receiptDirectory)
    if (lstatSync(directory).isSymbolicLink()) throw new Error('receipt directory may not be a symlink')
    receiptNames = readdirSync(directory).filter(name => name.endsWith('.json')).sort()
    if (receiptNames.length === 0) throw new Error('production receipt directory is empty')
  } catch (error) {
    errors.push(failure('RECEIPT_DIRECTORY_INVALID', receiptDirectory, String(error.message)))
  }

  for (const name of receiptNames) {
    const receiptPath = `${receiptDirectory}/${name}`
    let receipt
    try {
      const receiptFile = regularFile(receiptPath)
      if (receiptFile.code) throw new Error(`${receiptFile.code}: ${receiptFile.detail}`)
      receipt = readJson(receiptPath)
      if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw new Error('receipt must be an object')
    } catch (error) {
      errors.push(failure('RECEIPT_INVALID', receiptPath, String(error.message)))
      continue
    }
    const productionClaim = receipt.releaseState === 'production-ready' || receipt.deploymentAuthorized === true
    if (!Object.hasOwn(receipt, 'fixedPath')) {
      if (productionClaim) errors.push(failure('FIXED_PATH_REQUIRED', receiptPath, 'A production-ready or deployment-authorized receipt must bind a fixedPath.'))
      else excluded.push({ receiptPath, reason: 'aggregate candidate receipt; separately governed sensory/audio verification required' })
      continue
    }
    const record = {
      receiptPath,
      fixedPath: receipt.fixedPath,
      productionClaim,
      historicalAcceptedSourceHead: receipt.acceptedSourceHead ?? null,
      expected: { bytes: receipt.bytes, sha256: receipt.sha256 },
      actual: { bytes: null, sha256: null },
      errors: [],
    }
    const reject = (code, detail) => record.errors.push(failure(code, receiptPath, detail))
    const owner = manifest?.assets.find(asset => asset.fixedPath === receipt.fixedPath)
    if (!owner) reject('MANIFEST_OWNER_MISSING', 'Receipt fixedPath has no canonical launch asset owner.')
    if (!Number.isInteger(receipt.bytes) || receipt.bytes <= 0) reject('INVALID_BYTES', 'Receipt bytes must be a positive integer.')
    if (!/^[0-9a-f]{64}$/.test(String(receipt.sha256 ?? ''))) reject('INVALID_SHA256', 'Receipt SHA-256 must be 64 lowercase hexadecimal characters.')
    const file = regularFile(receipt.fixedPath)
    if (file.code) reject(file.code, file.detail)
    else {
      const buffer = readFileSync(file.absolute)
      record.actual = { bytes: buffer.length, sha256: sha256(buffer) }
      if (record.actual.bytes !== receipt.bytes) reject('BYTE_MISMATCH', `expected=${receipt.bytes} actual=${record.actual.bytes}`)
      if (record.actual.sha256 !== receipt.sha256) reject('HASH_MISMATCH', `expected=${receipt.sha256} actual=${record.actual.sha256}`)
    }
    if (owner && productionClaim) {
      if (owner.releaseState !== 'production-ready') reject('MANIFEST_NOT_PRODUCTION_READY', `manifest=${owner.releaseState} receipt=${receipt.releaseState} deploymentAuthorized=${receipt.deploymentAuthorized}`)
      if ((receipt.id ?? receipt.assetId) !== owner.id) reject('RECEIPT_OWNER_MISMATCH', `receipt=${receipt.id ?? receipt.assetId} manifest=${owner.id}`)
      const decisionPath = `operations/assets/promotion-decisions/${owner.id}.json`
      const decisionFile = regularFile(decisionPath)
      if (decisionFile.code) reject('PROMOTION_DECISION_MISSING', decisionPath)
      else {
        try {
          const decision = readJson(decisionPath)
          if (decision.mode !== 'promotion' || decision.assetId !== owner.id
            || decision.canonicalPath !== receipt.fixedPath || decision.receiptPath !== receiptPath
            || decision.bytes !== receipt.bytes || decision.sha256 !== receipt.sha256) {
            reject('PROMOTION_DECISION_BINDING_MISMATCH', decisionPath)
          }
        } catch (error) {
          reject('PROMOTION_DECISION_INVALID', `${decisionPath}: ${error.message}`)
        }
      }
    }
    record.technicalPass = record.errors.length === 0
    errors.push(...record.errors)
    records.push(record)
  }
  for (const asset of manifest?.assets ?? []) {
    if (asset.releaseState === 'production-ready' && !records.some(record => record.fixedPath === asset.fixedPath)) {
      errors.push(failure('PRODUCTION_RECEIPT_MISSING', manifestPath, `${asset.id}: ${asset.fixedPath}`))
    }
  }
  const decisionDirectory = 'operations/assets/promotion-decisions'
  try {
    for (const name of readdirSync(path.join(repositoryRoot, decisionDirectory)).filter(name => name.endsWith('.json')).sort()) {
      const decisionPath = `${decisionDirectory}/${name}`
      const file = regularFile(decisionPath)
      if (file.code) throw new Error(`${file.code}: ${decisionPath}`)
      const decision = readJson(decisionPath)
      if (decision.mode !== 'promotion') continue
      const record = records.find(record => record.receiptPath === decision.receiptPath)
      if (!record) errors.push(failure('PROMOTION_RECEIPT_BINDING_MISSING', decisionPath, String(decision.receiptPath)))
      else if (record.fixedPath !== decision.canonicalPath || record.expected.bytes !== decision.bytes || record.expected.sha256 !== decision.sha256) {
        errors.push(failure('PROMOTION_DECISION_BINDING_MISMATCH', decisionPath, String(decision.receiptPath)))
      }
    }
  } catch (error) {
    errors.push(failure('PROMOTION_DECISION_DIRECTORY_INVALID', decisionDirectory, String(error.message)))
  }
  return {
    schema: 'urai.production-asset-receipt-bindings.v1',
    technicalPass: errors.length === 0,
    policy: {
      readOnly: true,
      providerCallsMade: 0,
      providerSpendUsd: 0,
      productionDeploymentPerformed: false,
      promotionAuthorized: false,
      currentReleaseAccepted: false,
      truthBoundary: 'Receipt identity is checked against committed bytes before any forge runs. Matching bytes do not grant current-head visual, release, signing, provider, or deployment authority.',
    },
    scope: 'Fixed-path production receipts and canonical production-ready launch assets; aggregate sensory/audio candidate receipts retain their separate validators.',
    records,
    excluded,
    errors,
  }
}

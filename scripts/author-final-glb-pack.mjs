#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const modelRoot = path.join(root, 'urai-tier1/public/assets/urai/generated/models')
const generatedReceiptPath = path.join(root, 'operations/assets/generated-receipts/urai-final-glb-pack-v1.json')
const productionReceiptRoot = path.join(root, 'operations/assets/production-receipts')

if (!fs.existsSync(generatedReceiptPath)) throw new Error('Authored GLB receipt is missing; production builds never generate substitute geometry.')
const generatedReceipt = JSON.parse(fs.readFileSync(generatedReceiptPath, 'utf8'))
if (generatedReceipt.packId !== 'urai-final-glb-production-pack-v1') throw new Error('Authored GLB receipt identity mismatch.')
if (!Array.isArray(generatedReceipt.assets) || generatedReceipt.assets.length !== 8) throw new Error('Exactly eight authored production GLBs must be committed.')

function governedExpectedAsset(asset) {
  const productionReceiptPath = path.join(productionReceiptRoot, asset.fileName.replace(/\.glb$/, '.json'))
  if (!fs.existsSync(productionReceiptPath)) return { ...asset, receiptSource: 'generated-candidate' }
  const productionReceipt = JSON.parse(fs.readFileSync(productionReceiptPath, 'utf8'))
  const expectedPath = path.relative(root, path.join(modelRoot, asset.fileName)).split(path.sep).join('/')
  if (productionReceipt.releaseState !== 'production-ready') {
    throw new Error(`${asset.fileName}: production receipt exists but is not production-ready.`)
  }
  if (productionReceipt.fixedPath !== expectedPath) {
    throw new Error(`${asset.fileName}: production receipt path does not match the canonical runtime path.`)
  }
  if (!Number.isInteger(productionReceipt.bytes) || !/^[a-f0-9]{64}$/.test(productionReceipt.sha256)) {
    throw new Error(`${asset.fileName}: production receipt identity is malformed.`)
  }
  return {
    ...asset,
    bytes: productionReceipt.bytes,
    sha256: productionReceipt.sha256,
    receiptSource: 'governed-production',
  }
}

for (const asset of generatedReceipt.assets) {
  const expected = governedExpectedAsset(asset)
  const filePath = path.join(modelRoot, asset.fileName)
  if (!fs.existsSync(filePath)) throw new Error(`${asset.fileName}: authored binary is missing; no procedural fallback will be generated.`)
  const bytes = fs.readFileSync(filePath)
  const hash = crypto.createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== expected.bytes || hash !== expected.sha256) {
    throw new Error(`${asset.fileName}: immutable authored binary does not match its ${expected.receiptSource} receipt.`)
  }
}

console.log(JSON.stringify({
  ok: true,
  mode: 'verify-committed-authored-binaries',
  packId: generatedReceipt.packId,
  assets: generatedReceipt.assets.map((asset) => asset.fileName),
  governedProductionReceipts: generatedReceipt.assets.filter((asset) => governedExpectedAsset(asset).receiptSource === 'governed-production').map((asset) => asset.fileName),
  generatedSubstitutes: 0,
}, null, 2))

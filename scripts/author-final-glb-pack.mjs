#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const modelRoot = path.join(root, 'urai-tier1/public/assets/urai/generated/models')
const receiptPath = path.join(root, 'operations/assets/generated-receipts/urai-final-glb-pack-v1.json')

if (!fs.existsSync(receiptPath)) throw new Error('Authored GLB receipt is missing; production builds never generate substitute geometry.')
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
if (receipt.packId !== 'urai-final-glb-production-pack-v1') throw new Error('Authored GLB receipt identity mismatch.')
if (!Array.isArray(receipt.assets) || receipt.assets.length !== 8) throw new Error('Exactly eight authored production GLBs must be committed.')

for (const asset of receipt.assets) {
  const filePath = path.join(modelRoot, asset.fileName)
  if (!fs.existsSync(filePath)) throw new Error(`${asset.fileName}: authored binary is missing; no procedural fallback will be generated.`)
  const bytes = fs.readFileSync(filePath)
  const hash = crypto.createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== asset.bytes || hash !== asset.sha256) {
    throw new Error(`${asset.fileName}: immutable authored binary does not match its receipt.`)
  }
}

console.log(JSON.stringify({
  ok: true,
  mode: 'verify-committed-authored-binaries',
  packId: receipt.packId,
  assets: receipt.assets.map((asset) => asset.fileName),
  generatedSubstitutes: 0,
}, null, 2))

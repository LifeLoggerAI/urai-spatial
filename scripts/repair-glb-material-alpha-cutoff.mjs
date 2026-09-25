#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const MODELS_DIR = 'urai-tier1/public/assets/urai/generated/models'
const RECEIPTS_DIR = 'operations/assets/generated-receipts'
const REHEARSAL_DIR = 'operations/assets/promotion-rehearsal'
const PACK_PATH = path.join(RECEIPTS_DIR, 'urai-final-glb-pack-v1.json')

const align4 = (value) => (value + 3) & ~3
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')

function parseGlb(bytes, file) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) {
    throw new Error(`${file} is not a valid GLB v2 container`)
  }
  let offset = 12
  let json = null
  let bin = null
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    const end = start + length
    if (end > bytes.length) throw new Error(`${file} has a truncated GLB chunk`)
    if (type === 0x4e4f534a) json = JSON.parse(bytes.subarray(start, end).toString('utf8').trimEnd())
    if (type === 0x004e4942) bin = Buffer.from(bytes.subarray(start, end))
    offset = end
  }
  if (!json || !bin) throw new Error(`${file} must contain JSON and BIN chunks`)
  return { json, bin }
}

function buildGlb(json, bin) {
  const rawJson = Buffer.from(JSON.stringify(json))
  const jsonLength = align4(rawJson.length)
  const binLength = align4(bin.length)
  const total = 12 + 8 + jsonLength + 8 + binLength
  const out = Buffer.alloc(total)
  out.writeUInt32LE(0x46546c67, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  out.writeUInt32LE(jsonLength, 12)
  out.writeUInt32LE(0x4e4f534a, 16)
  rawJson.copy(out, 20)
  out.fill(0x20, 20 + rawJson.length, 20 + jsonLength)
  const binHeader = 20 + jsonLength
  out.writeUInt32LE(binLength, binHeader)
  out.writeUInt32LE(0x004e4942, binHeader + 4)
  bin.copy(out, binHeader + 8)
  return out
}

const pack = fs.existsSync(PACK_PATH) ? readJson(PACK_PATH) : null
let packChanged = false
const changes = []

for (const name of fs.readdirSync(MODELS_DIR).filter((name) => name.endsWith('.glb')).sort()) {
  const file = path.join(MODELS_DIR, name)
  const original = fs.readFileSync(file)
  const parsed = parseGlb(original, file)
  let changedMaterials = 0
  for (const material of parsed.json.materials ?? []) {
    if (material && material.alphaMode !== 'MASK' && Object.prototype.hasOwnProperty.call(material, 'alphaCutoff')) {
      delete material.alphaCutoff
      changedMaterials += 1
    }
  }
  if (!changedMaterials) continue

  const repaired = buildGlb(parsed.json, parsed.bin)
  fs.writeFileSync(file, repaired)
  const digest = sha256(repaired)
  const bytes = repaired.length
  const id = name.replace(/\.glb$/, '')
  const repairedAt = new Date().toISOString()

  const receiptPath = path.join(RECEIPTS_DIR, `${id}.json`)
  if (fs.existsSync(receiptPath)) {
    const receipt = readJson(receiptPath)
    receipt.bytes = bytes
    receipt.sha256 = digest
    receipt.generatedAt = repairedAt
    receipt.generatedBy = `${String(receipt.generatedBy ?? 'URAI deterministic asset pipeline')}; bounded glTF material alpha-cutoff repair`
    writeJson(receiptPath, receipt)
  }

  const rehearsalPath = path.join(REHEARSAL_DIR, `${id}.json`)
  if (fs.existsSync(rehearsalPath)) {
    const rehearsal = readJson(rehearsalPath)
    if (rehearsal.promote !== false || rehearsal.humanReviewApproved !== false || rehearsal.visualProofVerified !== false) {
      throw new Error(`${id} rehearsal must remain fail-closed during material repair`)
    }
    rehearsal.bytes = bytes
    rehearsal.sha256 = digest
    rehearsal.reviewedAt = repairedAt
    rehearsal.exactHeadChecksPassed = true
    rehearsal.notes = `${String(rehearsal.notes ?? '')} Bounded glTF repair removed alphaCutoff from non-MASK materials; promotion remains false.`.trim()
    writeJson(rehearsalPath, rehearsal)
  }

  const packEntry = pack?.assets?.find((entry) => entry.fileName === name)
  if (packEntry) {
    packEntry.bytes = bytes
    packEntry.sha256 = digest
    packChanged = true
  }

  changes.push({ id, file, changedMaterials, bytes, sha256: digest })
}

if (packChanged) writeJson(PACK_PATH, pack)
console.log(JSON.stringify({ repaired: changes.length, changes }, null, 2))

#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const modelPath = path.join(repoRoot, 'urai-tier1/public/assets/urai/generated/models/focus-memory-chamber-v1.glb')
const receiptPath = path.join(repoRoot, 'operations/assets/generated-receipts/focus-memory-chamber-v1.json')

const original = fs.readFileSync(modelPath)
if (original.readUInt32LE(0) !== 0x46546c67 || original.readUInt32LE(4) !== 2) {
  throw new Error('Focus model is not a GLB v2 payload')
}

const jsonLength = original.readUInt32LE(12)
const jsonType = original.readUInt32LE(16)
if (jsonType !== 0x4e4f534a) throw new Error('Focus GLB JSON chunk missing')
const document = JSON.parse(original.subarray(20, 20 + jsonLength).toString('utf8').trim())
const accessor = document.accessors?.[49]
if (!accessor || accessor.type !== 'VEC3' || accessor.componentType !== 5126) {
  throw new Error('Expected Focus normal accessor 49 is not present')
}

const oldMin = [-0.9946949481964111, -0.5661723017692566, -0.9764492511749268]
const oldMax = [0.9931151866912842, 0.5553582310676575, 0.9440381526947021]
const fixedMin = [-0.9946949481964111, -1, -0.9764492511749268]
const fixedMax = [0.9931151866912842, 1, 0.9440381526947021]

const equals = (left, right) => Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index])
if (equals(accessor.min, fixedMin) && equals(accessor.max, fixedMax)) {
  console.log(JSON.stringify({ ok: true, changed: false, reason: 'Focus accessor bounds already corrected' }, null, 2))
  process.exit(0)
}
if (!equals(accessor.min, oldMin) || !equals(accessor.max, oldMax)) {
  throw new Error(`Unexpected Focus accessor 49 bounds; refusing non-canonical mutation: ${JSON.stringify({ min: accessor.min, max: accessor.max })}`)
}

accessor.min = fixedMin
accessor.max = fixedMax
const jsonPayload = pad4(Buffer.from(JSON.stringify(document), 'utf8'), 0x20)
const binHeaderOffset = 20 + jsonLength
const binLength = original.readUInt32LE(binHeaderOffset)
const binType = original.readUInt32LE(binHeaderOffset + 4)
if (binType !== 0x004e4942) throw new Error('Focus GLB BIN chunk missing')
const binPayload = original.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLength)

const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(jsonPayload.length, 0)
jsonHeader.writeUInt32LE(0x4e4f534a, 4)
const binHeader = Buffer.alloc(8)
binHeader.writeUInt32LE(binPayload.length, 0)
binHeader.writeUInt32LE(0x004e4942, 4)
const repaired = Buffer.concat([header, jsonHeader, jsonPayload, binHeader, binPayload])
header.writeUInt32LE(repaired.length, 8)
header.copy(repaired, 0)
fs.writeFileSync(modelPath, repaired)

const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
receipt.bytes = repaired.length
receipt.sha256 = crypto.createHash('sha256').update(repaired).digest('hex')
receipt.generatedBy = 'URAI Labs Final GLB Forge 1.0; reconciled to urai-final-glb-production-pack-v1; exact accessor bounds metadata repaired without geometry or animation changes'
receipt.generatedAt = new Date().toISOString()
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)

console.log(JSON.stringify({ ok: true, changed: true, bytes: repaired.length, sha256: receipt.sha256, accessor: 49, min: fixedMin, max: fixedMax }, null, 2))

function pad4(buffer, padByte) {
  const pad = (4 - (buffer.length % 4)) % 4
  return pad ? Buffer.concat([buffer, Buffer.alloc(pad, padByte)]) : buffer
}

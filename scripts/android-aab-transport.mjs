import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const PART_BYTES = 24 * 1024 * 1024
export const MAX_PARTS = 8
const MANIFEST_NAME = 'android-aab-transport.json'
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const partName = (index) => `app-release.aab.part-${String(index).padStart(2, '0')}`

function readPart(partPath, expectedBytes) {
  const input = fs.openSync(partPath, 'r')
  try {
    const stat = fs.fstatSync(input)
    if (!stat.isFile() || stat.size !== expectedBytes) throw new Error('Transport part size mismatch.')
    const chunk = Buffer.alloc(expectedBytes)
    let read = 0
    while (read < expectedBytes) {
      const count = fs.readSync(input, chunk, read, expectedBytes - read)
      if (!count) throw new Error('Transport part was truncated.')
      read += count
    }
    if (fs.readSync(input, Buffer.alloc(1), 0, 1) || fs.fstatSync(input).size !== expectedBytes) {
      throw new Error('Transport part size changed.')
    }
    return chunk
  } finally { fs.closeSync(input) }
}

function requireSource(sourceSha) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha ?? '')) throw new Error('An exact source SHA is required.')
}

function requireDigest(digest) {
  if (!/^[a-f0-9]{64}$/.test(digest ?? '')) throw new Error('A valid SHA-256 digest is required.')
}

export function validateManifest(manifest, sourceSha, expectedSha256) {
  requireSource(sourceSha)
  if (manifest?.format !== 'urai-android-aab-transport-v1' || manifest.status !== 'UNSIGNED_TRANSPORT_ONLY') {
    throw new Error('Unsupported transport manifest.')
  }
  if (manifest.sourceSha !== sourceSha) throw new Error('Transport source SHA mismatch.')
  if (manifest.bundleName !== 'app-release.aab' || manifest.partBytes !== PART_BYTES) {
    throw new Error('Unexpected bundle name or part bound.')
  }
  if (!Number.isSafeInteger(manifest.bundleBytes) || manifest.bundleBytes < 1 || manifest.bundleBytes > PART_BYTES * MAX_PARTS) {
    throw new Error('Bundle exceeds bounded transport size.')
  }
  requireDigest(manifest.bundleSha256)
  if (expectedSha256 !== undefined) {
    requireDigest(expectedSha256)
    if (manifest.bundleSha256 !== expectedSha256) throw new Error('Original bundle SHA-256 mismatch.')
  }
  const expectedCount = Math.ceil(manifest.bundleBytes / PART_BYTES)
  if (manifest.partCount !== expectedCount || !Array.isArray(manifest.parts) || manifest.parts.length !== expectedCount) {
    throw new Error('Transport part count mismatch.')
  }
  for (let offset = 0; offset < expectedCount; offset++) {
    const part = manifest.parts[offset]
    const bytes = Math.min(PART_BYTES, manifest.bundleBytes - offset * PART_BYTES)
    if (part?.index !== offset + 1 || part.name !== partName(offset + 1) || part.bytes !== bytes) {
      throw new Error('Transport part order, name, or size mismatch.')
    }
    requireDigest(part.sha256)
  }
  return manifest
}

export function splitBundle({ bundlePath, outputDirectory, sourceSha, expectedSha256 }) {
  requireSource(sourceSha)
  requireDigest(expectedSha256)
  const stat = fs.statSync(bundlePath)
  if (!stat.isFile() || stat.size < 1 || stat.size > PART_BYTES * MAX_PARTS) throw new Error('Bundle exceeds bounded transport size.')
  fs.mkdirSync(outputDirectory, { recursive: false })
  const source = fs.openSync(bundlePath, 'r')
  const aggregate = crypto.createHash('sha256')
  const parts = []
  try {
    let offset = 0
    while (offset < stat.size) {
      const bytes = Math.min(PART_BYTES, stat.size - offset)
      const chunk = Buffer.alloc(bytes)
      let read = 0
      while (read < bytes) {
        const count = fs.readSync(source, chunk, read, bytes - read, offset + read)
        if (!count) throw new Error('Bundle changed or was truncated during transport preparation.')
        read += count
      }
      const index = parts.length + 1
      const name = partName(index)
      fs.writeFileSync(path.join(outputDirectory, name), chunk, { flag: 'wx' })
      aggregate.update(chunk)
      parts.push({ index, name, bytes, sha256: sha256(chunk) })
      offset += bytes
    }
    const after = fs.fstatSync(source)
    if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs) throw new Error('Bundle changed during transport preparation.')
    const bundleSha256 = aggregate.digest('hex')
    if (bundleSha256 !== expectedSha256) throw new Error('Original bundle SHA-256 mismatch.')
    const manifest = validateManifest({
      format: 'urai-android-aab-transport-v1', status: 'UNSIGNED_TRANSPORT_ONLY',
      sourceSha, bundleName: 'app-release.aab', bundleBytes: stat.size, bundleSha256,
      partBytes: PART_BYTES, partCount: parts.length, parts,
    }, sourceSha, expectedSha256)
    fs.writeFileSync(path.join(outputDirectory, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
    return manifest
  } catch (error) {
    fs.rmSync(outputDirectory, { recursive: true, force: true })
    throw error
  } finally {
    fs.closeSync(source)
  }
}

export function reconstructBundle({ manifestPath, partPaths, outputPath, sourceSha, expectedSha256 }) {
  if (fs.statSync(manifestPath).size > 64 * 1024) throw new Error('Transport manifest exceeds size bound.')
  const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), sourceSha, expectedSha256)
  if (!Array.isArray(partPaths) || partPaths.length !== manifest.partCount) throw new Error('Transport part count mismatch.')
  const resolved = partPaths.map((part) => path.resolve(part))
  if (new Set(resolved).size !== resolved.length) throw new Error('Duplicate transport parts.')
  for (let offset = 0; offset < partPaths.length; offset++) {
    if (path.basename(partPaths[offset]) !== manifest.parts[offset].name) throw new Error('Transport part order mismatch.')
    const stat = fs.statSync(partPaths[offset])
    if (!stat.isFile() || stat.size !== manifest.parts[offset].bytes) throw new Error('Transport part size mismatch.')
  }
  const output = fs.openSync(outputPath, 'wx')
  const aggregate = crypto.createHash('sha256')
  let succeeded = false
  try {
    for (let offset = 0; offset < partPaths.length; offset++) {
      const chunk = readPart(partPaths[offset], manifest.parts[offset].bytes)
      if (chunk.length !== manifest.parts[offset].bytes || sha256(chunk) !== manifest.parts[offset].sha256) {
        throw new Error('Transport part SHA-256 mismatch.')
      }
      aggregate.update(chunk)
      let written = 0
      while (written < chunk.length) written += fs.writeSync(output, chunk, written, chunk.length - written)
    }
    if (aggregate.digest('hex') !== manifest.bundleSha256 || fs.fstatSync(output).size !== manifest.bundleBytes) {
      throw new Error('Reconstructed bundle SHA-256 or size mismatch.')
    }
    succeeded = true
    return { sourceSha, bundleBytes: manifest.bundleBytes, bundleSha256: manifest.bundleSha256, partCount: manifest.partCount }
  } finally {
    fs.closeSync(output)
    if (!succeeded) fs.unlinkSync(outputPath)
  }
}

function main() {
  const [command, ...args] = process.argv.slice(2)
  const options = { partPaths: [] }
  const keys = { '--bundle': 'bundlePath', '--directory': 'outputDirectory', '--manifest': 'manifestPath', '--output': 'outputPath', '--source-sha': 'sourceSha', '--expected-sha256': 'expectedSha256' }
  for (let offset = 0; offset < args.length; offset += 2) {
    const option = args[offset]
    const value = args[offset + 1]
    if (!value || value.startsWith('--')) throw new Error('Every transport option needs a value.')
    if (option === '--part') options.partPaths.push(value)
    else if (keys[option] && options[keys[option]] === undefined) options[keys[option]] = value
    else throw new Error('Unknown or duplicate transport option.')
  }
  const result = command === 'split' ? splitBundle(options) : command === 'reconstruct' ? reconstructBundle(options) : null
  if (!result) throw new Error('Use split or reconstruct with exact source and bundle identity.')
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) { console.error(error.message); process.exitCode = 1 }
}

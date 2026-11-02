#!/usr/bin/env node
/**
 * URAI private first-memory preflight (offline; no Firebase write or provider call).
 * Produces a canonical owner-scoped, initially HIDDEN memory and an evidence
 * receipt for the existing server-authoritative memoryMedia pipeline.
 * No private bytes, UID, filenames, or generated packet may enter Git.
 */
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, openSync, fstatSync, realpathSync, writeFileSync, readSync, closeSync, unlinkSync, rmdirSync } from 'node:fs'
import { resolve, sep, dirname, basename, relative, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { verifiedPrivateFileHash } from './private-file-integrity.mjs'

export const MAX_OWNED_MEMORY_MEDIA_BYTES = 4 * 1024 * 1024
const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const SHA256 = /^[a-f0-9]{64}$/
const ALLOWED_BASIS = new Set(['verified-event-time', 'archive-time-proxy-not-capture-date'])

function assert(value, message) { if (!value) throw new Error(message) }
function safePrivateSource(path) {
  assert(typeof path === 'string' && path.trim(), 'PRIVATE_SOURCE_PATH_REQUIRED')
  const info = lstatSync(path)
  assert(info.isFile() && !info.isSymbolicLink(), 'PRIVATE_SOURCE_MUST_BE_REGULAR_FILE')
  return info
}
function canonicalTime(value) {
  return typeof value === 'string' && ISO_UTC.test(value) && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value
}
function sourceFormat(bytes) {
  if (bytes.subarray(0, 4).toString('ascii') === 'OggS'
    && bytes.indexOf(Buffer.from('OpusHead')) >= 0) return { mimeType: 'audio/ogg', format: 'Ogg/Opus' }
  if (bytes.subarray(0, 3).toString('ascii') === 'ID3'
    || (bytes[0] === 255 && (bytes[1] & 224) === 224)) return { mimeType: 'audio/mpeg', format: 'MP3' }
  throw new Error('SOURCE_FORMAT_UNSUPPORTED_FOR_OWNED_MEMORY_MEDIA')
}
function replaySegments(durationMs) {
  const boundaries = [0, Math.floor(durationMs / 4), Math.floor(durationMs / 2), Math.floor(durationMs * 3 / 4), durationMs]
  return ['memory', 'emotion', 'pattern', 'return'].map((id, i) => ({
    id, label: ['Recording', 'Listening', 'Context', 'Return'][i],
    caption: 'Original recording. Word-level captions and individual speaker attribution have not been verified.',
    narratorLine: 'Source-backed family recording; no dialogue, identity, or event detail is inferred from this marker.',
    startsAtMs: boundaries[i], durationMs: boundaries[i + 1] - boundaries[i],
  }))
}

export async function prepareFirstPrivateMemory(options) {
  const { ownerId, memoryId, sourcePath, originalPath, sourceRef, occurredAt, occurredAtBasis,
    durationMs, title, summary, people = [] } = options ?? {}
  // Offline preparation cannot grant memory-level consent or prove Firebase identity.
  assert(!Object.hasOwn(options ?? {}, 'consentState'), 'OFFLINE_MEMORY_CONSENT_STATE_FORBIDDEN')
  assert(IDENTIFIER.test(ownerId ?? ''), 'EXACT_AUTH_OWNER_UID_REQUIRED')
  assert(IDENTIFIER.test(memoryId ?? ''), 'CANONICAL_MEMORY_ID_REQUIRED')
  assert(typeof sourceRef === 'string' && sourceRef.trim().length > 4, 'PRIVATE_ORIGINAL_SOURCE_REFERENCE_REQUIRED')
  assert(canonicalTime(occurredAt), 'CANONICAL_UTC_TIMESTAMP_REQUIRED')
  assert(ALLOWED_BASIS.has(occurredAtBasis), 'EVENT_TIME_PROVENANCE_REQUIRED')
  assert(Number.isSafeInteger(durationMs) && durationMs >= 4000 && durationMs <= 7 * 24 * 60 * 60 * 1000, 'MEDIA_DURATION_INVALID')
  assert(typeof title === 'string' && title.trim().length >= 3 && title.length <= 160, 'PRIVATE_TITLE_REQUIRED')
  assert(typeof summary === 'string' && summary.trim().length >= 10 && summary.length <= 2000, 'SOURCE_TRUTH_SUMMARY_REQUIRED')
  assert(Array.isArray(people) && people.length === 0, 'PERSON_IDENTITY_NOT_VERIFIED_LEAVE_PEOPLE_EMPTY')
  const stat = safePrivateSource(sourcePath)
  assert(stat.size > 0 && stat.size <= MAX_OWNED_MEMORY_MEDIA_BYTES, 'OWNED_MEDIA_4MIB_LIMIT_EXCEEDED')
  // Read only the signature bytes of the sensitive derivative, never its full
  // contents into a second in-memory buffer. Keep the descriptor pinned to the
  // same regular file identity checked above.
  const header = Buffer.alloc(128)
  const handle = openSync(sourcePath, 'r')
  let sampleLength = 0
  try {
    const opened = fstatSync(handle)
    assert(opened.isFile() && opened.dev === stat.dev && opened.ino === stat.ino
      && opened.size > 0 && opened.size <= MAX_OWNED_MEMORY_MEDIA_BYTES,
      'PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT')
    while (sampleLength < header.length) {
      const count = readSync(handle, header, sampleLength, header.length - sampleLength, sampleLength)
      if (count === 0) break
      sampleLength += count
    }
  } finally { closeSync(handle) }
  const content = sourceFormat(header.subarray(0, sampleLength))
  const originalStat = safePrivateSource(originalPath)
  assert(originalStat.size > 0, 'ORIGINAL_EMPTY')
  const distinctPaths = realpathSync(sourcePath) !== realpathSync(originalPath)
  const distinctFiles = !(stat.dev === originalStat.dev && stat.ino > 0 && stat.ino === originalStat.ino)
  assert(distinctPaths && distinctFiles, 'DERIVATIVE_MUST_NOT_OVERWRITE_ORIGINAL')
  const [originalSha256, derivativeSha256] = await Promise.all([verifiedPrivateFileHash(originalPath, originalStat), verifiedPrivateFileHash(sourcePath, stat)])
  assert(SHA256.test(originalSha256) && SHA256.test(derivativeSha256), 'SOURCE_HASH_UNAVAILABLE')
  const memory = {
    ownerId, title: title.trim(), occurredAt, summary: summary.trim(), emotionalState: 'unknown',
    emotionalArc: [], people: [], privacy: 'hidden', deleted: false,
    sourceMedia: [],
    sourceProvenance: {
      originalSourceRef: sourceRef.trim(), originalSha256, derivativeSha256,
      originalByteLength: originalStat.size, derivativeByteLength: stat.size,
      derivedContentType: content.mimeType, occurredAtBasis,
      speakerDiarization: 'not-verified', transcriptSync: 'not-verified',
      authenticity: 'source-derivative-not-generated-autobiography',
    },
    replayManifest: {
      id: 'source-' + memoryId, version: 1, durationMs,
      segments: replaySegments(durationMs),
    },
    narrator: {
      focus: 'An original recorded source is available. Person and event details remain source-bound.',
      replay: 'This is recorded media, not an AI reconstruction. Captions and speaker identities are not fully verified.',
    },
    star: { id: memoryId, position: [0, 0, -6], scale: 0.9, aura: '#8adfff', material: 'glass' },
    visuals: { sky: '#061526', ground: '#132b2b', fog: 0.35, particles: 0.5, reflection: 0.45, light: '#dffbff', accent: '#8adfff' },
  }
  return {
    schemaVersion: 'urai-first-private-memory-preflight-v1',
    status: 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN',
    firestorePath: 'users/' + ownerId + '/memories/' + memoryId,
    memory,
    upload: {
      requiresExistingServerAuthoredMemory: true,
      // Only a trusted server-owned memory with explicit individual authorization can upload.
      requiredSelectedMemoryConsentState: 'authorized',
      offlinePreparationGrantsConsent: false,
      ownerIdentityVerifiedOffline: false,
      requiredOwnerAuthFreshnessSeconds: 300,
      requiredCanonicalConsent: 'memory.granted + C1 memory.storage + fully-enforced + no deletion fences',
      initialVisibility: 'hidden',
      existingCallable: 'registerMemoryMedia', existingAuthorityCallable: 'getMemoryMediaUploadAuthority',
      request: { memoryId, operationId: 'firstlife_' + createHash('sha256').update(ownerId + '\n' + memoryId + '\n' + derivativeSha256).digest('hex').slice(0, 40), kind: 'audio', contentType: content.mimeType },
      fileByteLength: stat.size, sha256: derivativeSha256,
      filePathNotEmbedded: true, base64NotEmbedded: true,
      activateAfter: 'ready owner-scoped receipt, actual playback and current consent checks',
    },
    recordedTruth: { originalSha256, derivativeSha256, contentType: content.mimeType,
      byteLength: stat.size, originalByteLength: originalStat.size, occurredAtBasis,
      claimedReconstruction: false, claimedLifeMovieAcceptance: false },
  }
}

function isInsideGitCheckout(startPath) {
  let current = realpathSync(startPath)
  while (true) {
    // Both a normal .git directory and a worktree's .git file are protected.
    if (existsSync(resolve(current, '.git'))) return true
    const parent = dirname(current)
    if (parent === current) return false
    current = parent
  }
}

export function privatePacketWrite(packet, outputDir) {
  const out = resolve(outputDir)
  // The working directory is NOT the source checkout authority. Resolve the
  // real location of this module to protect unpacked sources with no .git, and
  // also refuse any other Git checkout (including worktrees with a .git file).
  const sourceRoot = realpathSync(new URL('../..', import.meta.url))
  const contained = (root, candidate) => {
    const offset = relative(root, candidate)
    return offset === '' || (offset !== '..' && !offset.startsWith('..' + sep)
      && !isAbsolute(offset))
  }
  const canonicalParent = realpathSync(dirname(out))
  const canonicalTarget = resolve(canonicalParent, basename(out))
  assert(!contained(sourceRoot, out) && !contained(sourceRoot, canonicalTarget)
    && !isInsideGitCheckout(canonicalParent), 'PRIVATE_PACKET_MUST_STAY_OUTSIDE_REPOSITORY')
  assert(!existsSync(out), 'PRIVATE_OUTPUT_DIRECTORY_MUST_BE_NEW')
  // Serialize and validate BOTH documents before creating a sensitive output
  // directory. Otherwise a throwing toJSON or malformed owner packet leaves
  // a half-published memory without its authoritative handoff receipt.
  assert(packet && typeof packet === 'object' && !Array.isArray(packet)
    && packet.memory && typeof packet.memory === 'object' && !Array.isArray(packet.memory)
    && packet.upload && typeof packet.upload === 'object' && !Array.isArray(packet.upload),
    'PRIVATE_PACKET_PAYLOAD_INVALID')
  const privateFiles = [
    ['memory.private.json', packet.memory], ['handoff.private.json', packet],
  ].map(([name, value]) => {
    const json = JSON.stringify(value, null, 2)
    assert(typeof json === 'string' && json.startsWith('{'), 'PRIVATE_PACKET_PAYLOAD_INVALID')
    return [name, json + '\n']
  })
  mkdirSync(out, { recursive: false, mode: 0o700 })
  try {
    // Recheck the created directory before any owner information is written.
    assert(!contained(sourceRoot, realpathSync(out)), 'PRIVATE_PACKET_MUST_STAY_OUTSIDE_REPOSITORY')
    for (const [name, json] of privateFiles) {
      const target = resolve(out, name)
      const fd = openSync(target, 'wx', 0o600)
      try { writeFileSync(fd, json) } finally { closeSync(fd) }
    }
  } catch (error) {
    // A short write or a failing second file must never leave an apparently
    // completed private handoff. Only remove the two known files we own.
    for (const [name] of privateFiles) {
      try { unlinkSync(resolve(out, name)) } catch { /* absent or inaccessible */ }
    }
    try { rmdirSync(out) } catch { /* report the original failure */ }
    throw error
  }
  return out
}

export async function main(args = process.argv.slice(2)) {
  const flags = Object.create(null)
  for (const arg of args) {
    const match = /^--([a-z-]+)=(.*)$/.exec(arg)
    assert(match, 'UNKNOWN_FIRST_LIFE_ARGUMENT')
    assert(!Object.hasOwn(flags, match[1]), 'DUPLICATE_FIRST_LIFE_ARGUMENT')
    flags[match[1]] = match[2]
  }
  assert(Object.keys(flags).every(key => ['owner', 'memory', 'source', 'original', 'source-ref',
    'occurred-at', 'time-basis', 'duration-ms', 'title', 'summary', 'out'].includes(key)), 'UNKNOWN_FIRST_LIFE_ARGUMENT')
  const packet = await prepareFirstPrivateMemory({
    ownerId: flags.owner, memoryId: flags.memory, sourcePath: flags.source, originalPath: flags.original,
    sourceRef: flags['source-ref'], occurredAt: flags['occurred-at'], occurredAtBasis: flags['time-basis'],
    durationMs: Number(flags['duration-ms']), title: flags.title, summary: flags.summary,
  })
  assert(flags.out, 'PRIVATE_OUTPUT_DIRECTORY_REQUIRED')
  const path = privatePacketWrite(packet, flags.out)
  console.log(JSON.stringify({ status: packet.status, outputDirectory: path,
    mediaBytes: packet.recordedTruth.byteLength, belowOwnedMediaLimit: true,
    firestoreWritePerformed: false, firebaseUploadPerformed: false }))
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(String(error.message ?? error)); process.exitCode = 1 })
}

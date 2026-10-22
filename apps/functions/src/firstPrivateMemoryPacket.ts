import { createHash } from 'node:crypto'

type Row = Record<string, unknown>
const ID = /^[A-Za-z0-9_-]{1,128}$/
const SHA = /^[a-f0-9]{64}$/
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const PHASES = ['memory', 'emotion', 'pattern', 'return'] as const
const TITLES = ['Recording', 'Listening', 'Context', 'Return'] as const
const CAPTION = 'Original recording. Word-level captions and individual speaker attribution have not been verified.'
const LINE = 'Source-backed family recording; no dialogue, identity, or event detail is inferred from this marker.'
const bad = (): never => { throw new Error('FIRST_PRIVATE_MEMORY_PACKET_INVALID') }
const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : bad()
const only = (row: Row, keys: readonly string[]) => Object.keys(row).every(key => keys.includes(key))
const date = (value: unknown): value is string => typeof value === 'string' && TIME.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
const text = (value: unknown, min: number, max: number): value is string => typeof value === 'string'
  && value.trim().length >= min && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)

/** Normalize an offline owner assertion into a server-owned, hidden record.
 * This only validates a claim. Current Firebase identity, per-memory user
 * acknowledgement, canonical C1, deletion fences and transactional create
 * MUST be enforced separately by the callable before writing Firestore. */
export function parsePreparedFirstPrivateMemory(packet: unknown, uid: string): { memoryId: string; memory: Row } {
  if (typeof uid !== 'string' || !ID.test(uid)) bad()
  let p: Row, m: Row, provenance: Row, upload: Row, request: Row, truth: Row, manifest: Row
  try {
    p = record(packet)
    m = record(p.memory)
    provenance = record(m.sourceProvenance)
    upload = record(p.upload)
    request = record(upload.request)
    truth = record(p.recordedTruth)
    manifest = record(m.replayManifest)
    if (Buffer.byteLength(JSON.stringify(packet), 'utf8') > 16 * 1024) bad()
  } catch { return bad() }
  const memoryId = request.memoryId
  const title = m.title, summary = m.summary
  const manifestSegments = manifest.segments
  // Narrow untrusted JSON primitives before using them in a trusted memory.
  if (typeof memoryId !== 'string' || !ID.test(memoryId)) bad()
  if (!text(title, 3, 160) || !text(summary, 10, 2000)) bad()
  if (!Array.isArray(manifestSegments)) bad()
  if (!only(p, ['schemaVersion', 'status', 'firestorePath', 'memory', 'upload', 'recordedTruth'])
    || !only(m, ['ownerId', 'title', 'occurredAt', 'summary', 'emotionalState', 'emotionalArc', 'people', 'privacy', 'deleted',
      'sourceMedia', 'sourceProvenance', 'replayManifest', 'narrator', 'star', 'visuals'])
    || !only(provenance, ['originalSourceRef', 'originalSha256', 'derivativeSha256', 'originalByteLength',
      'derivativeByteLength', 'derivedContentType', 'occurredAtBasis', 'speakerDiarization', 'transcriptSync', 'authenticity'])
    || !only(upload, ['requiresExistingServerAuthoredMemory', 'requiredSelectedMemoryConsentState',
      'offlinePreparationGrantsConsent', 'ownerIdentityVerifiedOffline', 'requiredOwnerAuthFreshnessSeconds',
      'requiredCanonicalConsent', 'initialVisibility', 'existingCallable', 'existingAuthorityCallable',
      'request', 'fileByteLength', 'sha256', 'filePathNotEmbedded', 'base64NotEmbedded', 'activateAfter'])
    || !only(request, ['memoryId', 'operationId', 'kind', 'contentType'])
    || !only(truth, ['originalSha256', 'derivativeSha256', 'contentType', 'byteLength', 'originalByteLength',
      'occurredAtBasis', 'claimedReconstruction', 'claimedLifeMovieAcceptance'])
    || !only(manifest, ['id', 'version', 'durationMs', 'segments'])) bad()
  if (p.schemaVersion !== 'urai-first-private-memory-preflight-v1'
    || p.status !== 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN'
    || typeof memoryId !== 'string' || !ID.test(memoryId)
    || p.firestorePath !== 'users/' + uid + '/memories/' + memoryId
    || m.ownerId !== uid || !text(title, 3, 160) || !text(summary, 10, 2000)
    || !date(m.occurredAt) || m.privacy !== 'hidden' || m.deleted !== false
    || m.emotionalState !== 'unknown' || !Array.isArray(m.emotionalArc) || m.emotionalArc.length !== 0
    || !Array.isArray(m.people) || m.people.length !== 0
    || !Array.isArray(m.sourceMedia) || m.sourceMedia.length !== 0
    || !text(provenance.originalSourceRef, 5, 512)
    || !SHA.test(String(provenance.originalSha256)) || !SHA.test(String(provenance.derivativeSha256))
    || !Number.isSafeInteger(provenance.originalByteLength) || Number(provenance.originalByteLength) < 1
    || !Number.isSafeInteger(provenance.derivativeByteLength) || Number(provenance.derivativeByteLength) < 1
    || Number(provenance.derivativeByteLength) > 4 * 1024 * 1024
    || !['audio/ogg', 'audio/mpeg'].includes(String(provenance.derivedContentType))
    || !['verified-event-time', 'archive-time-proxy-not-capture-date'].includes(String(provenance.occurredAtBasis))
    || provenance.speakerDiarization !== 'not-verified' || provenance.transcriptSync !== 'not-verified'
    || provenance.authenticity !== 'source-derivative-not-generated-autobiography'
    || upload.requiresExistingServerAuthoredMemory !== true
    || upload.requiredSelectedMemoryConsentState !== 'authorized'
    || upload.offlinePreparationGrantsConsent !== false || upload.ownerIdentityVerifiedOffline !== false
    || upload.requiredOwnerAuthFreshnessSeconds !== 300 || upload.initialVisibility !== 'hidden'
    || upload.existingCallable !== 'registerMemoryMedia'
    || upload.existingAuthorityCallable !== 'getMemoryMediaUploadAuthority'
    || request.kind !== 'audio' || request.contentType !== provenance.derivedContentType
    || upload.sha256 !== provenance.derivativeSha256
    || upload.fileByteLength !== provenance.derivativeByteLength
    || upload.filePathNotEmbedded !== true || upload.base64NotEmbedded !== true
    || truth.originalSha256 !== provenance.originalSha256 || truth.derivativeSha256 !== provenance.derivativeSha256
    || truth.contentType !== provenance.derivedContentType || truth.byteLength !== provenance.derivativeByteLength
    || truth.originalByteLength !== provenance.originalByteLength || truth.occurredAtBasis !== provenance.occurredAtBasis
    || truth.claimedReconstruction !== false || truth.claimedLifeMovieAcceptance !== false) bad()
  const expectedOperation = 'firstlife_' + createHash('sha256')
    .update(uid + '\n' + memoryId + '\n' + provenance.derivativeSha256).digest('hex').slice(0, 40)
  if (request.operationId !== expectedOperation) bad()
  const duration = manifest.durationMs
  if (manifest.id !== 'source-' + memoryId || manifest.version !== 1
    || !Number.isSafeInteger(duration) || Number(duration) < 4000 || Number(duration) > 7 * 86400000
    || manifestSegments.length !== 4) bad()
  // The output is reconstructed from validated primitives, not spread from
  // owner-supplied JSON. No private media URL, path, arbitrary person or
  // generated historical claim can silently enter the canonical document.
  const stops = [0, Math.floor(Number(duration)/4), Math.floor(Number(duration)/2),
    Math.floor(Number(duration)*3/4), Number(duration)]
  const segments = PHASES.map((id, i) => ({ id, label: TITLES[i], caption: CAPTION, narratorLine: LINE,
    startsAtMs: stops[i], durationMs: stops[i+1] - stops[i] }))
  for (let i = 0; i < 4; i++) {
    const seg = record(manifestSegments[i])
    if (seg.id !== PHASES[i] || seg.startsAtMs !== stops[i] || seg.durationMs !== stops[i+1]-stops[i]) bad()
  }
  return { memoryId, memory: {
    ownerId: uid, title: title.trim(), occurredAt: m.occurredAt, summary: summary.trim(),
    emotionalState: 'unknown', emotionalArc: [], people: [], privacy: 'hidden', deleted: false,
    consentState: 'authorized', sourceMedia: [],
    sourceProvenance: {
      originalSourceRef: provenance.originalSourceRef, originalSha256: provenance.originalSha256,
      derivativeSha256: provenance.derivativeSha256, originalByteLength: provenance.originalByteLength,
      derivativeByteLength: provenance.derivativeByteLength, derivedContentType: provenance.derivedContentType,
      occurredAtBasis: provenance.occurredAtBasis, speakerDiarization: 'not-verified',
      transcriptSync: 'not-verified', authenticity: 'source-derivative-not-generated-autobiography',
      sourceAdmissionStatus: 'owner-asserted-pending-media-verification',
    },
    replayManifest: { id: 'source-' + memoryId, version: 1, durationMs: duration, segments },
    narrator: { focus: 'An original recorded source is available. Person and event details remain source-bound.',
      replay: 'This is recorded media, not an AI reconstruction. Captions and speaker identities are not fully verified.' },
    star: { id: memoryId, position: [0,0,-6], scale: 0.9, aura: '#8adfff', material: 'glass' },
    visuals: { sky: '#061526', ground: '#132b2b', fog: 0.35, particles: 0.5,
      reflection: 0.45, light: '#dffbff', accent: '#8adfff' },
  } }
}

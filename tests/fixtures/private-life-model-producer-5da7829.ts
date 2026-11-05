// Verbatim producer functions from Jobs #165, 5da7829568496685e180a77e4ba6c8489c8cb251.
// Executed with injected Firestore/crypto dependencies, without provider calls.
const SOURCE_CONTRACT = 'urai-private-source-receipt-v2';
const TRANSCRIPT_CONTRACT = 'urai-private-source-transcript-v2';
function stableHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}


function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => JSON.stringify(key) + ':' + canonicalJson(val));
    return '{' + entries.join(',') + '}';
  }
  return JSON.stringify(value);
}


function binding(request: IndexRequest, resolved: ResolvedInputs) {
  return {
    schemaVersion: SOURCE_CONTRACT, ownerUid: request.ownerUid, jobId: request.jobId,
    sourceReceiptRef: request.sourceReceiptRef, sourceHandleHash: stableHash(request.sourceHandle),
    sourceEvidenceClass: request.sourceEvidenceClass, requestedPurpose: request.requestedPurpose,
    transcriptRef: request.transcriptRef, provenanceRef: request.provenanceRef,
    sourceFixityRef: resolved.sourceFixityRef, sourceSha256: resolved.sourceSha256,
    sourceByteLength: resolved.sourceByteLength, sourceRevision: resolved.sourceRevision,
    transcriptSha256: resolved.transcriptSha256, provenanceSha256: resolved.provenanceSha256,
    transcriptByteLength: resolved.transcriptByteLength,
    priorMemoryIndexRef: request.priorMemoryIndexRef || null, locale: request.locale || null,
    correlationTrigger: request.correlationTrigger || 'initial-source', idempotencyKey: request.idempotencyKey,
  };
}


function privateRoot(request: IndexRequest) {
  const handleHash = stableHash(request.ownerUid + '\n' + request.sourceHandle).slice(0, 40);
  return { handleHash, root: firestore().collection('uraiPrivateLifeModel').doc(handleHash) };
}


async function requireCurrentAuthority(tx: any, request: IndexRequest, resolved: ResolvedInputs) {
  const db = firestore();
  const job = (await tx.get(db.collection('jobs').doc(request.jobId))).data();
  if (!job || job.ownerUid !== request.ownerUid || (job.type || job.jobType) !== 'memory.private-source.index'
    || job.status !== 'RUNNING' || job.execution?.leaseToken !== request.leaseToken) throw new Error('canonical job authority mismatch');
  const p = job.payload || {};
  for (const key of ['sourceReceiptRef','transcriptRef','provenanceRef','requestedPurpose','priorMemoryIndexRef','locale']) {
    if (String(p[key] || '') !== String((request as any)[key] || '')) throw new Error('canonical payload mismatch');
  }
  if ((p.correlationTrigger || 'initial-source') !== request.correlationTrigger) throw new Error('canonical trigger mismatch');
  const consent = job.consent;
  if (consent?.purpose !== 'memory.storage' || !consent.policyVersion || !consent.decisionReceiptId) throw new Error('canonical memory consent required');
  const receiptRef = db.collection('uraiPrivateSourceReceipts').doc(stableHash(request.sourceReceiptRef));
  const [block, fence, sourceSnap, transcriptSnap] = await Promise.all([
    tx.get(db.collection('jobConsentBlocks').doc(stableHash(request.ownerUid + '\n' + consent.purpose))),
    tx.get(db.collection('uraiPrivateLifeModelOwnerFences').doc(stableHash(request.ownerUid))),
    tx.get(receiptRef), tx.get(receiptRef.collection('transcripts').doc(stableHash(request.transcriptRef))),
  ]);
  if (block.data()?.active === true || fence.data()?.deleted === true) throw new Error('private authority revoked/deleted');
  const source = sourceSnap.data();
  const transcript = transcriptSnap.data();
  if (!source || source.schemaVersion !== SOURCE_CONTRACT || source.ownerUid !== request.ownerUid
    || source.sourceReceiptRef !== request.sourceReceiptRef || source.sourceHandle !== request.sourceHandle
    || source.status !== 'ACTIVE' || source.synthetic !== false
    || source.sourceEvidenceClass !== request.sourceEvidenceClass
    || !Array.isArray(source.purposes) || !source.purposes.includes(request.requestedPurpose)
    || source.consent?.purpose !== consent.purpose || source.consent?.policyVersion !== consent.policyVersion
    || source.consent?.decisionReceiptId !== consent.decisionReceiptId) throw new Error('protected source grant mismatch');
  for (const key of ['sourceRevision','sourceFixityRef','sourceSha256','sourceByteLength']) {
    if (source[key] !== resolved[key as keyof ResolvedInputs]) throw new Error('protected source corrected/fixity mismatch');
  }
  if (!transcript || transcript.schemaVersion !== TRANSCRIPT_CONTRACT || transcript.ownerUid !== request.ownerUid
    || transcript.sourceReceiptRef !== request.sourceReceiptRef || transcript.status !== 'CURRENT'
    || transcript.synthetic !== false || transcript.requestedPurpose !== 'memory-index'
    || transcript.transcriptRef !== request.transcriptRef || transcript.provenanceRef !== request.provenanceRef) throw new Error('protected transcript binding mismatch');
  for (const key of ['sourceRevision','sourceSha256','transcriptSha256','provenanceSha256','transcriptByteLength']) {
    if (transcript[key] !== resolved[key as keyof ResolvedInputs]) throw new Error('protected transcript corrected/fixity mismatch');
  }
  return stableHash(canonicalJson(binding(request, resolved)));
}


function quarantinedImport(request: IndexRequest, extraction: Extraction, resolved: ResolvedInputs) {
  const lineage = binding(request, resolved);
  const prefix = 'candidate:' + stableHash(canonicalJson(lineage)).slice(0, 24) + ':';
  const entityId = (id: string) => prefix + stableHash(id).slice(0, 24);
  const claimId = (id: string) => prefix + stableHash(id).slice(0, 24);
  return {
    schemaVersion: 'urai-spatial-owner-review-import-candidate-v1', ownerId: request.ownerUid,
    reviewState: 'OWNER_REVIEW_REQUIRED', importExecutable: false, historicalSourceAuthority: false,
    lineage, lineageSha256: stableHash(canonicalJson(lineage)),
    entities: extraction.entities.map(entity => ({ id: entityId(entity.entityId), ownerId: request.ownerUid,
      kind: ['animal','other'].includes(entity.type) ? 'statement' : entity.type,
      canonicalLabel: entity.label, aliases: entity.aliases || [], createdFromSourceIds: [request.sourceReceiptRef],
      reviewState: 'QUARANTINED' })),
    claims: extraction.claims.map(claim => ({ id: claimId(claim.claimId), ownerId: request.ownerUid,
      subjectEntityId: entityId(claim.subject), predicate: claim.predicate, value: claim.object,
      evidenceClass: 'UNKNOWN', confidence: 'unknown', status: 'disputed', synthetic: true,
      sourceIds: [request.sourceReceiptRef], valueDigest: stableHash(JSON.stringify(claim.object)),
      sourceSpan: claim.sourceSpan, proposedEvidenceClass: claim.evidenceClass, reviewState: 'QUARANTINED' })),
    relationships: extraction.relationships.map(edge => ({ ownerId: request.ownerUid,
      fromEntityId: entityId(edge.from), toEntityId: entityId(edge.to), proposedKind: edge.type,
      evidenceClass: 'UNKNOWN', confidence: 'unknown', status: 'disputed', synthetic: true,
      sourceIds: [request.sourceReceiptRef], reviewState: 'QUARANTINED' })),
    temporalStates: extraction.temporalStates.map(state => ({ ...state, entityId: entityId(state.entityId), reviewState: 'QUARANTINED' })),
    places: extraction.places,
    conflicts: extraction.conflicts.map(conflict => ({ ...conflict, claimIds: conflict.claimIds.map(claimId) })),
    negativeConstraints: extraction.negativeConstraints.map(constraint => ({ ...constraint, sourceClaimIds: constraint.sourceClaimIds.map(claimId) })),
    sceneTruth: { decision: 'BLOCKED', reasons: ['OWNER_EVIDENCE_REVIEW_REQUIRED'], proposedDecision: extraction.sceneTruth.decision },
  };
}


async function persistRevision(request: IndexRequest, extraction: Extraction, resolved: ResolvedInputs, reservation: string) {
  const db = firestore();
  const { root, handleHash } = privateRoot(request);
  const idempotencyRef = root.collection('idempotency').doc(stableHash(request.idempotencyKey));
  return db.runTransaction(async (tx) => {
    const requestDigest = await requireCurrentAuthority(tx, request, resolved);
    const existing = await tx.get(idempotencyRef);
    const attempt = existing.data();
    if (!attempt || attempt.ownerUid !== request.ownerUid || attempt.requestDigest !== requestDigest
      || attempt.state !== 'STARTED' || attempt.reservation !== reservation) throw new Error('stale extraction reservation');
    const currentRef = root.collection('state').doc('current');
    const currentSnap = await tx.get(currentRef);
    const revision = Number(currentSnap.data()?.revision || 0) + 1;
    const record = {
      schemaVersion: 'urai-life-model-v1', ownerUid: request.ownerUid, jobId: request.jobId, revision,
      correlationTrigger: request.correlationTrigger || 'initial-source', sourceHandleHash: handleHash,
      sourceEvidenceClass: request.sourceEvidenceClass, sourceFixityRef: resolved.sourceFixityRef,
      sourceSha256: resolved.sourceSha256, transcriptRef: request.transcriptRef, provenanceRef: request.provenanceRef,
      lineage: binding(request, resolved), requestDigest, historicalSourceAuthority: false,
      reviewState: 'OWNER_REVIEW_REQUIRED', priorMemoryIndexRef: request.priorMemoryIndexRef || null,
      syntheticOutputMayBecomeHistoricalSource: false, extraction,
      producer: { repository: 'LifeLoggerAI/urai-jobs', sourceSha: process.env.URAI_SOURCE_SHA,
        runtimeRevision: process.env.K_REVISION, model: process.env.URAI_LIFE_MODEL_EXTRACTOR_MODEL,
        executionAuthorityRef: process.env.URAI_PRIVATE_LIFE_MODEL_EXECUTION_AUTHORITY_REF,
        candidateAcceptance: false, publicReleaseAuthorized: false },
      importCandidate: quarantinedImport(request, extraction, resolved),
    };
    // Includes model hypotheses and the exact inert canonical import candidate.
    if (Buffer.byteLength(canonicalJson(record), 'utf8') > 900 * 1024) throw new Error('private revision document exceeds bound');
    const checksum = stableHash(canonicalJson(record));
    const backlogState = extraction.conflicts.length ? 'QUARANTINED_CONFLICTED' : 'QUARANTINED_OWNER_REVIEW';
    tx.create(root.collection('revisions').doc(String(revision).padStart(8, '0')), {
      ...record, checksum, backlogState, createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(currentRef, { ownerUid: request.ownerUid, revision, checksum, backlogState, requestDigest,
      sourceRevision: resolved.sourceRevision, reviewState: 'OWNER_REVIEW_REQUIRED', historicalSourceAuthority: false,
      sourceEvidenceClass: request.sourceEvidenceClass, syntheticOutputMayBecomeHistoricalSource: false,
      updatedAt: FieldValue.serverTimestamp() });
    tx.set(idempotencyRef, { ownerUid: request.ownerUid, jobId: request.jobId, requestDigest,
      state: 'FINISHED', revision, checksum, backlogState, completedAt: FieldValue.serverTimestamp() });
    return { handleHash, revision, checksum, backlogState, replayed: false };
  });
}

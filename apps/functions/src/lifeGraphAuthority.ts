import { createHash } from 'node:crypto'
import * as functions from 'firebase-functions/v1'

type Row = Record<string, any>
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export function lifeAuthorityDigest(value: unknown): string {
  const canonical = (v: any): string => Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']'
    : v && typeof v === 'object' ? '{' + Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => JSON.stringify(k) + ':' + canonical(x)).join(',') + '}' : JSON.stringify(v)
  return hash(canonical(value))
}
function deny(message: string): never { throw new functions.https.HttpsError('failed-precondition', message) }
function ids(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 256 || value.some(v => typeof v !== 'string' || !/^psr_[A-Za-z0-9_-]{16,128}$/.test(v))) deny('GRAPH_PROTECTED_SOURCE_REQUIRED')
  return [...new Set(value as string[])]
}
export async function readLifeSourceBindings(db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction, uid: string, sourceIds: unknown) {
  const selected = ids(sourceIds)
  const [block, fence] = await Promise.all([
    tx.get(db.doc('jobConsentBlocks/' + hash(uid + '\n' + 'memory.storage'))),
    tx.get(db.doc('uraiPrivateLifeModelOwnerFences/' + hash(uid))),
  ])
  if (block.get('active') === true || fence.get('deleted') === true) deny('GRAPH_SOURCE_CONSENT_OR_OWNER_REVOKED')
  const bindings: Row[] = []
  for (const id of selected.sort()) {
    const snapshot = await tx.get(db.doc('uraiPrivateSourceReceipts/' + hash(id))), source = snapshot.data() ?? {}
    if (!snapshot.exists || source.schemaVersion !== 'urai-private-source-receipt-v2' || source.ownerUid !== uid
      || source.sourceReceiptRef !== id || source.status !== 'ACTIVE' || source.synthetic !== false
      || !Array.isArray(source.purposes) || !source.purposes.includes('memory-index')
      || !Number.isSafeInteger(source.sourceRevision) || source.sourceRevision < 1
      || !/^[0-9a-f]{64}$/.test(String(source.sourceSha256))
      || !Number.isSafeInteger(source.sourceByteLength) || source.sourceByteLength < 1
      || typeof source.sourceFixityRef !== 'string' || !/^private:[A-Za-z0-9_./:-]{8,512}$/.test(source.sourceFixityRef)
      || !['SOURCE_CAPTURED','SOURCE_DERIVED','DIRECT_SUBJECT_TESTIMONY','ATTRIBUTED_TESTIMONY','CORROBORATED_INFERENCE','CONTEXTUAL_RESEARCH'].includes(source.sourceEvidenceClass)
      || typeof source.sourceHandle !== 'string' || !/^psh_[A-Za-z0-9_-]{16,128}$/.test(source.sourceHandle)
      || source.consent?.purpose !== 'memory.storage' || !source.consent?.policyVersion || !source.consent?.decisionReceiptId) deny('GRAPH_SOURCE_AUTHORITY_UNAVAILABLE')
    bindings.push({ id, sourceRevision: source.sourceRevision, sourceSha256: source.sourceSha256,
      sourceFixityRef: source.sourceFixityRef, sourceByteLength: source.sourceByteLength,
      sourceEvidenceClass: source.sourceEvidenceClass, sourceHandleHash: hash(source.sourceHandle), consent: source.consent })
  }
  return bindings
}
export async function requireLifeItemSources(db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction, uid: string, row: Row, field: string) {
  const bindings = await readLifeSourceBindings(db, tx, uid, row[field])
  if (typeof row.privateLifeModelReviewId === 'string') {
    const receipt = await tx.get(db.doc('users/' + uid + '/lifeModelReceipts/' + row.privateLifeModelReviewId))
    if (!receipt.exists || receipt.get('ownerId') !== uid || receipt.get('schemaVersion') !== 'urai-private-life-model-owner-review-v1'
      || receipt.get('sourceChecksum') !== row.privateLifeModelChecksum || receipt.get('sourceRevision') !== row.privateLifeModelRevision
      || receipt.get('syntheticOutputMayBecomeHistoricalSource') !== false) deny('GRAPH_OWNER_REVIEW_UNAVAILABLE')
    const handle = receipt.get('sourceHandleHash')
    if (typeof handle !== 'string' || !/^[a-f0-9]{40}$/.test(handle)) deny('GRAPH_OWNER_REVIEW_UNAVAILABLE')
    const revision = await tx.get(db.doc('uraiPrivateLifeModel/' + handle + '/revisions/' + String(row.privateLifeModelRevision).padStart(8, '0')))
    const retained = revision.data() ?? {}, lineage = retained.lineage
    if (!revision.exists || retained.ownerUid !== uid || retained.checksum !== row.privateLifeModelChecksum
      || !lineage || bindings.length !== 1 || lineage.sourceReceiptRef !== bindings[0].id
      || lineage.ownerUid !== uid || lineage.requestedPurpose !== 'memory-index') deny('GRAPH_REVIEW_LINEAGE_UNAVAILABLE')
    for (const key of ['sourceRevision','sourceSha256','sourceFixityRef','sourceByteLength','sourceEvidenceClass','sourceHandleHash']) {
      if (bindings[0][key] !== lineage[key]) deny('GRAPH_REVIEW_SOURCE_CHANGED')
    }
    const transcript = await tx.get(db.doc('uraiPrivateSourceReceipts/' + hash(bindings[0].id) + '/transcripts/' + hash(lineage.transcriptRef)))
    if (!transcript.exists || transcript.get('ownerUid') !== uid || transcript.get('schemaVersion') !== 'urai-private-source-transcript-v2'
      || transcript.get('status') !== 'CURRENT' || transcript.get('synthetic') !== false
      || transcript.get('sourceReceiptRef') !== bindings[0].id || transcript.get('transcriptRef') !== lineage.transcriptRef
      || transcript.get('provenanceRef') !== lineage.provenanceRef) deny('GRAPH_REVIEW_TRANSCRIPT_UNAVAILABLE')
    for (const key of ['sourceRevision','sourceSha256','transcriptSha256','provenanceSha256','transcriptByteLength']) {
      if (transcript.get(key) !== lineage[key]) deny('GRAPH_REVIEW_TRANSCRIPT_CHANGED')
    }
    const job = await tx.get(db.doc('jobs/' + lineage.jobId))
    if (!job.exists || job.get('ownerUid') !== uid || lifeAuthorityDigest(job.get('consent')) !== lifeAuthorityDigest(bindings[0].consent)) deny('GRAPH_REVIEW_CONSENT_CHANGED')
  } else if (row.sourceBindingDigest !== lifeAuthorityDigest(bindings)) {
    deny('GRAPH_ITEM_SOURCE_BINDING_REQUIRED')
  }
  return bindings
}
export function lifeItemDigest(snapshot: FirebaseFirestore.DocumentSnapshot) {
  const { createdAt, updatedAt, compiledAt, ...body } = snapshot.data() ?? {}
  return lifeAuthorityDigest(body)
}

# Private Life Model input authority

`resolveLifeModelPrivateInputs` is the protected resolver expected by the Jobs private Life Model index provider. It defaults off. Source presence does not activate providers, establish source truth, deploy a service, or admit a release.

Set `PRIVATE_SOURCE_REF_RESOLVER_URL` to the deployed function base URL; the worker appends `/resolve-life-model-inputs`. The function accepts that path or `/`, POST only, with the shared protected `PRIVATE_SOURCE_REF_RESOLVER_TOKEN`. It also requires `URAI_PRIVATE_LIFE_MODEL_INPUTS_ENABLED=true`, canonical project `urai-4dc1d`, and an exact 40-character `URAI_SOURCE_SHA`. No secret or provider administration is performed by this change.

The request contains only `sourceHandle`, `transcriptRef`, `provenanceRef`, `requestedPurpose: memory-index`, and `idempotencyKey`. Client owner IDs, raw text, URLs and database locators are rejected. The response contains private transcript bytes solely for the protected extractor, exact hashes, original opaque refs, source evidence class, `ownerUid`, `ownerDataEpoch`, `consentRevision`, `sourceRevision`, and resolver source SHA. Do not expose or log that response in a frontend or public receipt.

## Trusted source admission

All registry writes are server-only; runtime Firestore rules deny clients by default. A governed ingest/admission writer must establish these records atomically from an authorized real source receipt. This PR does not seed records or supply such a receipt.

Every record has `schemaVersion: urai-private-life-model-inputs-v1`, `state: current`, `synthetic: false`, and its canonical `ownerId`. Source IDs are opaque identifiers, not document paths. Ref-keyed documents use SHA-256 of the full opaque ref.

| Path | Additional binding fields |
| --- | --- |
| `privateLifeModelSourceHandles/{sha256(sourceHandle)}` | `ownerDataEpoch`, `sourceId`, `sourceSha256`, `sourceReceiptRef`, `sourceRevision`, `transcriptRef`, `provenanceRef` |
| `users/{owner}/privateLifeModelSources/{sourceId}` | `revision`, `sourceSha256`, `sourceFixityRef`, `sourceReceiptRef`, `sourceEvidenceClass`, `transcriptRef`, `provenanceRef`, `transcriptSha256`, `consentRevision`, `consentState: authorized`, `externalProcessingConsent: true`, `purposes: [memory-index]` |
| `users/{owner}/privateLifeModelTranscripts/{sha256(transcriptRef)}` | `opaqueRef`, `sourceId`, `sourceSha256`, `sourceReceiptRef`, `sourceRevision`, `text`, `sha256` |
| `users/{owner}/privateLifeModelProvenance/{sha256(provenanceRef)}` | `opaqueRef`, `sourceId`, `sourceSha256`, `sourceReceiptRef`, `sourceRevision`, `transcriptSha256` |

The source receipt class must be one of `SOURCE_CAPTURED`, `SOURCE_DERIVED`, `DIRECT_SUBJECT_TESTIMONY`, `ATTRIBUTED_TESTIMONY`, `CORROBORATED_INFERENCE`, or `CONTEXTUAL_RESEARCH`. A receipt class describes the source; it does not upgrade testimony into verified history. A writer must preserve source consent, provenance, uncertainty and truth classification. Synthetic demonstrations cannot populate this authority.

The resolver requires fully enforced current `users/{owner}/privacyPolicy/current` with matching owner/revision, allowed Memory/Models/Identity modes, and enabled Memory/Models model context. It also requires current `providerConnections/openai.processingAllowed` without a requested, pending or complete revocation. Source consent must pin that current policy revision and explicitly allow memory indexing and external processing. All artifact source hashes, source revisions and transcript hashes must match. Text is bounded to 240,000 characters and 768,000 UTF-8 bytes.

## Data rights and races

Canonical life-model export includes the three owner input collections and owned global handle metadata in the existing private export object. More than 500 records in any bounded collection fails visibly instead of producing a partial export.

Life-model, all-repository-data and account deletion set `privateLifeModelOwnerBarriers/{sha256(owner)}` before removing any source record. The barrier increments the owner epoch and blocks all prior input authority. Global handles become minimal hashed tombstones with no owner ID, source ID or private refs, and the three input collections are erased by the canonical deletion executor. Handles beyond the 500-record bound require supervised continuation; the barrier remains closed, so overflow never enables stale access or falsely marks deletion complete.

Old handles remain denied even if a delayed job restores their previous bytes. Future newly consented ingest requires deliberate trusted re-admission at the newer owner epoch; do not reset or remove the barrier, reuse old handles or silently revive old records. This PR provides no re-admission action.

Resolution uses a Firestore transaction for source/policy/artifact consistency and a second fresh transaction before response delivery. The worker must still revalidate before its own persistence and delivery. Deletion/revocation after extraction must also fence derivative writes; the Jobs owner-aware revision successor is required before private production admission.

## Executable checks

`npm run build` and `npm test` in `apps/functions` run the TypeScript gate and actual handler tests. The test harness loads the real resolver and canonical privacy handlers with an injected Firestore/storage surface and fictional fixtures. It covers authorization, owner isolation, consent/fixity/source lineage, mid-read authority changes, restored old handles, private export and deletion. It does not contact Firebase, resolve real media or spend provider credits.

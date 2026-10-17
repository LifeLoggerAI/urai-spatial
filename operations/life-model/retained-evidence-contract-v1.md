# Life Model retained receipt validation

The validator checks a receipt contract. It does not certify a Life Model, approve a
deployment, establish private runtime truth, or replace the Release Governance
Guard. Success is `LIFE_MODEL_RELEASE_RECEIPT_CONTRACT` (with a retained-evidence
suffix when applicable). It never emits a release-certified marker. The existing
`certified` field is a declaration being checked, not authority granted by the tool.

The checked-in `release-receipt-v1.json` remains byte-for-byte unchanged, with all
22 gates pending or otherwise unaccepted. The existing receipt schema, gate IDs
and terminal status strings remain stable. Its empty reference arrays still pass
ordinary fail-closed structural validation. Terminal claims, including individual
accepted gates on a `certified: false` receipt, require the evidence below. Legacy
nonempty string references cannot satisfy a terminal claim.

## Trusted inputs and component binding

The operator must supply `GITHUB_SHA` or `CANDIDATE_SHA`,
`COMPONENT_ENVELOPE_SHA256`, and `RELEASE_AUTHOR` outside the submitted receipt.
If both SHA variables are present they must agree. The component hash retains the
existing system-candidate contract: SHA-256 of the `repositories` array in its stored
order, with object keys lexicographically sorted, compact JSON and UTF-8 encoding.
It is not the raw envelope-file digest. The separate `componentEnvelopeRef` checks
the actual envelope bytes, and the envelope must contain the exact Spatial candidate.
Duplicate repository identities fail. Envelope metadata does not grant release authority.

For a terminal claim, the release receipt adds `componentEnvelopeSha256` and
`componentEnvelopeRef`. Every retained reference is an object with `path`,
`sha256`, and positive `byteLength`. Paths are relative to the receipt directory;
missing files, absolute paths, traversal and symlink escapes fail. Each referenced
file is read and its actual byte length and SHA-256 checked. A protected receipt
bundle can live entirely on a private mount; source media and private receipts must
not be committed to this repository. The validator prints errors and scope only,
without printing retained contents.

## Per-gate evidence

Each claimed gate has exactly one entry in `receiptRefs`, containing the retained
reference fields and `gateId`. All 22 entries are required for `--strict` or a
`certified: true` declaration. The referenced JSON object contains:

- `schemaVersion: "urai-life-model-gate-evidence-v1"`, `gateId`, `candidateSha`,
  `componentEnvelopeSha256`, and `result` equal to that gate's terminal status.
- `synthetic: false`, `candidateAcceptance: true`, and the required `evidenceClass`.
- `producer` with `repository`, `sourceSha`, `identity`, `runtimeRevision`,
  `executionId`, and `executionUri`. Repository/source SHA must match an eligible
  producer in the independently bound component envelope. The source allowlist
  is explicit in the validator and any extension requires a reviewed source change.
- Nonempty `artifactRefs` whose actual retained execution bytes are checked.

The first 13 gates through `security` require `private-lifecycle` evidence.
`device` and `xr` require `physical-device` and `physical-xr`. Literal quality and
identity acceptance require `owner-review`. Independent approval requires
`signed-independent-review`; deployment requires `protected-deployment`; production
reverification requires `protected-production`. Accessibility and localization
require `protected-runtime`. These classes describe submitted evidence, not verified
runtime facts. Synthetic tests, source contracts, Quiet Reset, candidate-generation
diagnostics and captured reconstruction camera/training/comparison schemas cannot
stand in for terminal private lifecycle acceptance.

`deploymentRef` must equal the retained deployment gate reference. The retained
`productionFingerprint` JSON uses schema `urai-life-model-production-fingerprint-v1`
and binds candidate, component hash, project, service, observed timestamp and
runtime revision. Its `artifactRef` retains the observed fingerprint bytes;
`fingerprintSha256` must match those actual bytes. Its runtime revision must equal
both the deployment and production-reverification evidence revisions.

## Independent reviewer provenance

`humanApprovalRefs` contains retained JSON with schema
`urai-life-model-independent-review-v1`. It binds repository, candidate,
component hash, release author, `decision: "APPROVED"`, UTC `reviewedAt`, and
a non-reviewer `witness`. `reviewerId` must be `LimberNutz0`,
`reviewerKind` must be `independent-human`, and reviewer must differ from the
externally supplied release author. Eligibility follows the existing separately
governed offline reviewer identity; no native collaborator permission is inferred.

The reviewer signs `reviewMessage(approval)` with their existing Ed25519 identity.
`signature` uses `format: "ed25519"` and base64 `value`. The public key is read only
from the existing governed `docs/release-governance/reviewers/LimberNutz0-public.ssh`;
the CLI has no receipt-supplied key override. Its domain-separated signed message
binds `receiptBundleSha256`: SHA-256 of canonical release-receipt JSON with only
`humanApprovalRefs` omitted to avoid a circular digest. All gate references, artifact
hashes, gate declarations, component bytes, deployment and fingerprint remain bound.
Changing a run, candidate, producer or retained artifact requires a new real signature.

This signature verifies the declared review over retained bytes. It does not infer
owner literal acceptance, provider execution, permission freshness, current review
state, deployment approval or runtime semantics. Actual review and protected runtime
truth remain external governed gates. The independent Release Governance Guard is
unchanged and remains required. Missing genuine review or evidence fails closed;
the tool does not create either.

Tests use disposable temporary files and freshly generated, unregistered test keys.
They prove the contract and rejection cases; the production CLI rejects their signer.
No test output, fixture, or green workflow promotes a gate or grants certification.

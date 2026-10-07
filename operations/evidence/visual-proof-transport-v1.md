# Native visual archive transport

The continuous visual proof workflow keeps its existing complete group artifact,
all route and group assertions, and original PNG bytes. After that native upload,
the workflow downloads **that same artifact ZIP**, verifies the upload action's
SHA-256 against native artifact metadata and downloaded bytes, and divides it
into fixed 23 MiB byte ranges. It does not recreate, recompress, or resize the
proof archive or its images.

Each range is uploaded as its own artifact with compression disabled. The
1 MiB reserve accommodates the native ZIP wrapper; a final read-only Actions API
check enforces that every actual part and manifest artifact is at most 24 MiB.
The small manifest and upload receipt are separate artifacts. No step uploads
the whole transport directory as one artifact. The complete original artifact
remains available independently. At most eight parts (184 MiB original ZIP) are
supported; larger or inconsistent archives fail explicitly.

The `urai-visual-proof-transport-v1` manifest records repository, exact checked-out
source SHA, proof group, native run and attempt, original artifact ID/name,
original ZIP byte count and SHA-256, fixed part size, part count, and the ordered
index/name/byte-count/SHA-256/native-artifact-name of every part. The separate
`urai-visual-proof-upload-receipt-v1` receipt records the native IDs, ZIP sizes,
and ZIP digests of the manifest and individually uploaded wrappers after their
metadata is verified. Both have `validationScope: archive-transport-only`.
Artifact transport proves byte integrity, not route acceptance, human approval,
release certification, or live/private runtime behavior. Diagnostic artifacts
from failed capture jobs can also be transported without becoming accepted proof.

For independent reconstruction, retrieve the manifest and upload receipt, verify
each wrapper against its native ID, ZIP size and digest, and extract its single
expected part file. Supply the part paths in the manifest's exact order and the
independently established source/run/original-artifact identity and ZIP digest:

```sh
node scripts/visual-proof-transport.mjs reconstruct \
  --manifest downloaded/manifest.json --output original-native-visual-proof.zip \
  --source-sha "$EXPECTED_SOURCE_SHA" --archive-sha256 "$EXPECTED_NATIVE_ZIP_SHA256" \
  --group "$EXPECTED_PROOF_GROUP" --run-id "$EXPECTED_RUN_ID" \
  --run-attempt "$EXPECTED_RUN_ATTEMPT" --artifact-id "$EXPECTED_ORIGINAL_ARTIFACT_ID" \
  --part downloaded/visual-proof.zip.part-01 \
  --part downloaded/visual-proof.zip.part-02
```

Include exactly the number of parts declared by the manifest. Reassembly rejects
missing, extra, duplicate, reordered, renamed, truncated, oversized, or changed
parts and mismatched external bindings. Per-part hash changes cannot replace the
externally expected whole ZIP digest. It never overwrites an existing archive,
and removes partial output on failure. Once reassembled, the original receipt,
full route coverage, PNG hashes/dimensions, source/run identity, and applicable
proof assertions still require independent verification.

Native download and metadata checks use only `actions: read`. Repository tokens
are sent solely to the fixed GitHub API endpoint; signed archive storage URLs
receive no token. Source tests use explicitly synthetic bytes and mocked network
responses, and create no real accepted visual evidence.

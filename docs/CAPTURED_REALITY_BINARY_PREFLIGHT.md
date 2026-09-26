# Captured Reality binary preflight

Before privately uploading a web `.splat` derivative, inspect its actual bytes:

```sh
node scripts/inspect-captured-reality-splat.mjs \
  /private/export/scene.splat 67108864 2000000 \
  /private/export/scene-integrity.json
```

Both budgets are explicit inputs. The example uses the current mobile byte ceiling and an example point cap, not a certified device performance limit. Use the approved target-device budget. The receipt is created exclusively; it cannot overwrite an original or earlier receipt. Keep the source, derivative and receipt in private storage.

The streaming inspector checks the installed Drei loader's 32-byte format, hashes the full file, records point-center bounds, and rejects incomplete records, non-finite positions, invalid scales/covariances, invalid quantized rotations, all-transparent output and budget overruns. It does not convert PLY/SPZ or silently repair malformed data. Return bad exports to the reconstruction/export pipeline, preserving the originals.

A passing result is **technical binary validation only**. It does not establish recorded-source authenticity, consent, camera-solve quality, held-out-view fidelity, absence of floaters/holes, collision safety, artistic acceptance, device performance, or release readiness. The receipt explicitly keeps these acceptance claims false. Continue through source-linked reconstruction QA, private delivery, device measurement and independent release review.

Unit tests use synthetic records clearly named as fixtures; they are never presented as a reconstructed place. The Captured Reality Integrity workflow checks these rejection paths without source uploads, provider calls or paid generation.

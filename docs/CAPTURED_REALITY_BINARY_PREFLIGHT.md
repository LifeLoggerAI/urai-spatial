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

The browser's preliminary GET checks a readable HTTP 200 body, an unencoded and non-partial response, a whole number of 32-byte records, and the device byte ceiling. It cancels that preliminary stream after inspecting headers. These checks do not inspect the actual record bytes or prove that the subsequent renderer request receives the same immutable object. Configure private storage CORS to expose `Content-Length`, `Content-Encoding` and `Content-Range`; otherwise JavaScript cannot inspect hidden response headers. The runtime object must remain immutable, and the full binary inspection receipt must refer to that object's checksum.

Renderer failures leave exit and provenance controls usable, and capability probes release their temporary WebGL contexts. The private route no longer mounts Drei's shared URL loader. Its replacement owns cancellation, streaming and GPU resources for each mount. Browser lifecycle and interrupted-stream verification against a real private reconstruction remain necessary before release; the error boundary and unit tests do not replace those checks.

## Private renderer ownership

The private route uses a per-mount splat session instead of Drei's shared URL loader cache. The actual renderer GET enforces the declared byte budget, exact body length, 32-byte records, finite positions/scales, valid rotations and visible points. Exit, account revocation and unmount abort the stream, cancel its reader, terminate any sorting worker, dispose GPU resources and erase retained CPU arrays. Alpha-hashed rendering needs no sorting worker. Shader/format adaptation retains the upstream MIT notice.

`captured-reality-owned-session.test.mjs` exercises real streaming, Three texture/geometry lifecycle and worker sorting using synthetic format fixtures. These checks do not certify a real reconstruction, browser GPU rendering, device performance or launch readiness; those gates remain separate.

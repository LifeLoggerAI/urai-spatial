# Unsigned Android binary transport

The unsigned prep workflow retains the original full AAB artifact and its SHA-256 receipt. It also retains an exact-source transport manifest and deterministic numbered part artifacts. Each raw part is at most 24 MiB and is uploaded without compression, leaving space below a 32 MiB ZIP download ceiling. There are at most eight parts; larger bundles fail preparation instead of silently exceeding the bound.

Record the GitHub run ID, exact head SHA, artifact IDs, ZIP sizes and GitHub artifact digests before downloading. Verify each downloaded ZIP digest and ZIP CRC before extracting its single numbered part. The manifest records the original full bundle byte count and SHA-256, and each part's index, name, byte count and SHA-256. Compare the manifest's full hash with the original `android-aab.sha256` receipt. Use the immutable source version of the reconstruction script, supplying the exact head and part paths in manifest order:

```sh
node scripts/android-aab-transport.mjs reconstruct \
  --manifest transport/android-aab-transport.json \
  --source-sha "$EXACT_SOURCE_SHA" \
  --expected-sha256 "$ORIGINAL_AAB_SHA256" \
  --output reconstructed-app-release.aab \
  --part transport/app-release.aab.part-01 \
  --part transport/app-release.aab.part-02
```

Supply every part; the example shows two only. The script rejects missing, reordered, duplicated, changed, oversized or incorrectly sourced parts. It verifies each part and the complete binary hash and size, deletes a failed partial output, and refuses to overwrite an existing output. Only then inspect the bundle archive, package identity, version, native configuration and absence of signing material.

These artifacts prove unsigned binary identity. They do not prove signing, provider acceptance, Android App Link verification, physical device behavior or Play submission.

# Embedded founder event video

This directory stores the offline founder-event video as deterministic base64 JavaScript chunks because the repository write connector accepts UTF-8 text but not direct local binary uploads.

## Player

Open:

`../offline-video.html`

The page concatenates the three committed chunks, decodes them in memory, creates a local `video/webm` Blob, and plays it without network access.

## Payload

- Codec/container: silent VP8 WebM
- Dimensions: 320 × 180
- Duration: 72 seconds
- Decoded size: 22,263 bytes
- Base64 length: 29,684 characters
- SHA-256: `1280a31745e5cfc98eea64f733468daa064ce1d799026f98090485bedb1f8c6c`
- EBML magic: `1a45dfa3`

## Content

The video is a synthetic route storyboard covering:

1. Event
2. Home
3. Life Map
4. Focus
5. Replay
6. Mirror
7. Passport
8. Status

Every frame is sample-safe. The video contains no customer, account, credential, admin, console, environment, or production data. It is an offline operational fallback, not evidence that the live site or production deployment matches the reviewed source.

## Verification

Run:

```bash
node scripts/verify-embedded-event-video.mjs
```

The verifier checks all chunks, exact encoded and decoded lengths, SHA-256, EBML/WebM magic, player references, route labels, sample-safe disclosure, and absence of network-capable calls.

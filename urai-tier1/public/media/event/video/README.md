# Embedded founder event video

This directory stores the offline founder-event video as deterministic base64 JavaScript chunks because the repository write connector accepts UTF-8 text but not direct local binary uploads.

## Player

Open:

`../offline-video.html`

The page concatenates the three committed chunks, decodes them in memory, creates a local `video/webm` Blob, and plays it without network access.

## Payload

- Codec/container: silent VP8 WebM
- Dimensions: 160 × 90
- Frame rate: 1 fps
- Duration: 72 seconds
- Decoded size: 9,603 bytes
- Base64 length: 12,804 characters
- SHA-256: `7812d1f74db521288948ac8aebcd189065a9e7821d8f77cb8e506ea6141fa11c`
- EBML magic: `1a45dfa3`
- Full FFmpeg decode: passed
- Machine-readable evidence: `verification.json`

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

## Direct verification performed

The exact bytes represented by the three committed chunks were generated and checked with:

- `ffprobe` for VP8 codec, 160 × 90 dimensions, 1 fps, 72.000-second duration, and 9,603-byte size;
- `sha256sum` for the hash above;
- a full `ffmpeg -v error -i <file> -f null -` decode, which completed without errors.

## Repository verification

Run:

```bash
node scripts/verify-embedded-event-video.mjs
```

The verifier checks all chunks, exact encoded and decoded lengths, SHA-256, EBML/WebM magic, player references, route labels, machine-readable evidence, sample-safe disclosure, and absence of network-capable calls.

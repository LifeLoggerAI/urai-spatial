# URAI Spatial Deploy Evidence — 2026-06-23

## Result

URAI Spatial static public build deployed successfully to Firebase Hosting.

## Build

- Next.js build passed.
- Static export completed.
- Generated static pages: 110/110.
- Firebase Hosting found 358 files in `urai-tier1/out`.

## Deploy

- Project: `urai-4dc1d`
- Hosting URL: `https://urai-4dc1d.web.app`
- Deploy result: complete.

## Live Route Verification

All public launch routes returned HTTP 200:

```text
200 /
200 /home
200 /ground
200 /life-map
200 /focus
200 /replay
200 /mirror
200 /passport
200 /status
200 /location-map
200 /privacy-controls
```

## Notes

Warnings observed during build were non-blocking:
- protobufjs dynamic dependency warning through Firebase/Firestore.
- ESLint Next plugin warning.
- Static export warning about API routes and middleware not running on static hosting.

Public Spatial surface is live and route-verified.

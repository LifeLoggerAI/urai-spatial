# URAI Final Launch Checklist

## Repo closeout status

- Home: final cinematic threshold route patched.
- Ground: premium private-world route patched.
- Life Map: explorable 3D galaxy route patched.
- Focus: selected memory chamber route patched.
- Replay: cinematic memory film route patched.
- Mirror: reflection realm route patched.
- Passport: identity and consent vault route patched.
- Status: live route control room patched.
- XR: Quest/WebXR fallback and manual proof messaging patched.
- Asset audit: `scripts/final-asset-receipt.mjs` added.

## Required proof before declaring launch complete

1. Pull latest `main`.
2. Run typecheck.
3. Run unit tests.
4. Run production build.
5. Deploy to Firebase Hosting project `urai-4dc1d`.
6. Verify route status codes for the public chain.
7. Verify live code markers for Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Status, and XR.
8. Capture desktop screenshots.
9. Capture mobile screenshots.
10. Run final asset receipt script.
11. Manually test Quest Browser before claiming Quest verified.

## Human-only proof

- Quest 2 / Quest Browser proof requires actual headset hardware.
- Provider readiness requires real provider keys and account access.
- Paid or billing-gated cloud features require project billing access.

## Do not claim complete unless

- Build passes.
- Tests pass or failures are documented as non-launch blockers.
- Firebase deploy completes.
- Live routes return 200.
- Live pages show the expected final markers.
- Screenshots are saved in `~/urai-final-receipts/<timestamp>/screenshots`.

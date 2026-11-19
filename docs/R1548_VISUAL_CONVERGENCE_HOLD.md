# R1548 — Existing splat + digital-human integration (REVIEW ONLY)

Base: Spatial #2134 at 9a12e640dbe355bd88bfb4938ee60fafe3c9d81b.
Donors: synthetic Home review PR #2133 and anonymous digital-human lab PR #1850.
No original Home, Orb, navigation, existing Council six rigs, or Council AI conversation panel replaced.

## Actual scoped integration
- Reused synthetic Home Gaussian layer and exact deterministic splat generator (83,360 points).
- Retained fail-closed source and header checks; next.config.mjs NOT modified.
- Added an anonymous audio-clock facial fixture inside the existing Council Canvas.
- It is enabled only by NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION=true and /council?anonymousFaceLab=1.
- Asset generation additionally requires URAI_REVIEW_VISUAL_FIXTURES=true and refuses hosted or release builds.
- Generated GLB and splat are ephemeral test outputs; no personal media, actual voice, or identity used.

## Executed local proof
- 19 focused tests PASS; typecheck PASS; optimized Next.js build EXIT 0.
- NVIDIA RTX PRO 4000 Blackwell, WebGL 2, ANGLE Vulkan renderer.
- Original Home world mounted and synthetic splat HTTP 200.
- Council original models retained; anonymous facial GLB HTTP 200.
- Six morphable meshes, ten channels, 60 morph bindings; real media clock.
- Facial region comparison: 4,266 changed pixels / 66,397 sampled, RGB delta 9.42; weights return to 0 after stop.
- Screenshot SHA-256 receipts, renderer information and status are stored in the companion JSON.
- Build emitted known third-party protobuf and Next ESLint warnings; not falsely marked warning-free.

## Not certified
No genuine speech or phoneme alignment, no approved photoreal digital person, no captured private home, no independent Gold Master acceptance, no measured real-device/mobile performance, no complete authenticated user journey.
This is a local reviewed test checkout; exact submitted PR-head rebuild and independent browser test still required.
Existing Vercel staging deployment remains source-provenance FAIL; no new deploy or access change occurred.
Production HOLD / NO-GO; private-memory writes DISABLED; SSO required.

## Next action
Independently test the exact new branch commit; compare desktop/mobile frames and actual splat pixel contribution, then wire authorized speech timing to approved visemes and gestures. No unauthorized merge, guest-share link, provider spend or release decision.

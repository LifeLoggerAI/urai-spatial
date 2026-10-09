# UrAi Passport empty-owner repair

Integration destination: the existing Spatial owner PR #1636, branch
`repair/release-closure-integration-20261007`. The inspected starting source is
`8c74d00a1ff1775bb65c69f25941cbb9e185b893`, tree
`f7e2a2adf6d84a04dc028451cb412e790e159ad0`.

## Corrected behavior

A trusted snapshot with no sources, devices, or receipts is classified as
`empty`. It previously disabled export scopes, export/deletion requests, and
ready-export downloads even when the current authenticated owner had a
server-derived authorized ownership key. A new owner could therefore not use
these privacy controls until unrelated records existed.

Both `empty` and `private` trusted snapshots now permit the existing controls.
Recent authentication, exact deletion confirmation, current account/session,
online availability, cancellation, and stale-response fences remain intact.
Demo, signed-out, loading, unavailable, and offline states remain denied.
No backend policy or deletion implementation changes.

Original browser pixels from the starting source also reveal mid-word export
scope labels. The generic full-width input rule overrides checkbox sizing.
The targeted checkbox rule restores a fixed 22px control while retaining the
enclosing 48px label activation area. Browser checks now measure actual text
rectangles, checkbox dimensions, and unobstructed label hit areas at 1440px,
390px, and 320px, with retained PNGs and geometry JSON. Existing browser
security, keyboard, motion, fallback, and offline assertions remain.

## Executed evidence and limits

- Exact predecessor component source with the new 13-case regression: 7 pass,
  6 fail. The failures reproduce empty-owner request/download denial.
- Corrected component and retained focused suites: 105 pass, 0 fail, 0 skip
  on Node 22.23.3 with the declared pnpm 10.0.0 frozen dependency graph.
- Runtime TypeScript checking passes with the installed declared dependencies.
- The static production build passes on Node 22.23.3, including the checkbox
  correction, generating all 151 pages. This is a modified working-tree build
  based on the starting source; its inherited base fingerprint is not an
  immutable successor identity. Native publication must bind the actual donor
  SHA and independently execute the browser checks.
- Playwright discovers all six browser cases. Local Chromium installation
  fails because the downloaded archives are truncated; discovery is not
  browser execution. The existing Passport workflow is extended to this owner
  destination and runs the focused contracts, unchanged static build, six
  actual Chromium cases, and exact-head artifact retention.
- Thirteen retained source/archive tests pass for manual Apple containment.
  The manual-only workflow is byte-identical to the separately reviewed
  containment leaf `ab53b956ef51e791e2c0c54a3f3ed5c75b5a1f93` from donor #1761.
  This does not admit the remainder of that donor or establish Apple acceptance.

The new component tests compile the production TSX with real TypeScript and
execute it with explicitly synthetic hook/Auth/callable/session adapters.
They do not initialize Firebase, contact a provider, process private records,
delete any account, or certify staging/production privacy acceptance.

The starting-source Passport artifact is run `37867358881`, artifact
`11588748695`, ZIP SHA-256
`510d0d65fb3a3055b2d3935878eaf8cfcb6e361d260ba7f054f285e0fd6a01be`.
Its original desktop/mobile pixels were inspected to identify the sizing
defect. Those pixels are predecessor evidence, not successor certification.

## Admission and acceptance

This is an isolated donor into the current component owner. No owner/main
ref, independent approval, deployment, signing, provider budget, or private
processing authority is changed. Apple remains excluded, Play internal only,
Stripe LIVE disabled, and Twilio TEST only.

The exact published donor must obtain fresh native evidence and required
review, be admitted through the existing owner under a fresh source lease,
and be verified on the combined owner source. Complete Passport private
export/download/recovery/deletion acceptance and full-estate release remain
OPEN. The register's original acceptance text is not reduced by this repair.

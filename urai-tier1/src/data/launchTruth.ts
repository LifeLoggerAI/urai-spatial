export type LaunchRouteState = 'source-implemented' | 'certified-live' | 'preview' | 'blocked' | 'certification-pending'

export type LaunchRoute = {
  path: string
  label: string
  group: 'Launch spine' | 'Trust and place' | 'Showcase and XR'
  state: LaunchRouteState
  proofBoundary: string
  publicClaim: string
}

export type LaunchGateState = 'green' | 'pending' | 'blocked'

export type LaunchGate = {
  id: string
  label: string
  state: LaunchGateState
  evidence: string
  next: string
}

export const launchTruth = {
  generated: '2026-10-01',
  repository: 'LifeLoggerAI/urai-spatial',
  runtimeRoot: 'urai-tier1',
  canonicalPublicApp: 'https://urai.app',
  doctrine: 'docs/URAI_LAUNCH_DOCTRINE.md',
  launchLock: 'docs/URAI_LAUNCH_LOCK.md',
  ledger: 'docs/V1_V100_VERIFICATION_LEDGER.md',
  runbook: 'docs/P0_VERIFICATION_CLOSURE_RUNBOOK.md',
  trackingIssue: '#834',
  phase: 'pre-review candidate; production certification is resolved only from the protected live fingerprint',
  finalBlockers: ['independent exact-head approval', 'protected production deployment', 'post-deploy certification', 'physical XR device proof', 'provider activation', 'supporting-service certification'],
  safeClaim:
    'When and only when the protected urai.app fingerprint validates verified-post-deploy-smoke for an exact release SHA, the canonical Spatial web release may be described as verified live for that fingerprinted web scope. Demo data remains disclosed, physical XR remains preview-only, and providers and supporting services retain separate gates.',
  unsafeClaim:
    'Do not infer current-candidate production certification from source code, historical receipts, static route metadata, provider configuration, physical-XR preview, private backend integrations, autonomous real-world actions, or regulated outcomes. The protected current fingerprint and exact receipts are authoritative.',
  firstThirtySeconds: {
    what: 'A living AI operating ecosystem for memory, identity, spatial intelligence, proof, and human-centered digital continuity.',
    why: 'It turns scattered human data, stories, experiences, and digital systems into something structured, useful, interactive, and eventually persistent across time.',
    whyNow:
      'AI, spatial computing, cloud infrastructure, autonomous agents, and personal data systems have converged enough to make this practical now.',
    whyURAI:
      'URAI is not just a chatbot, app, or demo. It is a system of systems with public surfaces, private intelligence, proof receipts, launch readiness, asset manifests, spatial environments, and human-approved workflows.',
  },
  gates: [
    {
      id: 'DEPLOY-SHA',
      label: 'Exact deployed SHA',
      state: 'pending',
      evidence: 'Source implements a protected /release-fingerprint.json contract; current release identity must be read from the live fingerprint and exact deployment receipt.',
      next: 'Require the final reviewed candidate to be deployed through protected authority and earn verified-post-deploy-smoke before this gate is live-certified.',
    },
    {
      id: 'ROLLBACK-SHA',
      label: 'Rollback SHA',
      state: 'pending',
      evidence: 'Rollback contracts require a distinct executable target; the final release must retain and verify the actual rollback SHA in its protected deployment receipt.',
      next: 'Keep the rollback target distinct, ancestral, buildable, and independently proven for the exact final deployment.',
    },
    {
      id: 'CURRENT-MAIN-VERIFY',
      label: 'Current-main verification',
      state: 'pending',
      evidence: 'Candidate verification is exact-SHA bound; no static source record can certify a later main or candidate SHA.',
      next: 'Treat the final reviewed merge/deployment identity as unverified until fresh exact-head and post-deploy evidence exists.',
    },
    {
      id: 'PRIVACY-PARITY',
      label: 'Privacy Controls route parity',
      state: 'pending',
      evidence: 'The dedicated Privacy Controls route has source/runtime proof; production parity for the final release remains fingerprint and post-deploy-smoke bound.',
      next: 'Preserve dedicated route ownership and reversible-consent copy and re-prove production parity after final deployment.',
    },
    {
      id: 'STATUS-TRUTH',
      label: 'Status production truth',
      state: 'pending',
      evidence: 'Status is implemented to read release and rollback identity only from the protected public fingerprint and fails closed while authority is unresolved.',
      next: 'Fail visibly if the fingerprint is unavailable, pending, stale, or malformed; never substitute a candidate or historical SHA.',
    },
    {
      id: 'V2-V3-ASSETS',
      label: 'Provider asset activation',
      state: 'blocked',
      evidence: 'Provider-backed asset promotion remains separate from the certified V1 web release.',
      next: 'Activate only through provider receipts, licensing, quality review, and governed promotion.',
    },
    {
      id: 'XR-DEVICE-PROOF',
      label: 'XR and Quest proof',
      state: 'blocked',
      evidence: 'The browser XR entry is live as a preview; physical Quest certification is not inferred from desktop or mobile evidence.',
      next: 'Keep XR labeled preview until physical browser, controller, comfort, recovery, and device evidence exists.',
    },
  ] satisfies LaunchGate[],
  routes: [
    {
      path: '/',
      label: 'Home threshold entry',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Source route exists; live certification requires a valid protected fingerprint and exact post-deploy route/slash evidence.',
      publicClaim: 'Fingerprint-gated Home threshold.',
    },
    {
      path: '/home',
      label: 'Canonical Home World',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Source route exists; live certification requires a valid protected fingerprint and exact post-deploy route/slash evidence.',
      publicClaim: 'Fingerprint-gated Home world.',
    },
    {
      path: '/ground',
      label: 'Private operating world',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Source route exists; live web certification remains fingerprint-gated and autonomous real-world actions remain permissioned and separately gated.',
      publicClaim: 'Fingerprint-gated Ground surface with human-approved workflow framing.',
    },
    {
      path: '/life-map',
      label: 'Spatial memory galaxy',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Source route exists; final live constellation/navigation certification is exact-deployment gated and private persistence claims remain separate.',
      publicClaim: 'Fingerprint-gated spatial Life Map.',
    },
    {
      path: '/focus',
      label: 'Selected memory chamber',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Demo identity source contracts exist; final live redirect/hydration certification must bind to the exact deployed release.',
      publicClaim: 'Fingerprint-gated Focus chamber for disclosed demo identity.',
    },
    {
      path: '/replay',
      label: 'Memory film route',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Demo identity source contracts exist; final live redirect/hydration certification must bind to the exact deployed release.',
      publicClaim: 'Fingerprint-gated Replay route for disclosed demo identity.',
    },
    {
      path: '/life-movie',
      label: 'Private Life Movie continuum',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Private owner manifest, chapter truth/provenance, consent, and Replay handoff are source-verified; live certification requires the exact deployed release and does not imply any private family film is publicly published.',
      publicClaim: 'Fingerprint-gated private Life Movie runtime; private source material remains owner-scoped.',
    },
    {
      path: '/mirror',
      label: 'Reflection realm',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Source route and visual proof exist; final live certification remains fingerprint-gated and no diagnostic or clinical claim is made.',
      publicClaim: 'Fingerprint-gated reflection surface.',
    },
    {
      path: '/passport',
      label: 'Identity vault',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Source ownership/consent surface exists; final live certification remains fingerprint-gated and private identity backend scope remains separate.',
      publicClaim: 'Fingerprint-gated ownership-vault surface.',
    },
    {
      path: '/status',
      label: 'Evidence control room',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Reads exact live authority from the protected fingerprint; source metadata alone never certifies production.',
      publicClaim: 'Fingerprint-gated evidence and claim-boundary room.',
    },
    {
      path: '/privacy-controls',
      label: 'Permission controls',
      group: 'Trust and place',
      state: 'certification-pending',
      proofBoundary: 'Dedicated route ownership is source-verified; final live parity remains fingerprint-gated and consent remains reversible and human-led.',
      publicClaim: 'Fingerprint-gated privacy-control surface.',
    },
    {
      path: '/location-map',
      label: 'Place and emotional weather',
      group: 'Trust and place',
      state: 'certification-pending',
      proofBoundary: 'Symbolic place UX is source-verified; final live certification remains fingerprint-gated and no precise-location provider claim is made.',
      publicClaim: 'Fingerprint-gated symbolic place surface.',
    },
    {
      path: '/demo',
      label: 'Public walkthrough',
      group: 'Showcase and XR',
      state: 'certification-pending',
      proofBoundary: 'The walkthrough is disclosed demo fixture content; final live route certification remains fingerprint-gated.',
      publicClaim: 'Fingerprint-gated disclosed public walkthrough.',
    },
    {
      path: '/demo/replay-film',
      label: 'Replay film proof surface',
      group: 'Showcase and XR',
      state: 'certification-pending',
      proofBoundary: 'The proof film is disclosed demo content; final live route certification remains fingerprint-gated and does not certify private persistence.',
      publicClaim: 'Fingerprint-gated disclosed replay-film surface.',
    },
    {
      path: '/spatial/ar-vr',
      label: 'Explorable XR entry',
      group: 'Showcase and XR',
      state: 'preview',
      proofBoundary: 'Browser rendering and controls are live; physical Quest/WebXR certification remains separate.',
      publicClaim: 'Live XR browser preview; physical device certification not claimed.',
    },
  ] satisfies LaunchRoute[],
} as const

export const launchRouteGroups = ['Launch spine', 'Trust and place', 'Showcase and XR'] as const

export function getRoutesByGroup(group: (typeof launchRouteGroups)[number]) {
  return launchTruth.routes.filter((route) => route.group === group)
}

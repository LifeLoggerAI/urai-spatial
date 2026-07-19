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
  generated: '2026-07-19',
  repository: 'LifeLoggerAI/urai-spatial',
  runtimeRoot: 'urai-tier1',
  canonicalPublicApp: 'https://urai.app',
  doctrine: 'docs/URAI_LAUNCH_DOCTRINE.md',
  launchLock: 'docs/URAI_LAUNCH_LOCK.md',
  ledger: 'docs/V1_V100_VERIFICATION_LEDGER.md',
  runbook: 'docs/P0_VERIFICATION_CLOSURE_RUNBOOK.md',
  trackingIssue: '#834',
  phase: 'canonical Spatial web release live; supporting estate certification continues',
  finalBlockers: ['physical XR device proof', 'provider activation', 'supporting-service certification'],
  safeClaim:
    'The canonical URAI Spatial web release is verified live through a protected release fingerprint, exact-head deployment receipt, route and slash parity, desktop and mobile identity checks, and an executable rollback target. Demo data remains disclosed, physical XR remains preview-only, and supporting services retain separate gates.',
  unsafeClaim:
    'Do not present the full 19-repository ecosystem, provider-backed assets, physical XR devices, private backend integrations, autonomous real-world actions, or regulated outcomes as certified until their separate receipts prove those claims.',
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
      state: 'green',
      evidence: 'The protected release writes /release-fingerprint.json and issue #834 records the successful deployment run.',
      next: 'Require every later deployment to replace the fingerprint through the same protected authority.',
    },
    {
      id: 'ROLLBACK-SHA',
      label: 'Rollback SHA',
      state: 'green',
      evidence: 'A distinct executable rollback target and recovery command are retained with the protected deployment receipt.',
      next: 'Keep the rollback target distinct, ancestral, buildable, and independently proven on every release.',
    },
    {
      id: 'CURRENT-MAIN-VERIFY',
      label: 'Current-main verification',
      state: 'green',
      evidence: 'The deployed main SHA passed exact-head verification, frozen install, typecheck, AAA, XR, build, attestation, and live smoke.',
      next: 'Treat any later main commit as unverified until a new exact protected receipt exists.',
    },
    {
      id: 'PRIVACY-PARITY',
      label: 'Privacy Controls route parity',
      state: 'green',
      evidence: 'The dedicated Privacy Controls route passed the canonical post-deployment route and visual smoke.',
      next: 'Preserve dedicated route ownership and reversible-consent copy in future releases.',
    },
    {
      id: 'STATUS-TRUTH',
      label: 'Status production truth',
      state: 'green',
      evidence: 'Status reads the deployed release and rollback identity from the protected public fingerprint instead of a hand-maintained SHA.',
      next: 'Fail visibly if the fingerprint is unavailable or malformed; never silently substitute a candidate SHA.',
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
      state: 'certified-live',
      proofBoundary: 'Canonical protected deployment and route/slash smoke passed.',
      publicClaim: 'Verified live Home threshold.',
    },
    {
      path: '/home',
      label: 'Canonical Home World',
      group: 'Launch spine',
      state: 'certified-live',
      proofBoundary: 'Canonical protected deployment and route/slash smoke passed.',
      publicClaim: 'Verified live Home world.',
    },
    {
      path: '/ground',
      label: 'Private operating world',
      group: 'Launch spine',
      state: 'certified-live',
      proofBoundary: 'The public web world is certified; autonomous real-world actions remain permissioned and separately gated.',
      publicClaim: 'Verified live Ground surface with human-approved workflow framing.',
    },
    {
      path: '/life-map',
      label: 'Spatial memory galaxy',
      group: 'Launch spine',
      state: 'certified-live',
      proofBoundary: 'The public-safe constellation and navigation are certified; private persistence claims remain separate.',
      publicClaim: 'Verified live spatial Life Map.',
    },
    {
      path: '/focus',
      label: 'Selected memory chamber',
      group: 'Launch spine',
      state: 'certified-live',
      proofBoundary: 'Demo memory, manifest, and node query identity passed redirects and hydration on desktop and mobile.',
      publicClaim: 'Verified live Focus chamber for disclosed demo identity.',
    },
    {
      path: '/replay',
      label: 'Memory film route',
      group: 'Launch spine',
      state: 'certified-live',
      proofBoundary: 'Demo memory, manifest, and node query identity passed redirects and hydration on desktop and mobile.',
      publicClaim: 'Verified live Replay route for disclosed demo identity.',
    },
    {
      path: '/mirror',
      label: 'Reflection realm',
      group: 'Launch spine',
      state: 'certified-live',
      proofBoundary: 'Web route and visual surface are certified; no diagnostic or clinical claim is made.',
      publicClaim: 'Verified live reflection surface.',
    },
    {
      path: '/passport',
      label: 'Identity vault',
      group: 'Launch spine',
      state: 'certified-live',
      proofBoundary: 'Web ownership and consent surface is certified; private identity backend scope remains separate.',
      publicClaim: 'Verified live ownership-vault surface.',
    },
    {
      path: '/status',
      label: 'Evidence control room',
      group: 'Launch spine',
      state: 'certified-live',
      proofBoundary: 'Reads exact live authority from the public protected fingerprint and preserves claim boundaries.',
      publicClaim: 'Verified live evidence and claim-boundary room.',
    },
    {
      path: '/privacy-controls',
      label: 'Permission controls',
      group: 'Trust and place',
      state: 'certified-live',
      proofBoundary: 'Dedicated route ownership and live parity are certified; consent remains reversible and human-led.',
      publicClaim: 'Verified live privacy-control surface.',
    },
    {
      path: '/location-map',
      label: 'Place and emotional weather',
      group: 'Trust and place',
      state: 'certified-live',
      proofBoundary: 'Symbolic place UX is certified; no live precise-location provider claim is made.',
      publicClaim: 'Verified live symbolic place surface.',
    },
    {
      path: '/demo',
      label: 'Public walkthrough',
      group: 'Showcase and XR',
      state: 'certified-live',
      proofBoundary: 'The walkthrough is disclosed as demo fixture content and carries explicit demo identity.',
      publicClaim: 'Verified live disclosed public walkthrough.',
    },
    {
      path: '/demo/replay-film',
      label: 'Replay film proof surface',
      group: 'Showcase and XR',
      state: 'certified-live',
      proofBoundary: 'The proof film is disclosed demo content and does not certify private persistence.',
      publicClaim: 'Verified live disclosed replay-film surface.',
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

export type LaunchRouteState = 'source-implemented' | 'preview' | 'blocked' | 'certification-pending'

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
  generated: '2026-07-07',
  repository: 'LifeLoggerAI/urai-spatial',
  runtimeRoot: 'urai-tier1',
  canonicalPublicApp: 'https://urai.app',
  doctrine: 'docs/URAI_LAUNCH_DOCTRINE.md',
  launchLock: 'docs/URAI_LAUNCH_LOCK.md',
  ledger: 'docs/V1_V100_VERIFICATION_LEDGER.md',
  runbook: 'docs/P0_VERIFICATION_CLOSURE_RUNBOOK.md',
  trackingIssue: '#461',
  phase: 'conversion: system -> product -> public proof -> trust -> launch -> momentum',
  finalBlockers: ['verification', 'deployment identity', 'route parity', 'final public clarity'],
  safeClaim:
    'URAI Spatial is reachable as a privacy-safe fallback/demo spatial shell with a substantial V1 web experience, public route proof, receipt infrastructure, V1 asset evidence, and future provider seams.',
  unsafeClaim:
    'V1-V100 are complete, production-certified, provider-active, device-certified, backend-integrated, or externally verified end-to-end.',
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
      state: 'blocked',
      evidence: 'Not yet recorded in an immutable deployment receipt.',
      next: 'Run the P0 closure receipt and attach exact deployed commit identity.',
    },
    {
      id: 'ROLLBACK-SHA',
      label: 'Rollback SHA',
      state: 'blocked',
      evidence: 'No verified rollback target is recorded before deploy.',
      next: 'Record a distinct rollback ancestor and rollback command before green production claim.',
    },
    {
      id: 'CURRENT-MAIN-VERIFY',
      label: 'Current-main verification',
      state: 'pending',
      evidence: 'Runbook exists; current command output must be attached as receipt.',
      next: 'Run typecheck, build, route audit, tier1 verify, and tier5 verify from urai-tier1.',
    },
    {
      id: 'PRIVACY-PARITY',
      label: 'Privacy Controls route parity',
      state: 'pending',
      evidence: 'Dedicated source owner exists; live parity must be externally verified.',
      next: 'Verify /privacy-controls renders Privacy Controls content, not Home threshold content.',
    },
    {
      id: 'STATUS-TRUTH',
      label: 'Status production truth',
      state: 'pending',
      evidence: 'Status source distinguishes implementation from production certification.',
      next: 'Bind Status to deployment identity, rollback identity, route/content parity, and receipt results.',
    },
    {
      id: 'V2-V3-ASSETS',
      label: 'Provider asset activation',
      state: 'blocked',
      evidence: 'V2/V3 provider assets remain missing/pending in the current ledger.',
      next: 'Do not block V1 launch on final assets; keep slots ready and claims gated.',
    },
    {
      id: 'XR-DEVICE-PROOF',
      label: 'XR and Quest proof',
      state: 'blocked',
      evidence: 'XR is preview/source work only without physical device certification.',
      next: 'Keep XR as preview until browser/device proof exists.',
    },
  ] satisfies LaunchGate[],
  routes: [
    {
      path: '/',
      label: 'Home threshold entry',
      group: 'Launch spine',
      state: 'source-implemented',
      proofBoundary: 'Route source exists; production certification requires exact deploy and route parity receipt.',
      publicClaim: 'Implemented launch-spine route, certification pending.',
    },
    {
      path: '/home',
      label: 'Canonical Home World',
      group: 'Launch spine',
      state: 'source-implemented',
      proofBoundary: 'Route source exists; production certification requires exact deploy and route parity receipt.',
      publicClaim: 'Implemented public home surface, certification pending.',
    },
    {
      path: '/ground',
      label: 'Private operating world',
      group: 'Launch spine',
      state: 'source-implemented',
      proofBoundary: 'Public demo/shell only; no autonomous real-world actions claim.',
      publicClaim: 'Implemented operating-world surface with human-approved workflow framing.',
    },
    {
      path: '/life-map',
      label: 'Spatial memory galaxy',
      group: 'Launch spine',
      state: 'source-implemented',
      proofBoundary: 'Public-safe memory constellation; not a claim of persistent private memory backend.',
      publicClaim: 'Implemented spatial memory visualization surface.',
    },
    {
      path: '/focus',
      label: 'Selected memory chamber',
      group: 'Launch spine',
      state: 'source-implemented',
      proofBoundary: 'Query preservation must pass live parity receipt.',
      publicClaim: 'Implemented focus route, certification pending.',
    },
    {
      path: '/replay',
      label: 'Memory film route',
      group: 'Launch spine',
      state: 'source-implemented',
      proofBoundary: 'Query preservation and route fingerprint must pass live parity receipt.',
      publicClaim: 'Implemented replay route, certification pending.',
    },
    {
      path: '/mirror',
      label: 'Reflection realm',
      group: 'Launch spine',
      state: 'source-implemented',
      proofBoundary: 'Fallback/demo reflection surface; not a diagnostic or clinical claim.',
      publicClaim: 'Implemented reflection route, certification pending.',
    },
    {
      path: '/passport',
      label: 'Identity vault',
      group: 'Launch spine',
      state: 'source-implemented',
      proofBoundary: 'Identity UX surface; not yet certified as production identity backend.',
      publicClaim: 'Implemented identity-vault surface, certification pending.',
    },
    {
      path: '/status',
      label: 'Evidence control room',
      group: 'Launch spine',
      state: 'certification-pending',
      proofBoundary: 'Must render launch truth and not overclaim live certification.',
      publicClaim: 'Public evidence and claim-boundary room.',
    },
    {
      path: '/privacy-controls',
      label: 'Permission controls',
      group: 'Trust and place',
      state: 'certification-pending',
      proofBoundary: 'Must render dedicated Privacy Controls source and pass live parity.',
      publicClaim: 'Implemented privacy-control surface, live parity pending.',
    },
    {
      path: '/location-map',
      label: 'Place and emotional weather',
      group: 'Trust and place',
      state: 'source-implemented',
      proofBoundary: 'Symbolic/place UX only; not a claim of live precise location provider.',
      publicClaim: 'Implemented place visualization surface, certification pending.',
    },
    {
      path: '/demo',
      label: 'Public walkthrough',
      group: 'Showcase and XR',
      state: 'source-implemented',
      proofBoundary: 'Demo must match launch-lock claims and avoid V1-V100 completion language.',
      publicClaim: 'Implemented public walkthrough surface.',
    },
    {
      path: '/demo/replay-film',
      label: 'Replay film proof surface',
      group: 'Showcase and XR',
      state: 'source-implemented',
      proofBoundary: 'Demo route proof only; not backend persistence certification.',
      publicClaim: 'Implemented replay-film proof surface.',
    },
    {
      path: '/spatial/ar-vr',
      label: 'Explorable XR entry',
      group: 'Showcase and XR',
      state: 'preview',
      proofBoundary: 'Physical Quest/WebXR certification remains separate and blocked until device evidence exists.',
      publicClaim: 'XR preview only.',
    },
  ] satisfies LaunchRoute[],
} as const

export const launchRouteGroups = ['Launch spine', 'Trust and place', 'Showcase and XR'] as const

export function getRoutesByGroup(group: (typeof launchRouteGroups)[number]) {
  return launchTruth.routes.filter((route) => route.group === group)
}

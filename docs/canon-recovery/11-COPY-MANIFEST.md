# URAI Copy and Text Manifest

Status: REQUIREMENT-LEVEL COPY AUTHORITY RECONCILED / FINAL VERSIONED WORDING PARTIAL

## Voice principles recovered

UrAi copy should be restrained, private, evidence-aware, non-clinical, non-coercive, and spatially appropriate. AI suggestions should distinguish evidence, interpretation, uncertainty, and user correction. Sensitive experiences must never use pressure language.

## Copy surfaces

| Surface | Required copy classes | Status |
|---|---|---|
| First run / onboarding | product premise, privacy, permissions, skip/later, sample-vs-personal data | PARTIAL |
| Home | minimal orientation, semantic/a11y labels, fallback/loading only where needed | PARTIAL |
| Ground | orientation, destination labels, physical-crossing semantics | PARTIAL |
| Life Map | scale/location labels, filters/layers, search, selected-memory context | PARTIAL |
| Focus | selected-memory identity, source/context, action/continue/return | PARTIAL |
| Replay | recorded evidence vs supported context vs interpretation vs unknown; playback/exit | PARTIAL/VERIFIED in runtime lineage |
| Mirror | permission, evidence links, accept/edit/reject, uncertainty | PARTIAL |
| Shadow | consent gate, intensity controls, exit, no-forced-entry language | REQUIREMENTS VERIFIED via `55-EDGE-STATE-COPY-SPEC.md`; final content-pack wording PARTIAL |
| Legacy | archive/export/share/inheritance permissions | MISSING/PARTIAL |
| Council | role/context scope, suggestion-not-authority language | MISSING/PARTIAL |
| Passport | identity/context/permission labels, edit/revoke | PARTIAL |
| Rituals | invitation, steps, completion/reflection, skip | REQUIREMENTS VERIFIED at canon/storyboard level; final content-pack wording PARTIAL |
| Emotional Weather | evidence explanation, uncertainty, manual correction | REQUIREMENTS VERIFIED via `55-EDGE-STATE-COPY-SPEC.md`; final content-pack wording PARTIAL |
| Predictive Mood Forecast | historical forecast framing | SUPERSEDED; current V1 locks prohibit predictive mood forecasting |
| Possible Futures | hypothetical, editable, unranked scenario disclosure; not prediction/recommendation | REQUIREMENTS VERIFIED via `55-EDGE-STATE-COPY-SPEC.md`; final content-pack wording PARTIAL |
| Passive signals | source, why collected, permission, pause/disable, retention/deletion | PARTIAL |
| Empty state | meaningful starter world without fake personalization | REQUIREMENTS VERIFIED via `55-EDGE-STATE-COPY-SPEC.md`; final content-pack wording PARTIAL |
| Offline/resync | local state, queued changes, conflicts, retry | REQUIREMENTS VERIFIED via `55-EDGE-STATE-COPY-SPEC.md`; final content-pack wording PARTIAL |
| Permission denied | why blocked, what remains usable, settings path | REQUIREMENTS VERIFIED via `55-EDGE-STATE-COPY-SPEC.md`; final content-pack wording PARTIAL |
| Subscription | plan/entitlement/current provider truth | REQUIREMENTS VERIFIED via `56-COMMERCIAL-ENTITLEMENT-AUTHORITY.md`; final public wording remains release/provider-gated |
| Accessibility | reduced motion/stimulation, captions, audio/haptics, screen-reader controls | PARTIAL |
| Privacy/data rights | consent, export, delete, retention, legal hold where applicable | VERIFIED/PARTIAL via privacy system |
| Support | help/escalation, privacy/security/billing separation | PARTIAL |
| Foundation | grants, donations, public-interest programs, employee/advisor portals | PARTIAL |
| B2B | aggregate-only product boundaries, partner permissions | PARTIAL |
| Admin | destructive-action confirmations, audit/evidence, role boundaries | PARTIAL |
| Investors | evidence-gated claims, access/gating language | PARTIAL |

## Prohibited copy patterns

- claims that AI knows objective emotional truth;
- diagnostic/medical language without appropriate clinical/legal authority;
- “prediction” framing for editable future scenarios;
- fabricated memory certainty;
- claims that passive sensing is active when it is not;
- pressure to open Shadow/sensitive memories;
- production/live claims that exceed provider/runtime evidence;
- B2B language implying sale/exposure of raw personal signals.

## Required content-source reconciliation

Requirement-level copy authority is now cross-linked to `55-EDGE-STATE-COPY-SPEC.md`, `56-COMMERCIAL-ENTITLEMENT-AUTHORITY.md`, privacy authority, and current route source. Final sendable/public wording should be versioned through `urai-content` where that system owns the surface. Historical marketing text is not automatically product UI authority.

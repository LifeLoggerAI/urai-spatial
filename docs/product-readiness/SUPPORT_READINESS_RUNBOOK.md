# URAI Public-Beta Support Readiness Runbook

**Workstream:** Parallel Workstream D — Product Readiness and Launch Operations  
**Repository:** `LifeLoggerAI/urai-spatial`  
**Frozen source SHA:** `60730edcb5bcedfe2ded2cee9a96cef96dff9510`  
**Stacked parent SHA:** `f3588054e37c3a5d639af8e04855bc3aa332e7a4`  
**Evidence date:** 2026-07-11

## Current verdict

**PUBLIC SUPPORT OPERATIONS: NOT READY / NO-GO**

This runbook defines safe handling rules and acceptance criteria. It does not establish a public support channel, staffed operating hours, response-time commitment, emergency service, medical service, legal advice, account-recovery authority, or operational export/deletion capability.

No support contact may be published until an authorized owner confirms the channel, access control, retention, escalation path, operating hours, and privacy notice.

The current-main delta since the prior runbook is limited to the V1 asset-intake workflow, contract, verifier, and safe-resume marker binding. It does not establish support staffing, rights operations, incident authority, asset availability, or customer-notification authority, so this NO-GO verdict remains unchanged.

## Current missing authorities

The following are not established by this receipt:

- named primary support owner;
- named backup support owner;
- authorized public support channel;
- authorized security-report channel;
- authorized privacy/data-rights channel;
- authorized accessibility-report channel;
- operating hours or coverage calendar;
- response or resolution commitments;
- incident commander and backup;
- legal/privacy escalation owner;
- authenticated account lookup or ownership-verification procedure;
- production export/deletion/revocation operations;
- provider outage dashboard or customer-notification authority.

Do not invent names, addresses, phone numbers, service levels, or completion promises to fill these gaps.

## Safety boundary

URAI support must never be represented as:

- emergency response;
- crisis intervention;
- medical, psychiatric, therapeutic, diagnostic, or legal advice;
- law-enforcement, evidence-preservation, or identity-verification authority;
- guaranteed account, memory, media, or data recovery;
- proof that deletion, export, revocation, provider shutdown, or external-action cancellation completed without an immutable receipt.

Where immediate danger, medical emergency, abuse, exploitation, or self-harm risk is disclosed, the response must use the approved safety policy and locally appropriate emergency resources. This repository runbook does not supply or authorize hotline details.

## Sensitive-data intake prohibition

Support operators and forms must not request or accept more data than needed to diagnose the issue.

Never request:

- passwords, recovery codes, API keys, access tokens, cookies, private keys, or service-account material;
- complete memory content, replay transcripts, prompts, journals, recordings, private messages, or relationship histories;
- precise home/work coordinates or continuous location history;
- raw health, body, biometric, breathing, cough, wearable, camera, microphone, or device-sensor data;
- government identity documents unless a separately approved legal identity process requires them;
- full payment-card or bank details;
- unredacted screenshots containing other people, private memories, tokens, addresses, health details, or sensitive notifications.

Preferred diagnostic fields:

- affected route or feature name;
- approximate timestamp and timezone;
- browser, operating system, and device class;
- visible error code or exact short error text;
- whether sample/demo or authenticated personal content was involved;
- deployed build SHA shown by the product, if available;
- consent/permission state category without the underlying private content;
- redacted screenshot only when necessary.

If sensitive material is received accidentally, stop copying it, restrict access, follow the approved retention/deletion and incident process, and record only the minimum metadata needed for the case.

## Severity model

| Severity | Definition | Examples | Required handling |
| --- | --- | --- | --- |
| **P0 — security/privacy/safety** | Credible active exposure, unauthorized access, secret leakage, cross-user data, destructive action without approval, or severe safety risk. | Another person's memory appears; a token is exposed; a message or purchase is executed without approval. | Stop normal troubleshooting. Preserve minimal evidence, restrict access, notify the authorized incident/security/privacy owner, disable affected capability when authorized, and do not make public claims before verified facts exist. |
| **P1 — blocked rights or core journey** | User cannot access a required control or complete a time-sensitive data-rights or core-route action. | Export/deletion request stuck; consent cannot be revoked; primary route unusable after a verified release. | Record exact scope and evidence; do not claim completion; escalate to product/privacy/release owner; provide a truthful workaround only if verified. |
| **P2 — material degraded behavior** | Product remains usable but a route, media item, permission state, or supported interaction fails. | Replay unavailable; missing asset fallback; mobile layout blocks an action. | Reproduce on the exact release, collect non-sensitive diagnostics, link known limitation, and track owner/fix evidence. |
| **P3 — question or feedback** | Explanation, usability feedback, cosmetic issue, or future capability request. | Confusing label; request for another language; visual polish feedback. | Answer only from current evidence; separate current capability from roadmap; record feedback without sensitive content. |

Severity is based on impact and evidence, not customer status, publicity, or emotional language alone.

## Universal case workflow

1. **Acknowledge without overpromising.** State what was received and what is not yet known.
2. **Classify the boundary.** Identify sample/demo versus personal data, route, release SHA, environment, provider/device involvement, and whether consent or external action is implicated.
3. **Minimize data.** Remove or avoid sensitive content not needed for diagnosis.
4. **Check current truth.** Read current `STATUS.md`, `EVIDENCE.md`, issue #414, exact deployed receipt, known incidents, and applicable provider/device status.
5. **Reproduce safely.** Use sample data or a controlled account/environment. Never reproduce destructive or privacy-sensitive behavior against a user's real data without authority.
6. **Assign evidence owner.** Record who owns product, release, privacy, security, accessibility, provider, or legal follow-up.
7. **Give only verified next steps.** Do not state that a fix, deletion, export, refund, recovery, or provider shutdown occurred until evidence proves it.
8. **Close with a receipt.** Record exact version, resolution evidence, user-visible result, remaining limitations, and whether notification is authorized.

## Case playbooks

### 1. Sign-in, ownership, or account-access failure

Current authentication and owner/tenant production behavior are not certified by this runbook.

Required handling:

- confirm the exact surface and whether authentication is actually active on the deployed release;
- do not request passwords, tokens, or full identity documents;
- do not manually transfer ownership or change account identifiers without an approved authenticated process;
- distinguish browser/session failure from absent product capability;
- never promise account recovery, data recovery, or identity verification before the responsible system records an authoritative receipt;
- escalate suspected account takeover as P0.

### 2. Missing memory, place, image, or personal content

- determine whether the item was synthetic/sample, local-only, imported, provider-generated, or authenticated personal content;
- do not imply personal persistence exists when it is not proven on the deployed release;
- do not reconstruct or request the full private content for troubleshooting;
- check deletion/revocation/permission state before treating the item as lost;
- state clearly when recovery is unavailable or unverified;
- do not create a replacement and represent it as the original memory.

### 3. Replay failure or inaccurate replay

- record route, manifest/memory identifier category, browser/device, visible error, and build SHA without collecting the replay content;
- distinguish unavailable media, missing assets, unsupported browser, permission denial, provider outage, and invalid/deleted sample data;
- do not claim factual reconstruction, perfect recall, evidentiary accuracy, or therapeutic effect;
- provide captions/transcript or reduced-motion workarounds only when they exist and are verified;
- offer a safe return path to Focus/Life Map/Home when available.

### 4. Export, deletion, revocation, or retention request

No operator may claim that a request completed from UI copy, a ticket state, or a database command alone.

Required evidence before completion language:

- authenticated requester and ownership/tenant boundary;
- request scope and policy version;
- immutable request ID and timestamps;
- systems/providers/queues covered;
- exceptions, legal holds, backups, retention limits, and third-party boundaries;
- completion or denial receipt from each applicable system;
- audit event without private content;
- user-visible result and appeal/support route.

If operational rights tooling is not deployed, say that directly and escalate to the authorized privacy/legal owner. Do not provide a fabricated completion date.

### 5. Consent dispute or privacy complaint

- treat disputed consent, unexpected data use, cross-user visibility, or unauthorized provider access as P0 or P1 based on active risk;
- preserve only minimal metadata and stop unnecessary processing when authorized;
- identify purpose, policy version, grant/revocation evidence, downstream systems, provider boundary, and exact release;
- do not argue legal sufficiency or make compliance conclusions;
- do not state that revocation propagated until every applicable system is evidenced;
- route to the authorized privacy/legal owner.

### 6. Provider, Firebase, asset, or external-service outage

- verify whether the capability is active, fallback-only, preview-only, contracted-only, or not deployed before declaring an outage;
- identify provider, environment, exact release, start time, affected routes, and fallback behavior;
- never expose credentials or privileged provider diagnostics;
- keep fallback/demo disclosures visible;
- do not estimate restoration without an authorized operational source;
- record recovery, rollback, and post-incident verification before marking resolved.

### 7. Accessibility report

Capture:

- route and task;
- browser/OS/device;
- assistive technology and version when volunteered;
- keyboard, focus, screen-reader, zoom, contrast, reduced-motion, caption/transcript, or touch-target category;
- exact release SHA;
- concise redacted reproduction steps.

Do not ask for disability or medical history. Treat blockers to consent, privacy, deletion/export, authentication, or safety controls as P1 or P0 according to impact. Resolution requires tested assistive-technology evidence, not only an automated score.

### 8. Security report

- acknowledge receipt without confirming exploitability;
- prohibit secrets or exploit payloads in public issues;
- move sensitive evidence to the authorized restricted channel once established;
- record affected repository, route/API, environment, exact SHA, reproducibility, and impact without copying user data;
- rotate/revoke credentials only through authorized owners;
- do not publish details before containment and disclosure review;
- require fix SHA, tests, deployment/rollback receipt, and post-deploy verification.

### 9. Degraded service, unsupported browser/device, or offline use

- distinguish explicit support from best-effort fallback;
- do not call a route supported merely because it returns HTTP 200;
- capture browser/device class, WebGL/WebXR status, permissions, network state, missing resources, console category, and exact release;
- give a verified fallback or return route when available;
- record unsupported behavior honestly rather than blaming the user.

## Response-language rules

Approved patterns:

- “I can confirm the route exists in source; I cannot yet confirm that the current deployed release contains the same behavior.”
- “The request is recorded, but completion is not yet proven.”
- “This surface is currently a preview and does not change account or privacy settings.”
- “The capability is provider/device gated and is not currently certified as active.”
- “We need the exact release and a redacted error before assigning a cause.”

Prohibited patterns without evidence:

- “Your data is deleted.”
- “Your account is recovered.”
- “Nothing leaves your device.”
- “The provider is down.”
- “The issue is fixed in production.”
- “This will be resolved by [date/time].”
- “URAI is fully accessible, secure, private, compliant, or production-ready.”

## Case evidence record

Every material case must record:

- case ID;
- received timestamp and timezone;
- severity and rationale;
- reporter contact reference stored only in the approved support system;
- affected route/capability;
- sample versus personal-data classification;
- exact candidate/deployed SHA and environment;
- browser/device/assistive-technology category;
- provider/Firebase/device involvement state;
- consent/privacy/security/accessibility flags;
- redacted reproduction steps;
- owner and escalation owner;
- linked issue/incident/change;
- mitigation and rollback state;
- verification evidence;
- closure authority and timestamp;
- remaining limitation and notification decision.

Do not put raw memories, prompts, transcripts, precise locations, secrets, identity documents, health/body data, or unredacted screenshots in receipts or public issues.

## Public-beta activation checklist

Support readiness remains NO-GO until all applicable items are complete:

- [ ] authorized public support channel;
- [ ] authorized restricted security channel;
- [ ] authorized privacy/data-rights channel;
- [ ] authorized accessibility channel or routing rule;
- [ ] named primary and backup owners;
- [ ] operating hours and truthful expectation language;
- [ ] access control, retention, deletion, and audit policy for support records;
- [ ] incident severity and escalation authority;
- [ ] authenticated ownership-verification process where needed;
- [ ] export/deletion/revocation operational receipts or explicit unsupported wording;
- [ ] provider outage and release-status source of truth;
- [ ] accessibility triage and assistive-technology verification capability;
- [ ] security disclosure and coordinated-publication process;
- [ ] reviewed response templates and prohibited-claim policy;
- [ ] exact deployed support/help surfaces and live interaction evidence;
- [ ] rollback and notification procedure;
- [ ] legal/privacy/security/accessibility review.

## Claim boundary

This runbook proves that Workstream D documented fail-closed support handling rules. It does not prove that support is staffed, public, available, responsive, secure, legally sufficient, or integrated with production systems.

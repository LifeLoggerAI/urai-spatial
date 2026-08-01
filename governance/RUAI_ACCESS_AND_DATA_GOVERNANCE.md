# RuAi Access and Data Governance

Status: launch-readiness authority; implementation and protected-runtime evidence remain separately gated  
Repository authority: `LifeLoggerAI/urai-spatial`  
Production authority: issue `#999`

## Purpose

RuAi is a separate governed professional surface for explicitly consented clinician, researcher, and authorized-data workflows. It is not a back door into UrAi private memories and does not authorize automatic medical interpretation, diagnosis, treatment, surveillance, unrestricted buyer access, or silent secondary use.

## Default rule

Access is denied unless all of the following are true:

1. the user has granted current, specific, revocable consent;
2. the requesting person or service has an approved role;
3. the approved purpose matches the requested data scope;
4. tenant and subject boundaries are enforced;
5. the request is logged with a stable reason and actor identity;
6. retention and deletion behavior are defined;
7. the access path has current protected-environment evidence.

A missing control fails closed.

## Role model

- `urai_user` — owns and controls the originating personal data.
- `ruai_clinician` — may access only user-granted, purpose-limited material within an authorized care relationship. This role does not create medical-device authority.
- `ruai_researcher` — may access only approved research datasets and scopes. Direct personal memory access is denied by default.
- `ruai_data_steward` — administers grants, revocations, retention, and audit review without unrestricted content access.
- `ruai_security_auditor` — reads security and access evidence but not personal content unless a separately approved incident scope requires it.
- `ruai_service` — machine identity with least-privilege, short-lived credentials and explicit dataset/action allowlists.

No role inherits unrestricted access.

## Consent grant requirements

Every grant must record:

- stable grant ID;
- user identity;
- recipient identity and organization where applicable;
- role;
- exact purpose;
- data categories;
- precision and sensitivity;
- permitted actions;
- start and expiration;
- revocation behavior;
- deletion and downstream-propagation obligation;
- retention policy;
- locale and consent-copy version;
- creation and update timestamps;
- audit identity.

Blanket consent, indefinite consent without a justified policy, prechecked consent, and consent hidden inside unrelated terms are prohibited.

## Data categories

The following remain separately scoped and may not be bundled silently:

- account and identity;
- memories and Replay content;
- transcripts and audio;
- images and video;
- relationship and social signals;
- precise, approximate, and city-level location;
- device and behavioral signals;
- health-adjacent signals;
- accessibility preferences;
- derived patterns and model outputs;
- export packages;
- research dataset contributions.

Private memory content and exact location are denied unless explicitly included.

## Dataset governance

A research or institutional dataset requires:

- dataset ID and version;
- approved purpose and lawful basis review;
- source-grant inventory;
- inclusion and exclusion rules;
- transformation and minimization record;
- direct-identifier removal record;
- reidentification-risk assessment;
- prohibited-use terms;
- access roster;
- query and export auditability;
- expiration and destruction date;
- deletion and withdrawal propagation process;
- incident and breach response owner;
- license and publication terms;
- evidence that synthetic or demonstration data is clearly marked.

`Deidentified`, `anonymous`, and `anonymized` may not be used as absolute claims without a scoped method and risk assessment.

## Revocation and deletion

Revocation must prevent new access promptly and create a propagation task for cached copies, derivatives, exports, downstream processors, and dataset membership where technically and legally applicable.

Deletion receipts must distinguish:

- access revoked;
- source deleted;
- derivative removed;
- downstream request issued;
- downstream deletion confirmed;
- retention exception with authority and expiry.

A user-facing deletion statement must not promise deletion that the system cannot prove.

## Audit requirements

Every privileged read, grant mutation, export, dataset operation, and administrative override must record:

- actor;
- action;
- subject or dataset;
- grant and purpose;
- timestamp;
- result;
- environment;
- request or correlation ID;
- reason for denial or override;
- immutable or tamper-evident retention behavior where implemented.

Audit logs must avoid copying sensitive content unnecessarily.

## Separation from UrAi

- UrAi remains the consumer data owner and consent surface.
- RuAi receives only explicitly granted views or datasets.
- Consumer authentication does not automatically confer professional access.
- Professional authentication does not automatically confer consumer memory access.
- Demonstration data must be isolated and disclosed.
- Cross-tenant and cross-user access must fail closed.
- Service-account credentials may not be exposed to browser clients.

## Clinical and research boundary

RuAi may support professional workflows, but current authority does not permit claims of diagnosis, treatment, clinical validation, medical-device status, HIPAA compliance, or guaranteed outcomes. Human professionals retain responsibility for interpretation and decisions.

## Licensing boundary

No data license is valid merely because data is technically available. A license requires approved scope, grant authority, prohibited uses, security obligations, deletion/return terms, audit rights, term, geography, fees where applicable, and executed legal instruments.

## Production admission

RuAi remains `prepared, external execution required` until protected evidence proves:

- authentication and least-privilege authorization;
- tenant isolation and denial tests;
- consent-linked access;
- grant creation, read, revoke, expire, and delete propagation;
- export controls;
- audit logging;
- incident response;
- privacy and legal review;
- exact deployed identity and rollback.

No production-ready claim is authorized by this document.

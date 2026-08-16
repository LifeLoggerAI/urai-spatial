# URAI External World Interface — Canonical Architecture v1

Status: architecture and contract canon; no provider activation or production mutation.

## Purpose

The External World Interface (EWI) is the boundary between URAI intelligence/memory systems and external digital or physical systems. It standardizes inbound signals, outbound action requests, permissions, integrations, device/haptic commands, and provider adapters without allowing provider-specific logic to leak into the core product.

Canonical flow:

`Human -> Devices/Providers -> EWI -> Signal Bus -> URAI Intelligence/Memory -> Permission + Action Policy -> Action Bus -> Devices/Providers/World`

## Authority and non-duplication

EWI is a federation layer. It does not replace existing authorities.

| Capability | Canonical authority | EWI responsibility |
| --- | --- | --- |
| Product/runtime orchestration | `LifeLoggerAI/urai-spatial` | Own shared EWI architecture/contracts consumed by the product runtime. |
| Communications delivery/calls/messages | `LifeLoggerAI/urai-communications` | Implement the communications adapter/gateway behind EWI contracts. |
| Privacy/consent/release gating | `LifeLoggerAI/urai-privacy` | Remain policy authority; EWI carries and enforces grants but does not redefine privacy policy. |
| External-world normalization | `urai-external-world-interface` service boundary | Normalize external signals/actions; may begin as contracts inside canonical runtime before a dedicated service exists. |
| Device/native bridge | `urai-device-bridge` service boundary | Platform adapters for iOS/watchOS/Android/Wear OS/visionOS/XR/peripherals. |
| Action permission evaluation | `urai-permission-policy-engine` service boundary | Evaluate grants, action class, purpose, context, and confirmation requirements. Must defer to privacy authority. |
| Integration metadata | `urai-integration-registry` service boundary | Capability, permission, jurisdiction, retention, availability, latency, and cost declarations. |

The original five-service plan is therefore preserved as five logical service boundaries, while the already-existing `urai-communications` and `urai-privacy` repositories remain canonical for their domains rather than being duplicated.

## Core contracts

Language-neutral JSON Schemas live under `docs/contracts/ewi/`.

- `SignalEnvelope`: normalized inbound event with subject, source, timestamp, confidence, sensitivity, permission references, provenance, and payload.
- `ActionRequest`: proposed outbound action with actor, target integration/capability, purpose, action class, confirmation state, permission references, and payload.
- `PermissionGrant`: executable grant describing subject, resource/capability, purpose, duration, processing constraints, recipients, retention, revocation, and allowed action classes.
- `IntegrationManifest`: adapter declaration for capabilities, permissions, data classes, jurisdiction/retention limits, availability, latency, and cost.
- `HapticCommand`: provider-neutral nonvisual command vocabulary translated by device adapters into platform haptics.

## Action classes

EWI separates observation from action. Read permission never implies write/action permission.

1. `silent_auto` — low-risk, explicitly granted, non-user-visible processing.
2. `reversible_auto` — bounded action that can be undone and is explicitly granted.
3. `ask_first` — user confirmation required before dispatch.
4. `strong_confirmation` — explicit high-friction confirmation required for sensitive, consequential, financial, identity, relationship, safety, or external-communication actions.
5. `never_autonomous` — automation may prepare/recommend but may not dispatch without a separately authorized human-controlled path.

Fail closed when a grant is absent, expired, revoked, purpose-mismatched, capability-mismatched, outside jurisdiction/retention constraints, or weaker than the requested action class.

## Signal bus contract

Every provider adapter emits `SignalEnvelope`; provider-specific webhook/event shapes remain inside adapters. Signals preserve provenance and permission references through enrichment and memory pipelines. Sensitive payloads must not be copied into logs merely for observability.

## Action bus contract

URAI intelligence proposes `ActionRequest`; it does not call providers directly. The permission/policy layer evaluates the request, returns an authorization decision, and only then may the responsible domain adapter dispatch. Provider credentials/tokens stay in domain-owned secret/vault infrastructure and are never embedded in EWI envelopes.

## Integration Registry

`docs/contracts/ewi/integration-registry.seed.json` is a non-secret seed. It declares service families and capabilities, including communications, Google Workspace, device/native, wearable, location, haptic, spatial/XR, notification, vehicle, home/IoT, and peripheral sensors. Entries are metadata only; `availability: "planned"` or `"gated"` must not be interpreted as live integration proof.

## Communications mapping

`urai-communications` remains the communications engine. Its EWI adapter may expose provider-neutral operations such as `send_message`, `start_call`, `transfer_call`, `read_voicemail`, `summarize_call`, and `notify`, but every outbound operation must pass a policy decision. Existing delivery consent, opt-out, quiet-hours, allowlist, callback, and provider gates remain stronger local controls and are not weakened by this contract.

## Device and sensory mapping

`urai-device-bridge` adapters translate device/platform input to signals and output commands to native APIs. Haptics use symbolic commands such as `CALM`, `WARNING`, `PERSON_APPROACHING`, `KNOWN_VOICE`, `MEMORY_TRIGGER`, `COUNCIL_ALERT`, `NAV_LEFT`, `NAV_RIGHT`, and `BREATH_WITH_ME`. The symbol is stable; physical vibration implementation is platform-specific.

## Credential boundary

OAuth tokens, refresh tokens, API keys, provider credentials, webhook secrets, and device secrets are references managed by domain-specific encrypted vaults/secret managers. EWI contracts carry opaque credential references only when necessary. No secret material belongs in the Integration Registry.

## Data-rights boundary

EWI must preserve data-class and provenance metadata so downstream systems can distinguish user-generated, URAI-derived, device sensor, health-platform restricted, partner-API restricted, export-only, and research-eligible information. A generic consent flag is insufficient to authorize resale, sharing, training, or unrelated processing.

## Rollout rule

This v1 change is contract-only. It authorizes no production provider calls, calls/SMS/email sends, passive collection, OAuth credential creation, Firebase deployment, IAM change, DNS change, billing action, or device permission activation. Runtime adoption happens through reviewed adapters and privacy/release gates.

## Compatibility

Contracts use version `1.0.0`. Additive optional fields may remain within v1; breaking semantic or required-field changes require a new major contract version. Adapters must reject unsupported major versions rather than guessing.
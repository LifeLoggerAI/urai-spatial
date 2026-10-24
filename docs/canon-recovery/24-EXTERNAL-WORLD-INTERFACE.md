# URAI External World Interface Canon Recovery

Status: ARCHITECTURE/CONTRACT FOUNDATION MERGED / PROVIDERS NOT IMPLIED ACTIVE

Primary authority: `URAI External World Interface — Canonical Architecture v1`.

## Purpose

EWI is the boundary between UrAi intelligence/memory and the outside digital/physical world. It normalizes inbound signals, outbound action requests, permissions, device commands and provider adapters so core intelligence does not couple directly to specific platforms.

Canonical flow:

`Human -> Devices/Providers -> EWI -> Signal Bus -> URAI Intelligence/Memory -> Permission + Action Policy -> Action Bus -> Devices/Providers/World`

## Authority boundaries

EWI federates rather than replaces existing systems:
- `urai-spatial`: shared EWI architecture/contracts;
- `urai-communications`: calls/messages/delivery/callback/transcript authority;
- `urai-privacy`: privacy/consent/retention/export/delete/release gates;
- logical EWI normalization layer;
- logical device bridge;
- logical permission policy engine;
- logical integration registry.

## v1 contracts

- SignalEnvelope
- ActionRequest
- PermissionGrant
- IntegrationManifest
- HapticCommand

## Action policy classes

- `silent_auto`
- `reversible_auto`
- `ask_first`
- `strong_confirmation`
- `never_autonomous`

Observation permission never implies action permission. Reading calendar does not imply canceling a meeting; reading messages does not imply sending; sensing stress does not imply contacting someone.

Missing/revoked/expired/purpose-mismatched/capability-mismatched/insufficient grants fail closed.

## Data rights

A generic consent flag is insufficient for resale, sharing, model training, or unrelated processing. Provenance and data class stay attached through downstream processing.

Sensitive provider payloads must not be copied into logs merely for observability.

## Credential boundary

Provider/OAuth/device secrets stay in encrypted domain-owned secret stores. EWI contracts/registry never hold secret material.

## Integration registry families recovered

- communications.gateway — gated
- google.workspace — gated
- device.native — planned
- wearable.federation — planned
- context.location — planned
- haptics.universal — planned
- spatial.xr — gated
- notifications.fabric — planned
- vehicle.adapter — planned
- home.iot — planned
- peripheral.sensor — planned

“planned” and “gated” are truth labels, not live claims.

## Communications policy

Provider-neutral capabilities include read/send/call/transfer/voicemail read/call summarize/notify, subject to explicit grants, purpose, action class, confirmation, opt-out, quiet hours, caps, allowlists, provider availability, callback verification, tenant scope, audit and kill-switch.

Passing EWI policy is necessary but not sufficient for live dispatch.

## Canonical merge evidence recovered

EWI v1 architecture/contracts were merged into `urai-spatial` through historical PR #1155 with contract version 1.0.0. Communications gateway contracts/policy were merged through `urai-communications` PR #37.

This establishes architecture/contract authority only. It does not prove current provider credentials, device permissions, external delivery, passive collection, deployment or production user-data mutation.

## Safety boundary

Contract publication authorizes no production calls/messages, OAuth creation, passive collection, device permission activation, IAM/DNS/billing changes, or production-data mutation.

Runtime adoption remains separately gated.

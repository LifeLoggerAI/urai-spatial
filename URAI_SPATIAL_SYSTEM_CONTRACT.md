# URAI Spatial System Contract

## Service

- Service name: `urai-spatial`
- Product name: URAI Spatial
- Version: `1.0.0-release-lock`
- Mode: standalone web shell with safe fallback APIs

## Routes

- `/` — spatial home shell
- `/spatial` — standalone shell alias
- `/life-map` — LifeMap starfield, focus, replay, ESC unwind
- `/privacy` — privacy posture and provider fallback language
- `/terms` — fallback/provider terms language

## APIs

- `GET /api/system/health`
- `GET /api/system/manifest`
- `GET /api/system/capabilities`
- `GET /api/system/integration-contract`
- `POST /api/body-biometric`
- `POST /api/orb-companion`

All APIs return JSON and include either `service: "urai-spatial"` or an `ok` contract. Error responses are sanitized.

## Data contracts

### Body biometric snapshot

```json
{
  "ok": true,
  "service": "urai-spatial",
  "userId": "adamclamp",
  "source": "mock | live-device | passive-inference",
  "providerStatus": "ready | fallback",
  "providerMessage": "string",
  "isDemoFallback": true,
  "snapshot": {
    "region": "head | torso | arms | legs",
    "title": "string",
    "subtitle": "string",
    "signal": "string",
    "metrics": [{ "label": "Focus Load | Heart Rate | Device Strain | Grounding", "value": "string", "summary": "string" }]
  }
}
```

### Orb companion

```json
{
  "ok": true,
  "service": "urai-spatial",
  "userId": "adamclamp",
  "reply": "string",
  "mode": "local-fallback | memory-grounded",
  "routeHint": "home | brain-synapses | chest-heart | arms-device | legs-movement | sky-life-map | ground-world | object-memory | lifemap",
  "confidenceLabel": "fallback | routed",
  "isDemoFallback": true,
  "sources": []
}
```

## System-of-systems targets

URAI Spatial is prepared to integrate with:

- URAI core
- URAI Studio
- Asset Factory
- URAI Jobs

## Auth/security model

- Local fallback mode does not require credentials.
- Future privileged mutation routes should require API-key, tenant, and user context checks.
- Client code must not expose server secrets.
- Firestore and Storage write paths must remain owner/tenant scoped.

## Asset Factory integration

Spatial assets should flow into `spatial_assets` and `spatial_anchors`, then render through the shell after validation. Generated assets must include provenance, tenant/user ownership, and safety metadata.

## URAI Studio integration

URAI Studio can use the system manifest and integration contract APIs to discover URAI Spatial capabilities, route targets, fallback status, and smoke coverage.

## WebXR / AR seam

The ground/world layer exposes AR/WebXR only as a future seam. The shell does not claim live camera anchoring or headset support until providers are connected and validated.

## Smoke and E2E coverage

- Root spatial home markers
- Orb companion route hints and voice scaffold
- Avatar/body regions and biometric panels
- Sky LifeMap preview
- Ground/world preview
- LifeMap starfield, focus, replay, ESC unwind
- Body biometric API fallback payloads
- Orb companion API fallback payloads
- System health, manifest, capabilities, and integration contract APIs

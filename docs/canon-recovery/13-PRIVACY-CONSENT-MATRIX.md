# URAI Privacy and Consent Matrix

Status: BINDING CANON / FEATURE ADOPTION VARIES

Privacy authority is owned by the privacy system and current accepted policy/contracts, not by visual/product prose.

| Data / capability | Default | Consent / control | Storage / retention | Export/delete | Inference boundary | Status |
|---|---|---|---|---|---|---|
| voice transcript | closed unless enabled/needed | explicit source control | must be declared | required where stored | transcript != emotional truth | PARTIAL |
| voice tone | closed | explicit consent | minimize/edge where possible | required | probabilistic signal only | PARTIAL |
| ambient tags | closed | explicit permission | minimized | required | context hint only | PARTIAL |
| face/emotional color signal | closed/strong gate | explicit permission | minimize; highest sensitivity | required | no biometric/diagnostic certainty | PARTIAL |
| steps/motion | closed until permission | OS/device permission + UrAi control | purpose-limited | required where stored | activity != intent | PARTIAL |
| GPS/location snapshot | closed | explicit location permission | snapshot/minimize | required | no exact-location exposure in aggregate views | PARTIAL |
| stillness | derived only with consented source | user control | minimized | required | not a diagnosis | PARTIAL |
| late-night scrolling | closed/derived only from allowed telemetry | explicit behavior-data boundary | minimize | required | pattern suggestion only | PARTIAL |
| quick-cancel taps | product telemetry boundary | transparent control | minimize/aggregate | required where linked | may indicate friction, not emotion truth | PARTIAL |
| memories/media | private by default | per-memory visibility/vault | user-owned retention rules | REQUIRED | AI access separately governable | CORE |
| relationships/shared memories | private by default | all-party/appropriate sharing consent | scoped | REQUIRED | no contact-frequency = relationship-quality assumption | FUTURE/PARTIAL |
| emotional weather | unavailable unless evidence exists | user can inspect/correct | source-linked | required | interpretation with confidence, not fact | PARTIAL |
| future scenarios | user initiated | editable/deleteable | purpose-limited | required | scenario, not prediction | FUTURE |
| private vault / Shadow | SEALED | explicit unlock; immediate re-seal | strongest boundary | required subject to legal hold | no forced AI access | CORE |
| analytics | aggregate-only baseline | privacy policy/control | aggregate/minimized | per policy | no raw sensitive personal-signal leakage | CORE SYSTEM |
| B2B | aggregate-only | contract + privacy control | scoped tenant data | per policy | no raw personal signals | ROADMAP |

## Destructive-operation controls

Deletion must honor:
- authorization;
- scope/plan;
- audit evidence;
- legal hold where actually applicable;
- confirmation and recovery/rollback rules where defined.

## Product-claim boundary

Canon inclusion does not prove collection is active. UI/marketing may only describe a signal as active when current runtime/provider/privacy evidence proves it.

# UrAi Life Causal Graph and Person/World Model V1

Status: IMPLEMENTATION STARTED / LAUNCH-CRITICAL / NOT YET CERTIFIED

Parent authority: Spatial issue #1542.

## Launch definition

UrAi is complete for this program only when authorized real-life sources can be ingested into a provenance-preserving Life Causal Graph; people, places, relationships, objects and events resolve through time; evidence-constrained Person/World states compile into Replay, Life Movie, Captured Reality and realtime interaction; correction and consent changes invalidate affected derivatives; synthetic output cannot contaminate historical evidence; exact-head machine, human, privacy, security, accessibility, localization, device and literal-quality gates pass; independent approval exists on the frozen candidate; that exact candidate is deployed; and production is reverified.

## Canonical truth model

Truth is represented on two independent axes.

EvidenceClass answers: how is this claim known?

- SOURCE_CAPTURED
- SOURCE_DERIVED
- DIRECT_SUBJECT_TESTIMONY
- ATTRIBUTED_TESTIMONY
- CORROBORATED_INFERENCE
- CONTEXTUAL_RESEARCH
- UNKNOWN

PresentationClass answers: what kind of experience is being shown?

- ARCHIVAL
- RECONSTRUCTED
- INTERPRETIVE
- SIMULATED
- COUNTERFACTUAL

No simulation, counterfactual, generated video, generated image, synthetic voice, or model-authored dialogue can become SOURCE_CAPTURED.

## Kernel

The first source kernel lives at `urai-tier1/src/spatial/life-model/lifeModel.ts`.

It defines:

- owner-scoped LifeEntity;
- provenance-bound LifeClaim;
- negative constraints;
- temporal LifeEntityState;
- provider-neutral PersonModelBundle;
- SceneTruthPacket;
- derivative invalidation.

The kernel intentionally contains no private family names or media.

## Scene release decisions

- READY: required personal truth is resolved.
- READY_WITH_OCCLUSION: unresolved noncritical detail exists; cinematography/runtime must avoid asserting it.
- READY_INTERPRETIVE: explicitly interpretive presentation.
- BLOCKED: critical contradiction or critical unknown prevents asserted reconstruction.

## Dependency invalidation

Corrections, stronger evidence, consent revocation, or source deletion invalidate all dependent compiled states, scene packets and generated artifacts. Historical source records remain immutable; corrections are overlays and supersession records.

## Next executable slices

1. Firestore server-owned collections and rules for graph/state/claim/correction/conflict/gap/bundle/scene/receipt data.
2. Jobs #128 integration with canonical contract.
3. Studio #129 SceneTruth compatibility mapping.
4. Asset Factory #328/#329 provenance/promotion compatibility.
5. Generic Person Presence runtime with Adam as one governed instance.
6. Private E2E proof and release receipt chain.

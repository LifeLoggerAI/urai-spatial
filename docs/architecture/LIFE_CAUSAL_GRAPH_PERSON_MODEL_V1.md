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

## Generic Person Presence authority

The protected Presence adapter requires the selected current SceneTruth packet to include the current person bundle and graph. Sessions pin the bundle, SceneTruth and graph hashes, the compiled temporal cutoff, exact accepted claim values, and source/dependency IDs. A changed claim, scene, graph, person revision or temporal state blocks the old session. Accepted render bindings additionally pin the current bundle hash; legacy sessions or bindings without these hashes must be prepared or reviewed again.

Conversation and voice adapters verify current consent and source authority before provider dispatch and again before delivery. Provider text and audio remain bounded in private memory until final verification, so an in-flight correction or revocation cannot release an unvalidated prefix. Synthetic dialogue remains explicitly simulated and cannot become historical source evidence. The checks establish authority and lineage, not factual or likeness acceptance.

Entity/claim/state corrections now include simulation sessions and render bindings in dependency invalidation. Consent revocation covers those sessions too. Invalidation pages records in batches of 200, with a 2,000-record operation ceiling; overflow fails and requires a protected operator instead of reporting completion after silent truncation. Provider requests remain disabled until independently authorized. No private source, provider execution, voice/likeness approval, device proof or Life Model certification is supplied by source contract tests.

## Next executable slices

1. Firestore server-owned collections and rules for graph/state/claim/correction/conflict/gap/bundle/scene/receipt data.
2. Jobs #128 integration with canonical contract.
3. Studio #129 SceneTruth compatibility mapping.
4. Asset Factory #328/#329 provenance/promotion compatibility.
5. Generic Person Presence runtime with Adam as one governed instance.
6. Private E2E proof and release receipt chain.

# URAI Spatial Completion Lock

## Release boundary

This document defines the safe release boundary for URAI Spatial.

The current locked release only covers the launch-safe Tier One and Tier Two web experience, fallback-safe rendering, static hosting fallback behavior, and evidence-based release gates.

Advanced runtime surfaces remain gated until separate credentials, consent flow, deployment logs, integration proof, and smoke tests prove them.

## Current locked release posture

Tier One and Tier Two may ship when these gates pass:

- workspace bootstrap
- source integrity
- spatial copy
- production route exposure
- normal build
- static build
- Firebase deploy
- live smoke test

## Canon rule

Docs, UI copy, route metadata, and release notes must only claim what the release evidence proves.

Any advanced runtime, headset, camera, body-signal, private recall, marketplace, billing, generated asset, or external service capability must stay framed as planned, preview-safe, deferred, or gated until separately verified.

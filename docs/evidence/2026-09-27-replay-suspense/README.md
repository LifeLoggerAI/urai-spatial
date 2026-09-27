# Replay canvas loading boundary repair candidate

Parent: c406106dd10e90a92e7f4f0e72617ad6662c0487 (preserves completed-frame readiness repair).

Production Verify 36311889880 fails because render readiness stays false. Artifact 10929811449 reports WebGL context loss. Earlier artifact 10929093394 was visually inspected and shows controls over an empty scene.

Both Replay scene branches use suspending GLTF/texture loaders without an inner Suspense boundary. The installed R3F Canvas implementation propagates that suspension through its Block fallback to the outer canvas; its unmount implementation schedules forceContextLoss after 500ms. This establishes a lifecycle hazard, not proof that it is the sole cause of the observed CI loss.

Place Suspense with null fallback inside both neutral and selected-memory canvases so asset loading stays within the renderer. No assets, lighting, readiness thresholds, timeouts, pixel checks, or recovery checks changed. Fresh exact-head rendered proof is required before accepting this as the context-loss fix.

Validation: 12 existing readiness/theater contract tests and runtime TypeScript check pass. Local Node 24.19.0; remote Node 22. No production acceptance or independent certification claimed.

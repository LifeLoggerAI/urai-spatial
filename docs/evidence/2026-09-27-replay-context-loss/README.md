# Replay context loss — verified failure receipt

Exact head 2a536c2552657f3874e2cfd57c1e3a08a8d6f438 failed Production Verify run 36310310852. Artifact 10929093394 downloaded and ZIP hash independently matched upload log. Trace console reports THREE.WebGLRenderer: Context Lost; readiness correctly remains false. Inspected screenshot shows visible controls over an empty scene. No successful rendered Replay or visual acceptance is claimed.

The cause of context loss is not established. Aborted navigation/HMR requests occur in the same run; that correlation does not prove causation. Pixel assertions and original timeouts remain unchanged. Independent review cannot close this rendering defect.

Full trace and screenshot: https://github.com/LifeLoggerAI/urai-spatial/actions/runs/36310310852/artifacts/10929093394

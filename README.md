# URAI Spatial Runtime

This repo contains a simulation runtime layer (EventBus → SimulationEngine → Memory → Replay → Prediction → XR).

## Core Loop

SimulationEngine → MemoryGraph → ReplayEngine → PredictionEngine → XRRuntime

## Added Runtime System

- SystemLoop orchestration layer
- CommunicationsBridge (event capture)
- AnalyticsBridge (metrics extraction)
- FeedbackBridge (adjustment generation)

## Run (runtime layer)

```bash
node scripts/smoke-system-loop-runtime.mjs
```

## Status

- Simulation pipeline: OK
- Memory + replay: OK
- Prediction: OK
- XR rendering: OK
- Telemetry: OK
- Feedback: advisory only (not applied)
- Persistence: not implemented

# Repo Purpose

Canonical status: active

System: URAI Spatial immersive interface layer.

This repository owns the spatial/3D experiential surface for URAI: Home, LifeMap, spatial shell routes, orb companion navigation surfaces, privacy-safe fallback UI, replay surfaces, and future AR/VR/WebXR expansion work.

## Source of truth

- Monorepo root: `.`
- Active app package: `urai-tier1`
- Package manager: `pnpm`
- Runtime target: Node 22+
- Primary validation path: `pnpm launch:check`
- Lock/build validation path: `pnpm lock:build`

## This repo is not

- The main URAI app repo (`LifeLoggerAI/UrAi`).
- The URAI Labs company website (`LifeLoggerAI/urai-labs-llc`).
- A generic staging mirror, production mirror, or dev sandbox.
- The marketing, investor, privacy, jobs, analytics, admin, or studio source of truth.

## Authority rule

Spatial UI/runtime changes for the immersive Home, LifeMap, `/spatial`, `/life-map`, route smoke markers, spatial invariant checks, and Tier-1 spatial experience belong here unless another repo explicitly owns that subsystem.

Non-spatial product app work belongs in `UrAi`. Company website work belongs in `urai-labs-llc`.

## Deployment posture

This repo can support Firebase Hosting/App Hosting once project config is selected, but deployment must stay gated by the repo validation commands. Do not claim live AR, WebXR, wearable, biometric, or memory-grounded providers are active unless those providers are connected, consented, and validated.

## Confusion guard

When adding new work, label it as one of:

- spatial-runtime
- spatial-ui
- lifemap
- replay
- orb-companion-surface
- privacy-fallback
- route-contract
- launch-lock
- docs

If the work does not fit one of those buckets, verify that it belongs in this repo before committing it here.

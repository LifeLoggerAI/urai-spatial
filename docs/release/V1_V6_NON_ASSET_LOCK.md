# URAI Spatial V1-V6 Non-Asset Lock

## Decision

V1-V6 are being closed as structurally complete outside the asset-production lane.

This lock means the following are treated as the release-critical non-asset scope:

- route ownership
- runtime boundaries
- production route exposure
- launch boundary contract
- Tier/XR matrix
- Firebase/security boundaries
- typecheck
- production build
- Replay/Tier-5 infrastructure hardening
- release evidence capture

## Explicitly excluded

The following remain outside this closure and stay in the asset lane:

- final V1-V6 generated art assets
- cinematic/AAA visual replacements
- texture/model/HDR/sprite completion
- final asset inventory proof
- V7 feature expansion

## Next phase

After this lock passes:

1. Finish V1-V6 asset inventory.
2. Replace placeholder/low-quality assets.
3. Run visual smoke and release proof.
4. Open V7 planning/implementation branch.

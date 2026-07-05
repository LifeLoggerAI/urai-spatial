# URAI Spatial V1-V6 Asset-Ready Switch

## Decision

V1-V6 core product work can be locked independently from final asset production.

The runtime asset contract is now explicit:

1. `urai-tier1/src/spatial/assets/uraiAssets.ts` is the source of truth for V1-V6 asset URLs.
2. Runtime surfaces reference final assets first and fallback assets second.
3. Fallback assets keep V1-V6 safe before final assets land.
4. Final assets activate automatically when files are added at the registry paths.
5. V7 should not require route rewrites just to turn V1-V6 assets on.

## Gate

Run the non-strict readiness gate while assets are still pending:

```bash
node scripts/check-v1-v6-asset-ready.mjs
```

Run the strict activation gate when the final files are landed:

```bash
node scripts/check-v1-v6-asset-ready.mjs --strict
```

## Evidence

The gate writes:

```text
audit/v1-v6/asset-ready-switch-report.json
```

## Meaning of states

- `V1_V6_ASSET_SWITCH_READY_FINAL_ASSETS_PENDING`: code, registry, and fallback mode are ready; final files still need to land.
- `V1_V6_ASSETS_ACTIVE`: every final file and final manifest required by the registry is present.
- `V1_V6_ASSET_SWITCH_BLOCKED`: the registry or fallback safety layer is incomplete.

## V7 rule

Do not reopen V1-V6 route architecture for asset activation. Drop final assets into the registered paths, run the strict gate, then proceed to V7.

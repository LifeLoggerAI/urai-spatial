# URAI Ecosystem Integration Contract V1

Spatial runtime consumes jobs/content/asset outputs and must preserve canonical chain compatibility.

Launch chain:
`UrAi -> urai-jobs -> urai-content -> asset-factory -> urai-spatial -> urai-studio -> B2Bportal`

See `URAI_ECOSYSTEM_SCHEMA_V1.json` for shared entities and field names.

Spatial-specific obligations:
- Accept generated assets in `png`, `svg`, `webp`, `glb`, and `gltf` where supported.
- Preserve fail-safe fallback scenes when provider/runtime dependencies are unavailable.
- Keep `/life-map`, `/spatial`, and public demo routes schema-compatible.
- Keep replay/focus transitions tied to stable node IDs from shared schema.

XR obligations:
- Keep WebXR/AR/VR integration points documented and gated.
- Do not claim live provider immersion without evidence and passing release checks.

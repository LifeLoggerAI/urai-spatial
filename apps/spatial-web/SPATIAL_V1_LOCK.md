# URAI-SPATIAL V1.0.0-LOCK

## Spatial Determinism Guarantees

1. Star position is derived solely from:
   - star.id
   - optional star.weight (if provided)

2. Position MUST NOT depend on:
   - Array index
   - Fetch order
   - Pagination order
   - Runtime physics simulation
   - Frame timing

3. Given identical star IDs and weights,
   layout must be identical across:
   - Reloads
   - Devices
   - Deployments
   - Future versions

4. Spatial checksum must remain stable
   for identical star sets.

5. Constellations are overlays only.
   They never modify base positions.

6. Parallax depth must be derived from star.id.

Violation invalidates replay continuity.

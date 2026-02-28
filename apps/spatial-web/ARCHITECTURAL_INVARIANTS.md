## Spatial Determinism Invariant

Star position MUST be derived solely from star.id.

Star position MUST NOT depend on:
- Array index
- Fetch order
- Pagination order
- Sorting mutations
- Temporal insertion order

Given the same star.id, position must be identical:
- Across reloads
- Across devices
- Across deployments
- Across versions

Violation of this invariant invalidates replay continuity.

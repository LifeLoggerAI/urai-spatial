# URAI Spatial Focus Tier-5 Lock

This pass upgrades Focus from a simple detail card into a Tier-5 Focus Chamber contract.

## Implemented files

- `focusTier5Model.ts` creates the typed Focus Chamber intelligence contract.
- `FocusChamber.tsx` renders the full spatial inspection chamber UI.

## Tier contract

The chamber is considered Tier-5 complete when all of these are true:

1. **Tier-1 Core Focus**: node id, title, subtitle, and node type are present.
2. **Tier-2 Spatial Camera**: focus camera scale, parallax, blur, aura radius, related star ids, and causal ids exist.
3. **Tier-3 Replay Engine**: replay has memory / emotion / pattern / insight / return phases plus camera path.
4. **Tier-4 Intelligence**: explainability summary, source signal ids, and six Focus layers are present.
5. **Tier-5 Mythic Spatial**: ritual path, particle timeline, and exportable scroll id are present.

## Focus layers

The chamber exposes six layers:

- Signal
- Why
- Pattern
- Replay
- Ritual
- Council

Each layer is derived from `LifeMapNode` plus graph edges, so the Focus experience is connected to the existing LifeMap model rather than a separate mock card.

## Integration target

Replace the existing `DetailCard` render in `SpatialScene.tsx` with:

```tsx
<FocusChamber
  node={selectedNode}
  nodes={lifeMapNodes}
  edges={lifeMapEdges}
  onReplay={() => startReplay(selectedNode)}
  onUnwind={() => {
    setSelectedNodeId(null);
    setShowReplay(false);
    goto("lifemap", null);
  }}
  onModeJump={(nextMode) => {
    setMode(nextMode as LifeMapMode);
    goto(nextMode === "mirror" ? "mirror" : "lifemap", null);
  }}
/>
```

And add:

```tsx
import FocusChamber from "./FocusChamber";
```

The model and UI are intentionally isolated so the live `SpatialScene.tsx` can adopt the chamber without disturbing the current route/state lock.

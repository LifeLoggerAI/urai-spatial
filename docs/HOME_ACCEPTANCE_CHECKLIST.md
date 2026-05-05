# Home-specific acceptance checklist

## Visual presence (Home idle)
- [ ] **Sky visible** on initial Home render.
- [ ] **Orb visible** and clearly distinguishable from the sky background.
- [ ] **Ground visible** and reads as a grounded layer (not a floating-only composition).
- [ ] **Avatar visible** in Home framing.

## Mode transitions
- [ ] **Home → LifeMap transition works** from Home controls/orb.
- [ ] **LifeMap → Home transition works** from return controls.
- [ ] During both directions, Home chrome remains interactive (no dead controls).
- [ ] No duplicate Home controls appear before, during, or after transitions.

## Reduced-motion behavior
- [ ] With `prefers-reduced-motion: reduce`, Home still renders all required visual layers.
- [ ] Transition behavior remains functional under reduced motion.
- [ ] Reduced-motion mode does not create duplicated controls or hidden/blocked primary controls.

## Runtime smoke assertion coverage
This checklist is backed by `tests/homeworld.smoke.spec.ts`, which asserts that Home mounts required scene layers, supports mode navigation, keeps chrome interactive during transition entry, and avoids duplicate Home controls.

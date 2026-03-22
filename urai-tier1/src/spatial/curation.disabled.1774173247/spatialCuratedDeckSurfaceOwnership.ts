/**
 * Curated deck surfaces split into two classes:
 *
 * 1) Builder-backed analytic surfaces
 *    - expected to own buildSpatialCuratedDeck*.ts and usually *Types.ts
 *
 * 2) Controller surfaces
 *    - intentionally orchestrate IO / preview memory / vault actions
 *    - do not require buildSpatialCuratedDeck*.ts parity
 */
export const SPATIAL_CURATED_DECK_CONTROLLER_SURFACES = [
  "Import",
  "Vault",
] as const;

export type SpatialCuratedDeckControllerSurface =
  (typeof SPATIAL_CURATED_DECK_CONTROLLER_SURFACES)[number];

export function isSpatialCuratedDeckControllerSurface(
  value: string,
): value is SpatialCuratedDeckControllerSurface {
  return (
    SPATIAL_CURATED_DECK_CONTROLLER_SURFACES as readonly string[]
  ).includes(value);
}

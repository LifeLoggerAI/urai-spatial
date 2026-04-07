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
  "Import",
  "Vault",
] as const;

export type SpatialCuratedDeckControllerSurface =

export function isSpatialCuratedDeckControllerSurface(
  value: string,
): value is SpatialCuratedDeckControllerSurface {
  return (
  ).includes(value);
}

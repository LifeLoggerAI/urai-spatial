export type EraCompareState = {
  id: string | null;
  title: string;
  label: string;
};

export function resolveEraCompareById(
  starId: string | undefined
): EraCompareState | null {
  if (!starId) return null;

  return {
    id: starId,
    title: `Era Compare · ${starId}`,
    label: `Era compare ready for ${starId}`,
  };
}

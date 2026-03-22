export type LifeMapIntelligenceState = {
  id: string | null;
  title: string;
  label: string;
};

export function resolveLifeMapIntelligenceById(
  starId: string | undefined
): LifeMapIntelligenceState | null {
  if (!starId) return null;

  return {
    id: starId,
    title: `LifeMap Intelligence · ${starId}`,
    label: `LifeMap intelligence ready for ${starId}`,
  };
}

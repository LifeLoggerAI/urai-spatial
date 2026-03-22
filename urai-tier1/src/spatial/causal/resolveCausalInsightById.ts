export type CausalInsightState = {
  id: string | null;
  title: string;
  label: string;
};

export function resolveCausalInsightById(
  starId: string | undefined
): CausalInsightState | null {
  if (!starId) return null;

  return {
    id: starId,
    title: `Causal Insight · ${starId}`,
    label: `Causal insight ready for ${starId}`,
  };
}

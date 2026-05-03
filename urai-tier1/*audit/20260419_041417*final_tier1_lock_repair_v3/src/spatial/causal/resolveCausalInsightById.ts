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
  };
}

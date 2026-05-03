export type ExternalIngestState = {
  id: string | null;
  title: string;
  label: string;
};

export function resolveExternalIngestStateById(
  starId: string | undefined
): ExternalIngestState | null {
  if (!starId) return null;

  return {
    id: starId,
  };
}

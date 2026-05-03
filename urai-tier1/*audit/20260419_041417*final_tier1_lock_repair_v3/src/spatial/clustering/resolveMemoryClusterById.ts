export type MemoryClusterState = {
  id: string | null;
  title: string;
  label: string;
};

export function resolveMemoryClusterById(
  starId: string | undefined
): MemoryClusterState | null {
  if (!starId) return null;

  return {
    id: starId,
  };
}

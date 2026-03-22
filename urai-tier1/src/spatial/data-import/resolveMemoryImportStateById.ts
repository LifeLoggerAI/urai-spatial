export type MemoryImportState = {
  id: string | null;
  title: string;
  label: string;
};

export function resolveMemoryImportStateById(
  starId: string | undefined
): MemoryImportState | null {
  if (!starId) return null;

  return {
    id: starId,
    title: `Memory Import · ${starId}`,
    label: `Memory import ready for ${starId}`,
  };
}

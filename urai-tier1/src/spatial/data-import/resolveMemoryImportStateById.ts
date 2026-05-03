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
    title: "Memory import",
    label: "Memory import ready",
  };
}

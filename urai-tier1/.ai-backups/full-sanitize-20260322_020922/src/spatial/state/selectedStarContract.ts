export type CanonicalSelectedStar =
  | string
  | {
      id: string;
      label?: string | null;
      title?: string | null;
      name?: string | null;
    }
  | null
  | undefined;

export function getSelectedStarId(value: CanonicalSelectedStar): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}
export type SelectedStar = { id: string; label?: string | null; title?: string | null; name?: string | null; color?: string | null; glow?: number | null; position?: [number, number, number] | null; };

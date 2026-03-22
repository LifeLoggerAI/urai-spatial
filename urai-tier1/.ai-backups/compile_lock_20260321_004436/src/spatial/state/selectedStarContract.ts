import type { SpatialStar } from "../data/stars";

export type CanonicalSelectedStar = {
  id: string | null;
  label: string | null;
  tags: string[];
  raw: SpatialStar | null;
};

export function emptyCanonicalSelectedStar(): CanonicalSelectedStar {
  return {
    id: null,
    label: null,
    tags: [],
    raw: null,
  };
}

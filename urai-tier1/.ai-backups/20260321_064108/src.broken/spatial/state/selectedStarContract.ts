import type { SpatialStar } from "../data/stars";

export type SelectedStarLike =
  | string
  | SpatialStar
  | {
      id?: string | null;
      label?: string | null;
      title?: string | null;
      color?: string | null;
      chapter?: string | null;
      timeband?: string | null;
      signature?: string | null;
      tags?: string[];
    }
  | null
  | undefined;

export type SelectedStar = SelectedStarLike;

export type CanonicalSelectedStar = {
  id: string | null;
  label: string | null;
  title: string | null;
  color: string | null;
  chapter: string | null;
  timeband: string | null;
  signature: string | null;
  tags: string[];
  raw: SpatialStar | null;
};

export function emptyCanonicalSelectedStar(): CanonicalSelectedStar {
  return {
    id: null,
    label: null,
    title: null,
    color: null,
    chapter: null,
    timeband: null,
    signature: null,
    tags: [],
    raw: null,
  };
}

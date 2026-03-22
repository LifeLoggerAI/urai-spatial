import { resolveStarById } from "../data/stars";
import type { CanonicalSelectedStar, SelectedStarLike } from "./selectedStarContract";

export function toCanonicalSelectedStar(input: SelectedStarLike): CanonicalSelectedStar {
  if (!input) {
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

  if (typeof input === "string") {
    const star = resolveStarById(input);
    return {
      id: star?.id ?? input,
      label: star?.label ?? null,
      title: star?.title ?? star?.label ?? input,
      color: star?.color ?? "#ffffff",
      chapter: star?.chapter ?? null,
      timeband: star?.timeband ?? null,
      signature: star?.signature ?? null,
      tags: star?.tags ?? [],
      raw: star,
    };
  }

  const objectValue = input as {
    id?: unknown;
    label?: unknown;
    title?: unknown;
    color?: unknown;
    chapter?: unknown;
    timeband?: unknown;
    signature?: unknown;
    tags?: unknown;
  };

  const id = typeof objectValue.id === "string" ? objectValue.id : null;
  const raw = resolveStarById(id);

  return {
    id: raw?.id ?? id,
    label: typeof objectValue.label === "string" ? objectValue.label : raw?.label ?? null,
    title:
      typeof objectValue.title === "string"
        ? objectValue.title
        : typeof objectValue.label === "string"
          ? objectValue.label
          : raw?.title ?? raw?.label ?? null,
    color: typeof objectValue.color === "string" ? objectValue.color : raw?.color ?? "#ffffff",
    chapter: typeof objectValue.chapter === "string" ? objectValue.chapter : raw?.chapter ?? null,
    timeband: typeof objectValue.timeband === "string" ? objectValue.timeband : raw?.timeband ?? null,
    signature: typeof objectValue.signature === "string" ? objectValue.signature : raw?.signature ?? null,
    tags: Array.isArray(objectValue.tags)
      ? objectValue.tags.map((item: unknown) => String(item)).filter(Boolean)
      : raw?.tags ?? [],
    raw,
  };
}

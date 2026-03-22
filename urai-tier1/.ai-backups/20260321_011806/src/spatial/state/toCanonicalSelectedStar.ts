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
      title: star?.label ?? input,
      color: star?.color ?? "#ffffff",
      chapter: null,
      timeband: null,
      signature: null,
      tags: [],
      raw: star,
    };
  }

  const obj = input as {
    id?: unknown;
    label?: unknown;
    title?: unknown;
    color?: unknown;
    chapter?: unknown;
    timeband?: unknown;
    signature?: unknown;
    tags?: unknown;
  };

  const id = typeof obj.id === "string" ? obj.id : null;
  const raw = resolveStarById(id);

  return {
    id: raw?.id ?? id,
    label: typeof obj.label === "string" ? obj.label : raw?.label ?? null,
    title:
      typeof obj.title === "string"
        ? obj.title
        : typeof obj.label === "string"
          ? obj.label
          : raw?.label ?? null,
    color: typeof obj.color === "string" ? obj.color : raw?.color ?? "#ffffff",
    chapter: typeof obj.chapter === "string" ? obj.chapter : null,
    timeband: typeof obj.timeband === "string" ? obj.timeband : null,
    signature: typeof obj.signature === "string" ? obj.signature : null,
    tags: Array.isArray(obj.tags) ? obj.tags.map((x: unknown) => String(x)).filter(Boolean) : [],
    raw,
  };
}

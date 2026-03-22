import { resolveStarById } from "../data/stars";
import type { CanonicalSelectedStar } from "./selectedStarContract";

export function toCanonicalSelectedStar(input: unknown): CanonicalSelectedStar {
  if (typeof input === "string") {
    const star = resolveStarById(input);
    return {
      id: star?.id ?? input,
      label: star?.label ?? null,
      tags: [],
      raw: star,
    };
  }

  if (input && typeof input === "object") {
    const obj = input as {
      id?: unknown;
      label?: unknown;
      tags?: unknown;
    };

    const id = typeof obj.id === "string" ? obj.id : null;
    const raw = resolveStarById(id);
    const tags = Array.isArray(obj.tags)
      ? obj.tags.map((x: unknown) => String(x)).filter(Boolean)
      : [];

    return {
      id: raw?.id ?? id,
      label: typeof obj.label === "string" ? obj.label : raw?.label ?? null,
      tags,
      raw,
    };
  }

  return {
    id: null,
    label: null,
    tags: [],
    raw: null,
  };
}

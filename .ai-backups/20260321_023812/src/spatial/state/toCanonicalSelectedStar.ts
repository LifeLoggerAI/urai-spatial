"use client";

export function toCanonicalSelectedStar(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "id" in (value as Record<string, unknown>)) {
    const v = (value as Record<string, unknown>).id;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  }
  return null;
}

export default toCanonicalSelectedStar;

export type SpatialMode = import("@/lib/uraiCanon/types").Mode;

export const normalizeMode = (mode: string): SpatialMode => {
  const m = String(mode || "").toUpperCase();
  if (m === "HOME" || m === "ASCENT" || m === "LIFEMAP" || m === "FOCUS" || m === "REPLAY") {
    return m as SpatialMode;
  }
  return "HOME";
};

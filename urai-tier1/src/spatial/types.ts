import type { Tier1Phase } from "@/canon/tier1";

export type Mode = Tier1Phase;

export type UnityRuntimePayload = Record<string, unknown>;
export type XrState = Record<string, unknown>;
export type SpatialPersistenceSnapshot = Record<string, unknown>;

export type GroundObject = {
  id: string;
  label?: string;
  description?: string;
  position: [number, number, number];
  color?: string;
  shape?: string;
};

export type MemoryStar = {
  id: string;
  position: [number, number, number];
  color?: string;
  baseScale?: number;
  category?: string;
};

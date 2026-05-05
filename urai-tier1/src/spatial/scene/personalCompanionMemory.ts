import type { LifeMapMode, LifeMapNode } from "./lifeMapModel";

export type PersonalCompanionMemory = {
  userName: string;
  preferredTone: "calm" | "direct" | "mythic" | "professor" | "gentle";
  recurringThemes: string[];
  languageAnchors: string[];
  lastMode: LifeMapMode;
  lastStarId: string | null;
  interactionCount: number;
  updatedAt: number;
};

const STORAGE_KEY = "urai.personalCompanionMemory.v1";

export const defaultPersonalCompanionMemory: PersonalCompanionMemory = {
  userName: "Adam",
  preferredTone: "gentle",
  recurringThemes: ["recovery", "symbolic meaning", "life patterns", "building URAI"],
  languageAnchors: ["your sky", "pattern", "recovery bloom", "companion"],
  lastMode: "timeline",
  lastStarId: null,
  interactionCount: 0,
  updatedAt: 0,
};

export function loadPersonalCompanionMemory(): PersonalCompanionMemory {
  if (typeof window === "undefined") return defaultPersonalCompanionMemory;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersonalCompanionMemory;
    return { ...defaultPersonalCompanionMemory, ...JSON.parse(raw) };
  } catch {
    return defaultPersonalCompanionMemory;
  }
}

export function savePersonalCompanionMemory(memory: PersonalCompanionMemory) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...memory, updatedAt: Date.now() }));
}

export function updateMemoryFromInteraction(
  memory: PersonalCompanionMemory,
  mode: LifeMapMode,
  selectedNode: LifeMapNode | null,
  userText: string
): PersonalCompanionMemory {
  const lower = userText.toLowerCase();
  const newThemes = new Set(memory.recurringThemes);

  if (lower.includes("shadow")) newThemes.add("shadow work");
  if (lower.includes("dream")) newThemes.add("dream symbols");
  if (lower.includes("recovery") || lower.includes("heal")) newThemes.add("recovery");
  if (lower.includes("build") || lower.includes("repo")) newThemes.add("building URAI");
  if (selectedNode?.emotionalTone) newThemes.add(selectedNode.emotionalTone);

  return {
    ...memory,
    recurringThemes: Array.from(newThemes).slice(-8),
    lastMode: mode,
    lastStarId: selectedNode?.id ?? memory.lastStarId,
    interactionCount: memory.interactionCount + 1,
    updatedAt: Date.now(),
  };
}

export function personalizeCompanionText(base: string, memory: PersonalCompanionMemory) {
  const name = memory.userName ? `${memory.userName}, ` : "";
  const theme = memory.recurringThemes[memory.recurringThemes.length - 1];
  if (memory.interactionCount < 2) return `${name}${base}`;
  return `${name}${base} I am also holding the longer thread here: ${theme}.`;
}

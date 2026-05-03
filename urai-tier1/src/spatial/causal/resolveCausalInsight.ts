import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";
import { resolveMemoryClusterById } from "@/spatial/clustering/resolveMemoryCluster";
import { resolveLifeMapIntelligence } from "@/spatial/intelligence/resolveLifeMapIntelligence";

export type CausalInsight = {
id: string;
title: string;
summary: string;
readiness: number;
drivers: string[];
hypotheses: string[];
evidence: string[];
};

type LooseRecord = Record<string, unknown>;

function unique(values: Array<string | undefined | null>): string[] {
const out: string[] = [];

for (const value of values) {
if (!value) continue;
if (!out.includes(value)) out.push(value);
}

return out;
}

function clamp(value: number, min: number, max: number): number {
return Math.max(min, Math.min(max, value));
}

function toNumericId(id: string): number {
const parsed = Number(id);
return Number.isFinite(parsed) ? parsed : 0;
}

function numberFrom(value: unknown): number {
return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringFrom(value: unknown): string | undefined {
return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function resolveCausalInsightById(
id: string | null | undefined
): CausalInsight | undefined {
if (!id) return undefined;

const numericId = toNumericId(id);
const memory = resolveMemorySphereById(id);
const cluster = resolveMemoryClusterById(id);
const intelligence = resolveLifeMapIntelligence(numericId);

if (!memory && !cluster && !intelligence) return undefined;
if (!memory) return undefined;

const memoryRecord = memory as LooseRecord;
const clusterRecord = (cluster ?? {}) as LooseRecord;
const intelligenceRecord = (intelligence ?? {}) as LooseRecord;

const neighbors = Array.isArray(clusterRecord.neighbors)
? clusterRecord.neighbors
: [];

const clusterCount = neighbors.length;

const score =
numberFrom(intelligenceRecord.score) ||
numberFrom(intelligenceRecord.readiness) ||
numberFrom(intelligenceRecord.confidence) ||
numberFrom(intelligenceRecord.signalScore) ||
numberFrom(intelligenceRecord.patternScore);

const intensity = numberFrom(memoryRecord.intensity);

const drivers = unique([
stringFrom(memoryRecord.chapter),
stringFrom(memoryRecord.timeband),
stringFrom(memoryRecord.emotion),
stringFrom(intelligenceRecord.dominantSignal),
stringFrom(intelligenceRecord.signal),
]).slice(0, 6);

const hypotheses = unique([
score >= 60 ? "pattern score suggests higher-confidence causal linkage" : undefined,
clusterCount > 0 ? "nearby memories suggest contextual reinforcement" : undefined,
intensity >= 7 ? "memory intensity suggests stronger causal weight" : undefined,
]).slice(0, 5);

const evidence = unique([
]).slice(0, 6);

const readiness = clamp(
Math.round(clusterCount * 10 + score * 0.45 + intensity * 4),
0,
100
);

const summary =
readiness >= 70
? "The current memory now has a usable causal scaffold across adjacency, emotion, and score signals."
: "A causal scaffold is active, but stronger dataset coverage will improve confidence and directionality.";

return {
id,
title: "Causal insight",
summary,
readiness,
drivers,
hypotheses,
evidence,
};
}

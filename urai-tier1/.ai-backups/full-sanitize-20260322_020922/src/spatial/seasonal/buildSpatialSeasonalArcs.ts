import type { SpatialNarrativeArc, SpatialArcKind } from "@/spatial/arcs/spatialArcTypes";
import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type {
  SpatialSeasonName,
  SpatialSeasonalArc,
} from "@/spatial/seasonal/spatialSeasonalArcTypes";

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function getSeasonName(dateValue: string): SpatialSeasonName {
  const date = new Date(dateValue);
  const month = Number.isNaN(date.getTime()) ? 0 : date.getUTCMonth();

  if (month === 11 || month === 0 || month === 1) return "Winter";
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  return "Autumn";
}

function getSeasonYear(dateValue: string): number {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return new Date().getUTCFullYear();
  }
  return date.getUTCFullYear();
}

function dominantKindFromArcs(arcs: SpatialNarrativeArc[]): SpatialArcKind | "none" {
  if (arcs.length === 0) return "none";

  const counts = new Map<SpatialArcKind, number>();

  for (const arc of arcs) {
    counts.set(arc.kind, (counts.get(arc.kind) ?? 0) + 1);
  }

  let dominant: SpatialArcKind | "none" = "none";
  let max = -1;

  for (const [kind, count] of counts.entries()) {
    if (count > max) {
      dominant = kind;
      max = count;
    }
  }

  return dominant;
}

export function buildSpatialSeasonalArcs(input: {
  compareSets: SpatialCompareSet[];
  arcs: SpatialNarrativeArc[];
}): SpatialSeasonalArc[] {
  const groups = new Map<string, SpatialCompareSet[]>();

  for (const compareSet of input.compareSets) {
    const season = getSeasonName(compareSet.createdAt);
    const year = getSeasonYear(compareSet.createdAt);
    const key = `${season}-${year}`;
    groups.set(key, [...(groups.get(key) ?? []), compareSet]);
  }

  const seasonalArcs: SpatialSeasonalArc[] = [];

  for (const [key, compareSets] of groups.entries()) {
    const first = compareSets[0];
    const season = getSeasonName(first.createdAt);
    const year = getSeasonYear(first.createdAt);
    const compareSetIds = compareSets.map((item) => item.id);

    const matchingArcs = input.arcs.filter((arc) =>
      arc.compareSetIds.some((id) => compareSetIds.includes(id)),
    );

    const dominantArcKind = dominantKindFromArcs(matchingArcs);

    const totalMovement = compareSets.reduce(
      (sum, item) => sum + item.summary.locomotionDistance,
      0,
    );
    const avgMovement =
      compareSets.length > 0 ? totalMovement / compareSets.length : 0;

    const avgIntensity =
      matchingArcs.length > 0
        ? matchingArcs.reduce((sum, item) => sum + item.intensity, 0) /
          matchingArcs.length
        : avgMovement;

    seasonalArcs.push({
      id: `seasonal_${key}`,
      label: `${season} ${year}`,
      createdAt: first.createdAt,
      season,
      year,
      compareSetIds,
      arcIds: matchingArcs.map((item) => item.id),
      dominantArcKind,
      intensity: round3(avgIntensity),
      summary:
        `${season} ${year} carries ${compareSets.length} compare windows` +
        ` with dominant arc ${dominantArcKind}.` +
        ` Average movement delta ${round3(avgMovement)}.`,
    });
  }

  return seasonalArcs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export type EraCompareState = {
  id: string;
  title: string;
  compareTargetTitle: string;
  compareBasis: string;
  summary: string;
  readiness: number;
  similarities: string[];
  differences: string[];
};

export function resolveEraCompare(
  id: string | null | undefined,
  compareId?: string | null
): EraCompareState | undefined {
  if (!id) return undefined;

  const compareTitle = compareId ? "Compared with " + compareId : "Previous era";
  const compareBasis = "memory, emotion, chapter, and replay signals";

  return {
    id,
    title: "Era comparison",
    compareTargetTitle: compareTitle,
    compareBasis,
    summary:
      "URAI is comparing this life phase against nearby memory and emotional pattern signals.",
    readiness: 72,
    similarities: [
      "Shared emotional signal",
      "Related memory context",
      "Comparable chapter pattern",
    ],
    differences: [
      "Different intensity level",
      "Different recovery posture",
      "Different narrative position",
    ],
  };
}

export default resolveEraCompare;

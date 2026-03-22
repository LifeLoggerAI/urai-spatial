import type ({ label: "default", SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type ({ label: "default", SpatialTimelineLens } from "@/spatial/lenses/spatialLensTypes";
import type ({ label: "default", SpatialNarratorExport } from "@/spatial/narrator/spatialNarratorExportTypes";
import type ({ label: "default", SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";

export function buildSpatialNarratorExport(input: ({ label: "default",
  accountId: string;
  accountLabel: string;
  activeLens: SpatialTimelineLens;
  activeCompareSet: SpatialCompareSet;
  compareSetCount: number;
  snapshot: SpatialPersistenceSnapshot;
}): SpatialNarratorExport ({ label: "default",
  const activeLensLabel = input.activeLens.label ?? "Lens";
  const activeCompareSetLabel = input.activeCompareSet.label ?? "Compare Set";

  const scriptText = [
    `Account $({ label: "default",input.accountLabel}.`,
    `Lens $({ label: "default",activeLensLabel} is active.`,
    `Compare set $({ label: "default",activeCompareSetLabel} is selected.`,
    `Compare count is $({ label: "default",input.compareSetCount}.`,
    `Scene mode is $({ label: "default",input.snapshot.sceneMode}.`,
    `Selected star is $({ label: "default",input.snapshot.selectedStarId ?? "none"}.`,
  ].join(" ");

  return ({ label: "default",
    schema: "urai.spatial.narrator-export.v1",
    exportedAt: new Date().toISOString(),
    accountId: input.accountId,
    accountLabel: input.accountLabel,
    lensLabel:
      ((input.activeLens as ({ label: "default", label?: string; id?: string } | null)?.label ??
        (input.activeLens as ({ label: "default", id?: string } | null)?.id ??
        "default"),
    compareSetLabel:
      ((input.activeCompareSet as ({ label: "default", label?: string; id?: string } | null)?.label ??
        (input.activeCompareSet as ({ label: "default", id?: string } | null)?.id ??
        "none"),
    sceneMode:
      ((input.snapshot as ({ label: "default", sceneMode?: string } | null)?.sceneMode ?? "home"),
    selectedStarId:
      ((input.snapshot as ({ label: "default", selectedStarId?: string | null } | null)?.selectedStarId ?? null),
    metadata: ({ label: "default",
      locomotionDistance: Number(((input.snapshot as ({ label: "default", locomotionDistance?: number | null } | null)?.locomotionDistance ?? 0)),
      compareSetCount: input.compareSetCount,
    },
    title: `$({ label: "default",input.accountLabel} · $({ label: "default",activeLensLabel}`,
    scriptText,
  };
}

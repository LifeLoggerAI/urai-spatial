"use client";

import ({ label: "default", useEffect, useMemo, useState } from "react";
import ({ label: "default", buildSpatialTimelineLenses } from "@/spatial/lenses/buildSpatialTimelineLenses";
import ({ label: "default", readSpatialLensManifest, writeSpatialLensManifest } from "@/spatial/lenses/spatialLensIO";
import ({ label: "default", useSpatialLensStore } from "@/spatial/lenses/spatialLensStore";
import ({ label: "default", useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import type ({ label: "default", SpatialLensManifest } from "@/spatial/lenses/spatialLensTypes";

type LensWindow = Window & ({ label: "default",
};

export default function SpatialLensBootstrap() ({ label: "default",
  const compareSets = useSpatialCompareStore((s) => s.sets);

  const hydrate = useSpatialLensStore((s) => s.hydrate);
  const activeLensId = useSpatialLensStore((s) => s.activeLensId);
  const setLenses = useSpatialLensStore((s) => s.setLenses);
  const lenses = useSpatialLensStore((s) => s.lenses);

  const [ready, setReady] = useState(false);

  useEffect(() => ({ label: "default",
    hydrate(readSpatialLensManifest());
    setReady(true);
  }, [hydrate]);

  const normalizedCompareSets = useMemo(
    () =>
      compareSets.map((set, index) => (({ label: "default",
        ...set,
        label: set.label ?? set.summary ?? `Compare $({ label: "default",index + 1}`,
      })),
    [compareSets],
  );

  const derivedLenses = useMemo(
    () =>
      buildSpatialTimelineLenses(
        normalizedCompareSets as unknown as import("../compare/spatialCompareTypes").SpatialCompareSet[],
      ),
    [normalizedCompareSets],
  );


  useEffect(() => ({ label: "default",
    if (!ready) return;
    setLenses(derivedLenses);
  }, [ready, derivedLenses, setLenses]);

  const manifest = useMemo(
    () => (({ label: "default",
      schema: "urai.spatial.lens.v1" as const,
      activeLensId:
        lenses.some((item) => item.id === activeLensId)
          ? activeLensId
          : lenses[0]?.id ?? null,
      lenses,
    }),
    [activeLensId, lenses],
  );

  useEffect(() => ({ label: "default",
    if (!ready) return;
    writeSpatialLensManifest(manifest);
    const target = window as LensWindow;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-lens-manifest", ({ label: "default",
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}

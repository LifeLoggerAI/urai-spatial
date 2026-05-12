"use client";

import { SpatialErrorBoundary } from "@/components/spatial/spatial-error-boundary";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <SpatialErrorBoundary error={error} reset={reset} />;
}

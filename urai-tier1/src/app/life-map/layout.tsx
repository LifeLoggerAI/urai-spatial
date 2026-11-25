import type { ReactNode } from "react";
import { connection } from "next/server";
import { publicStorytimeSampleAvailable } from "@/lib/storytime/publicSampleAvailable";
import SpatialLifeMapCanonical from "@/spatial/lifemap/SpatialLifeMapCanonical";

export default async function LifeMapLayout({ children }: { children: ReactNode }) {
  if (process.env.URAI_FIREBASE_STATIC_EXPORT !== "true") await connection();
  return <SpatialLifeMapCanonical publicSamplesAvailable={publicStorytimeSampleAvailable()}>{children}</SpatialLifeMapCanonical>;
}

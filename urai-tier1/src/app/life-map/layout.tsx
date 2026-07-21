"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import SpatialLifeMapCanonical from "@/spatial/lifemap/SpatialLifeMapCanonical";

export default function LifeMapLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const canonicalRoute = pathname === "/life-map" || pathname === "/life-map/";

  return (
    <div className="lifemap-starfield-shell">
      {canonicalRoute ? <SpatialLifeMapCanonical /> : children}
    </div>
  );
}

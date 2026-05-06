"use client";

import React, { Suspense } from "react";
import HomeScene from "@/scene/HomeScene";
import { SpatialShell } from "@/spatial/layout/SpatialShell";

const HomePage: React.FC = () => {
  return (
    <SpatialShell mode="overview" sourceBadge="demo">
      <Suspense fallback={<div style={{ color: "white", padding: 24 }}>Loading URAI Spatial...</div>}>
        <HomeScene />
      </Suspense>
    </SpatialShell>
  );
};

export default HomePage;

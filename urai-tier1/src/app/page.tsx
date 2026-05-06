"use client";

import React, { Suspense } from "react";
import HomeScene from "@/scene/HomeScene";
import { SpatialShell } from "@/spatial/layout/SpatialShell";

const HomePage: React.FC = () => {
  return (
    <SpatialShell mode="overview">
      <Suspense fallback={null}>
        <HomeScene />
      </Suspense>
    </SpatialShell>
  );
};

export default HomePage;

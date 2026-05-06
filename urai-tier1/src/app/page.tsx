"use client";

import React from "react";
import HomeScene from "@/scene/HomeScene";
import { SpatialShell } from "@/spatial/layout/SpatialShell";

const HomePage: React.FC = () => {
  return (
    <SpatialShell mode="overview" sourceBadge="demo">
      <HomeScene />
    </SpatialShell>
  );
};

export default HomePage;

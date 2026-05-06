"use client";
import React from "react";
import { HomeScene } from "@/scene/HomeScene";
import { SpatialShell } from "@/spatial/layout/SpatialShell";

const HomePage: React.FC = () => {
  return (
    <main>
      <SpatialShell>
        <HomeScene />
      </SpatialShell>
    </main>
  );
};

export default HomePage;

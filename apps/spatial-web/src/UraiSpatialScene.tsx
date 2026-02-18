"use client";

import React from "react";

type UraiSpatialSceneProps = {
  sceneName: string;
};

export function UraiSpatialScene({ sceneName }: UraiSpatialSceneProps) {
  return (
    <div style={{ color: "white", padding: 20 }}>
      UraiSpatialScene Loaded
      <div>Scene: {sceneName}</div>
    </div>
  );
}

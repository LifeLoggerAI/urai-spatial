"use client";

import HomeEnvironment from "./HomeEnvironment";
import LifeMap from "./LifeMap";
import SpatialHUD from "./SpatialHUD";

export default function SpatialScene() {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, #050714 0%, #101936 52%, #05060d 100%)",
        color: "white",
      }}
    >
      <HomeEnvironment />
      <LifeMap />
      <SpatialHUD />
    </main>
  );
}

"use client";

import SceneBackground from "./components/SceneBackground";
import LockedCamera from "./components/LockedCamera";
import SceneLighting from "./components/SceneLighting";
import Starfield from "./components/Starfield";

export default function App() {
  return (
    <SceneBackground>
      <LockedCamera />
      <SceneLighting />
      <Starfield />
    </SceneBackground>
  );
}
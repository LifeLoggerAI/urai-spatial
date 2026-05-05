"use client";

import { usePathname, useSearchParams } from "next/navigation";
import ThreeSceneRoot from "./ThreeSceneRoot";
import ShaderSky from "./ShaderSky";
import HomeParticleField from "./HomeParticleField";
import OrbMesh from "./OrbMesh";
import useAudioReactivity from "./useAudioReactivity";

function phaseFromRoute(pathname: string | null, queryPhase: string | null) {
  const source = `${queryPhase ?? ""} ${pathname ?? ""}`.toLowerCase();

  if (source.includes("mirror")) return "MIRROR";
  if (source.includes("replay")) return "REPLAY";
  if (source.includes("focus")) return "FOCUS";
  if (source.includes("life-map") || source.includes("lifemap")) return "LIFEMAP";
  return "HOME";
}

export default function SpatialV2Overlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const phase = phaseFromRoute(pathname, searchParams.get("phase"));
  const showHomeEngine = phase === "HOME";

  const audio = useAudioReactivity();

  if (!showHomeEngine) return null;

  return (
    <>
      <ThreeSceneRoot>
        <ShaderSky />
        <HomeParticleField phase={phase} />
        <OrbMesh audioLevel={audio.level} />
      </ThreeSceneRoot>
    </>
  );
}

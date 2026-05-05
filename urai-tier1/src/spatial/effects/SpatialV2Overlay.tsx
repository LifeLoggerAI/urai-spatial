"use client";

import { usePathname, useSearchParams } from "next/navigation";
import ThreeSceneRoot from "./ThreeSceneRoot";
import ShaderSky from "./ShaderSky";
import HomeParticleField from "./HomeParticleField";
import OrbMesh from "./OrbMesh";
import useDepthParallax from "./useDepthParallax";
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

  const parallax = useDepthParallax();
  const audio = useAudioReactivity();

  if (!showHomeEngine) return null;

  return (
    <>
      <ThreeSceneRoot>
        <ShaderSky parallax={parallax} />
        <HomeParticleField phase={phase} />
        <OrbMesh audioLevel={audio.level} />
      </ThreeSceneRoot>

      <button
        onClick={audio.enabled ? audio.stop : audio.start}
        style={{
          position: "fixed",
          bottom: 120,
          right: 20,
          zIndex: 9999,
          padding: "8px 12px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.5)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {audio.enabled ? "Audio: ON" : "Enable Audio"}
      </button>
    </>
  );
}

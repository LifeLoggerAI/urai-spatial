import { Suspense } from "react";
import Tier5ReplayScene from "@/spatial/scene/Tier5ReplayScene";

export default function ReplayRoute() {
  return (
    <Suspense fallback={null}>
      <Tier5ReplayScene />
    </Suspense>
  );
}

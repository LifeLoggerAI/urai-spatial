import { Suspense } from "react";
import FocusRouteStage from "@/spatial/scene/FocusRouteStage";

export default function FocusRoute() {
  return (
    <Suspense fallback={null}>
      <FocusRouteStage />
    </Suspense>
  );
}
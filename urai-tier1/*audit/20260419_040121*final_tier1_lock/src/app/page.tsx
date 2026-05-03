"use client";

import dynamic from "next/dynamic";

const SpatialScene = dynamic(
() => import("@/spatial/scene/SpatialScene"),
{ ssr: false }
);

export default function Page() {
return <SpatialScene />;
}

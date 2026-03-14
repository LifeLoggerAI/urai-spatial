"use client"

import dynamic from "next/dynamic"

const SpatialScene = dynamic(
  () => import("../engine/scene/SpatialScene"),
  { ssr: false }
)

export default function Page() {
  return <SpatialScene />
}
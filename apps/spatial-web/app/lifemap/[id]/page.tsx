"use client"

import ReplayScene from "@/apps/spatial-web/components/scene/ReplayScene"
import { useParams } from "next/navigation"

export default function Page() {
  const { id } = useParams()

  if (!id) return null

  return <ReplayScene id={id as string} />
}

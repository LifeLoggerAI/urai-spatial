"use client"

import { useRouter } from "next/navigation"

export default function ReplayPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  return (
    <div
      style={{
        background: "black",
        color: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1>Replay</h1>
      <p>Memory ID: {params.id}</p>

      <button onClick={() => router.push("/lifemap")}>
        Back to Life Map
      </button>
    </div>
  )
}

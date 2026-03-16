'use client'

import { useState } from 'react'
import SpatialScene from './SpatialScene'

export default function HomeView() {
  const [sceneActive, setSceneActive] = useState(false)

  return (
    <div className="w-screen h-screen bg-black">
      {!sceneActive ? (
        <button
          onClick={() => setSceneActive(true)}
          className="absolute top-4 left-4 z-10 px-4 py-2 bg-black text-white border border-white rounded hover:bg-white hover:text-black transition"
        >
          Enter URAI Spatial
        </button>
      ) : (
        <SpatialScene />
      )}
    </div>
  )
}

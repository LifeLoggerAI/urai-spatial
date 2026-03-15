 

"use client"

\

import { useEffect } from "react"

import { useSpatialStore } from "../state/spatialStore"

\

export default function EscapeController(){

\

  const clearStar = useSpatialStore(s => s.clearStar)

\

  useEffect(() => {

\

    const handleKey = (e: KeyboardEvent) => {

\

      if (e.repeat) return

\

      const target = e.target as HTMLElement | null

      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return

\

      if (e.key === "Escape") {

        clearStar()

      }

\

    }

\

    window.addEventListener("keydown", handleKey)

\

    return () => {

      window.removeEventListener("keydown", handleKey)

    }

\

  }, [clearStar])

\

  return null

}

  

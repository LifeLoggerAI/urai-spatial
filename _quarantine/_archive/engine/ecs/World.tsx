"use client"

import { ReactNode, createContext, useContext, useMemo } from "react"

export type WorldContextType = {
  // placeholder for future world state
  // example:
  // scene?: string
}

const WorldContext = createContext<WorldContextType | undefined>(undefined)

export function useWorld(): WorldContextType {
  const ctx = useContext(WorldContext)

  if (!ctx) {
    throw new Error("useWorld must be used inside <World>")
  }

  return ctx
}

export default function World({ children }: { children: ReactNode }) {

  const world = useMemo<WorldContextType>(() => {
    return {}
  }, [])

  return (
    <WorldContext.Provider value={world}>
      {children}
    </WorldContext.Provider>
  )
}
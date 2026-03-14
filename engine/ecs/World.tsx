"use client"

import { ReactNode, createContext, useContext } from "react"

type WorldContextType = {}

const WorldContext = createContext<WorldContextType | null>(null)

export function useWorld() {
  const ctx = useContext(WorldContext)
  if (!ctx) throw new Error("useWorld must be used inside World")
  return ctx
}

export default function World({ children }: { children: ReactNode }) {

  const world: WorldContextType = {}

  return (
    <WorldContext.Provider value={world}>
      {children}
    </WorldContext.Provider>
  )
}
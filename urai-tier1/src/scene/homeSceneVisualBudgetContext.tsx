'use client'

import { createContext, ReactNode, useContext } from 'react'
import { HomeSceneVisualBudget } from './homeSceneVisualBudget'

const HomeSceneVisualBudgetContext = createContext<HomeSceneVisualBudget | null>(null)

export function HomeSceneVisualBudgetProvider({
  value,
  children,
}: {
  value: HomeSceneVisualBudget
  children: ReactNode
}) {
  return <HomeSceneVisualBudgetContext.Provider value={value}>{children}</HomeSceneVisualBudgetContext.Provider>
}

export function useSharedHomeSceneVisualBudget() {
  return useContext(HomeSceneVisualBudgetContext)
}

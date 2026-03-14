import { create } from "zustand"

type QualityState = {

  emotionalEnvironment: boolean

  setEmotionalEnvironment: (value: boolean) => void
  toggleEmotionalEnvironment: () => void

}

export const useQualityStore = create<QualityState>((set)=>({

  emotionalEnvironment: true,

  setEmotionalEnvironment: (value:boolean)=>
    set({ emotionalEnvironment:value }),

  toggleEmotionalEnvironment: () =>
    set((state)=>({
      emotionalEnvironment: !state.emotionalEnvironment
    }))

}))
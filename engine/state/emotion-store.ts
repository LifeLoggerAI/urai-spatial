import { create } from 'zustand'

export type EmotionalState =
  | 'stability'
  | 'anxiety'
  | 'growth'
  | 'grief'
  | 'recovery'
  | 'breakthrough'
  | 'trauma'
  | 'clarity'

interface EmotionStore {

  state: EmotionalState
  intensity: number
  thresholdActive: boolean

  setState: (state: EmotionalState, intensity?: number) => void
  setIntensity: (value: number) => void
  setThreshold: (active: boolean) => void
  resetEmotion: () => void
}

function clamp(v:number){
  return Math.max(0, Math.min(1, v))
}

export const useEmotionStore = create<EmotionStore>((set)=>({

  state:'stability',
  intensity:0.5,
  thresholdActive:false,

  setState:(state,intensity=0.5)=>
    set({
      state,
      intensity: clamp(intensity)
    }),

  setIntensity:(value)=>
    set({
      intensity: clamp(value)
    }),

  setThreshold:(active)=>
    set({
      thresholdActive: active
    }),

  resetEmotion:()=>
    set({
      state:'stability',
      intensity:0.5,
      thresholdActive:false
    })

}))
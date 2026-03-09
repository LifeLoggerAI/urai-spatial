"use client"

import { create } from "zustand"

export const useMemoryTarget = create((set)=>({

  selected:null,
  target:null,
  cameraLocked:false,

  select:(id,pos)=>set({
    selected:id,
    target:pos,
    cameraLocked:false
  }),

  lockCamera:()=>set({
    cameraLocked:true
  }),

  clear:()=>set({
    selected:null,
    target:null,
    cameraLocked:false
  })

}))

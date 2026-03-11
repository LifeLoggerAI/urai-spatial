import { memoryNodes } from "./memoryNodes"

export function getMemoryForStar(star){

  if(!star) return null

  const year = star.year

  const match = memoryNodes.find(m => m.year === year)

  return match || null

}

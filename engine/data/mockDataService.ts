/*
  engine/data/mockDataService.ts

  Simulated data provider for LifeMap development.
  This allows UI and spatial systems to run without a backend.
*/

import { StarData, Memory } from "./models"

const mockMemories: ReadonlyArray<Memory> = [
  {
    id: "mem-001",
    title: "First Steps",
    date: "1992-08-15",
    emotion: "joy",
    description:
      "The day I took my first steps in the living room. Mom and Dad were so proud.",
  },
  {
    id: "mem-002",
    title: "Lost in the Mall",
    date: "1995-12-20",
    emotion: "fear",
    description:
      "I got separated from my parents in the crowded mall during Christmas shopping. I was terrified until a security guard found me.",
  },
  {
    id: "mem-003",
    title: "Graduation Day",
    date: "2010-06-04",
    emotion: "joy",
    description:
      "Walking across the stage to receive my high school diploma. A day of celebration and looking towards the future.",
  },
  {
    id: "mem-004",
    title: "The Car Accident",
    date: "2015-03-22",
    emotion: "sadness",
    description:
      "A traumatic car accident that left me with a long recovery. A reminder of how fragile life is.",
  },
  {
    id: "mem-005",
    title: "The Road to Recovery",
    date: "2016-01-10",
    emotion: "recovery",
    description:
      "After months of physical therapy, I was finally able to walk without crutches.",
  },
] as const

const mockStarData: ReadonlyArray<StarData> = [
  { starId: 101, memory: mockMemories[0] },
  { starId: 253, memory: mockMemories[1] },
  { starId: 488, memory: mockMemories[2] },
  { starId: 621, memory: mockMemories[3] },
  { starId: 734, memory: mockMemories[4] },
] as const

export interface DataService {
  getStarData(): Promise<StarData[]>
}

export const mockDataService: DataService = {

  async getStarData(): Promise<StarData[]> {

    await new Promise((r) => setTimeout(r, 500))

    return [...mockStarData]

  }

}
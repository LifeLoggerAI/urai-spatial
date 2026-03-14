export type StarId =
  | "star-01"
  | "star-02"
  | "star-03"
  | "star-04"

export interface StarNode {
  id: StarId
  position: [number, number, number]
  image: string
}

export const demoData: ReadonlyArray<StarNode> = [
  { id: "star-01", position: [0, 0, 0], image: "./image1.jpg" },
  { id: "star-02", position: [1, 2, -3], image: "./image2.jpg" },
  { id: "star-03", position: [-2, -1, -5], image: "./image3.jpg" },
  { id: "star-04", position: [3, 1, -2], image: "./image4.jpg" },
] as const

export type StarLink = [StarId, StarId]

export const demoLinks: ReadonlyArray<StarLink> = [
  ["star-01", "star-02"],
  ["star-01", "star-03"],
] as const
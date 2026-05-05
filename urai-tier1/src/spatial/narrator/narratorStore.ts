export type NarratorListener = (line: string | null) => void

let currentLine: string | null = null
const listeners = new Set<NarratorListener>()

export function setNarratorLine(line: string | null) {
  currentLine = line
  listeners.forEach((listener) => listener(currentLine))
}

export function subscribeNarratorLine(listener: NarratorListener) {
  listeners.add(listener)
  listener(currentLine)
  return () => listeners.delete(listener)
}

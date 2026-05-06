export type NarratorListener = (line: string | null) => void
export type NarratorSpeakingListener = (speaking: boolean) => void

let currentLine: string | null = null
let narratorSpeaking = false
const listeners = new Set<NarratorListener>()
const speakingListeners = new Set<NarratorSpeakingListener>()

export function setNarratorLine(line: string | null) {
  currentLine = line
  listeners.forEach((listener) => listener(currentLine))
}

export function setNarratorSpeaking(speaking: boolean) {
  narratorSpeaking = speaking
  speakingListeners.forEach((listener) => listener(narratorSpeaking))
}

export function subscribeNarratorLine(listener: NarratorListener) {
  listeners.add(listener)
  listener(currentLine)
  return () => listeners.delete(listener)
}

export function subscribeNarratorSpeaking(listener: NarratorSpeakingListener) {
  speakingListeners.add(listener)
  listener(narratorSpeaking)
  return () => speakingListeners.delete(listener)
}

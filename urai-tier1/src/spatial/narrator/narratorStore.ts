export type NarratorListener = (line: string | null) => void
export type NarratorSpeakingListener = (speaking: boolean) => void

let currentLine: string | null = null
let narratorSpeaking = false

const lineListeners = new Set<NarratorListener>()
const speakingListeners = new Set<NarratorSpeakingListener>()

export function setNarratorLine(line: string | null) {
  currentLine = line
  lineListeners.forEach((listener) => listener(currentLine))
}

export function subscribeNarratorLine(listener: NarratorListener) {
  lineListeners.add(listener)
  listener(currentLine)

  return () => {
    lineListeners.delete(listener)
  }
}

export function setNarratorSpeaking(speaking: boolean) {
  narratorSpeaking = speaking
  speakingListeners.forEach((listener) => listener(narratorSpeaking))
}

export function subscribeNarratorSpeaking(listener: NarratorSpeakingListener) {
  speakingListeners.add(listener)
  listener(narratorSpeaking)

  return () => {
    speakingListeners.delete(listener)
  }
}

import type { AnimationAction } from 'three'

type CouncilActions = {
  idle_breath?: AnimationAction | null
  listen_acknowledge?: AnimationAction | null
}

// The retained v4 idle animates hips/chest. Listening animates the head, so
// selection must not remove the body's existing idle layer or reset its phase.
export function playCouncilBodyIdle(actions: CouncilActions, reducedMotion: boolean) {
  const idle = reducedMotion ? undefined : actions.idle_breath
  idle?.reset().fadeIn(0.25).play()
  return () => { idle?.stop() }
}

export function playCouncilListening(actions: CouncilActions, selected: boolean, reducedMotion: boolean) {
  const listening = selected && !reducedMotion ? actions.listen_acknowledge : undefined
  listening?.reset().fadeIn(0.25).play()
  return () => { listening?.stop() }
}

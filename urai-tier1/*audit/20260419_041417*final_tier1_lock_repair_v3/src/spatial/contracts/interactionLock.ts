import type { CanonMode } from '@/spatial/contracts/sceneAuthority'

export type InteractionIntent =
  | 'open_lifemap_from_sky'
  | 'open_orb_panel'
  | 'open_ground_view'
  | 'open_focus_from_star'
  | 'open_replay_from_focus'
  | 'esc'
  | 'go_home'
  | 'none'

export type InteractionLockState = {
  mode: CanonMode
  canClickSky: boolean
  canClickOrb: boolean
  canClickGround: boolean
  canClickStar: boolean
  canEnterReplay: boolean

  skyIntent: InteractionIntent
  orbIntent: InteractionIntent
  groundIntent: InteractionIntent
  starIntent: InteractionIntent
  replayIntent: InteractionIntent

  interactionLaw: {
    sky: 'lifemap_only'
    orb: 'orb_only'
    ground: 'ground_only'
    star: 'focus_only'
    replay: 'replay_only'
  }
}

export function getInteractionLockState(args: {
  mode: CanonMode
  orbPanelOpen?: boolean
  groundViewOpen?: boolean
}): InteractionLockState {
  const inHome = args.mode === 'HOME'
  const inLifeMap = args.mode === 'LIFEMAP'
  const inFocus = args.mode === 'FOCUS'
  const inReplay = args.mode === 'REPLAY'

  const canClickSky = inHome && !args.orbPanelOpen && !args.groundViewOpen
  const canClickOrb = inHome && !args.groundViewOpen
  const canClickGround = inHome && !args.orbPanelOpen
  const canClickStar = inLifeMap || inFocus
  const canEnterReplay = inFocus || inReplay

  return {
    mode: args.mode,
    canClickSky,
    canClickOrb,
    canClickGround,
    canClickStar,
    canEnterReplay,

    skyIntent: canClickSky ? 'open_lifemap_from_sky' : 'none',
    orbIntent: canClickOrb ? 'open_orb_panel' : 'none',
    groundIntent: canClickGround ? 'open_ground_view' : 'none',
    starIntent: canClickStar ? 'open_focus_from_star' : 'none',
    replayIntent: canEnterReplay ? 'open_replay_from_focus' : 'none',

    interactionLaw: {
      sky: 'lifemap_only',
      orb: 'orb_only',
      ground: 'ground_only',
      star: 'focus_only',
      replay: 'replay_only',
    },
  }
}

export function isIntentAllowed(intent: InteractionIntent, state: InteractionLockState): boolean {
  if (intent === 'open_lifemap_from_sky') return state.canClickSky
  if (intent === 'open_orb_panel') return state.canClickOrb
  if (intent === 'open_ground_view') return state.canClickGround
  if (intent === 'open_focus_from_star') return state.canClickStar
  if (intent === 'open_replay_from_focus') return state.canEnterReplay
  if (intent === 'esc') return true
  if (intent === 'go_home') return true
  return false
}

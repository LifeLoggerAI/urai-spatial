import { useMemo } from 'react'

type InteractionArgs = {
  mode?: 'HOME' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
  orbPanelOpen?: boolean
  groundViewOpen?: boolean
  locked?: boolean
}

type InteractionIntent =
  | 'open_lifemap_from_sky'
  | 'open_orb_panel'
  | 'open_ground_view'
  | 'open_focus_from_star'
  | 'open_replay_from_focus'
  | 'esc'
  | 'go_home'

export function useInteractionLock(args: InteractionArgs) {
  return useMemo(() => {
    const mode = args.mode ?? 'HOME'
    const inHome = mode === 'HOME'
    const inLifeMap = mode === 'LIFEMAP'
    const inFocus = mode === 'FOCUS'
    const inReplay = mode === 'REPLAY'
    const locked = !!args.locked

    const state = {
      locked,
      canClickSky: !locked && inHome && !args.orbPanelOpen && !args.groundViewOpen,
      canClickOrb: !locked && inHome && !args.groundViewOpen,
      canClickGround: !locked && inHome && !args.orbPanelOpen,
      canClickStar: !locked && (inLifeMap || inFocus),
      canEnterReplay: !locked && (inFocus || inReplay),
    }

    return {
      ...state,
      assertIntent(intent: InteractionIntent) {
        if (intent === 'open_lifemap_from_sky') return state.canClickSky
        if (intent === 'open_orb_panel') return state.canClickOrb
        if (intent === 'open_ground_view') return state.canClickGround
        if (intent === 'open_focus_from_star') return state.canClickStar
        if (intent === 'open_replay_from_focus') return state.canEnterReplay
        if (intent === 'esc') return true
        if (intent === 'go_home') return true
        return true
      },
    }
  }, [args.mode, args.orbPanelOpen, args.groundViewOpen, args.locked])
}

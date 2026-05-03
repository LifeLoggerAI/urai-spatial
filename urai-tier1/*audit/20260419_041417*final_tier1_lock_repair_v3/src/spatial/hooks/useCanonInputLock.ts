type CanonInputLockArgs = {
  mode: 'HOME' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
  orbPanelOpen?: boolean
  groundViewOpen?: boolean
}

export function useCanonInputLock(args: CanonInputLockArgs) {
  const inHome = args.mode === 'HOME'
  const inLifeMap = args.mode === 'LIFEMAP'
  const inFocus = args.mode === 'FOCUS'
  const inReplay = args.mode === 'REPLAY'

  return {
    locked: false,
    canClickSky: inHome && !args.orbPanelOpen && !args.groundViewOpen,
    canClickOrb: inHome && !args.groundViewOpen,
    canClickGround: inHome && !args.orbPanelOpen,
    canClickStar: inLifeMap || inFocus,
    canEnterReplay: inFocus || inReplay,
  }
}

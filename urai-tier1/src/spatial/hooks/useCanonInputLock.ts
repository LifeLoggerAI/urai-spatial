type CanonInputLockArgs = {
  mode: 'home' | 'lifemap' | 'focus' | 'replay'
  orbPanelOpen?: boolean
  groundViewOpen?: boolean
}

export function useCanonInputLock(args: CanonInputLockArgs) {
  const inHome = args.mode === 'home'
  const inLifeMap = args.mode === 'lifemap'
  const inFocus = args.mode === 'focus'
  const inReplay = args.mode === 'replay'

  return {
    locked: false,
    canClickSky: inHome && !args.orbPanelOpen && !args.groundViewOpen,
    canClickOrb: inHome && !args.groundViewOpen,
    canClickGround: inHome && !args.orbPanelOpen,
    canClickStar: inLifeMap || inFocus,
    canEnterReplay: inFocus || inReplay,
  }
}

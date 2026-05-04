function getCameraDirector(progress: number, phase: Phase, selectedStar: SpatialStarNode | null) {
  const p = clamp01(progress)
  const e = easeInOutCubic(p)

  if (phase === 'HOME') {
    return {
      scale: 1,
      translateY: 0,
      translateX: 0,
      background: '#020748',
      starOpacity: 0,
      vignette: 0.1,
      homeOpacity: 1,
      replayOpacity: 0,
      orbScale: 1,
      groundOpacity: 1,
    }
  }

  if (phase === 'ASCENT') {
    return {
      scale: 1 + e * 0.8,
      translateY: e * -25,
      translateX: 0,
      background: '#020748',
      starOpacity: e * 0.7,
      vignette: 0.1 + e * 0.1,
      homeOpacity: 1 - e,
      replayOpacity: 0,
      orbScale: 1 - e * 0.5,
      groundOpacity: 1 - e,
    }
  }

  if (phase === 'LIFEMAP') {
    return {
      scale: 1,
      translateY: 0,
      translateX: 0,
      background: '#01031a',
      starOpacity: 1,
      vignette: 0.2,
      homeOpacity: 0,
      replayOpacity: 0,
      orbScale: 0,
      groundOpacity: 0,
    }
  }

  if (phase === 'FOCUS') {
    const focusX = selectedStar ? 50 - selectedStar.x : 0
    const focusY = selectedStar ? 50 - selectedStar.y : 0

    return {
      scale: 2.5,
      translateY: focusY,
      translateX: focusX,
      background: '#010210',
      starOpacity: 0.1,
      vignette: 0.4,
      homeOpacity: 0,
      replayOpacity: 0,
      orbScale: 0,
      groundOpacity: 0,
    }
  }

  return {
    scale: 1,
    translateY: 0,
    translateX: 0,
    background: '#000000',
    starOpacity: 0,
    vignette: 1,
    homeOpacity: 0,
    replayOpacity: 1,
    orbScale: 0,
    groundOpacity: 0,
  }
}
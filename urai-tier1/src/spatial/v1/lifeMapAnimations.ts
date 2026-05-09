export const lifeMapEasings = {
  cinematicLift: 'cubic-bezier(0.22, 1, 0.36, 1)',
  orbThread: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  skyDepth: 'ease-in-out',
  arrivalSettle: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const lifeMapAnimationSpec = {
  homeIdleBreathing: { durationMs: 8200, easing: lifeMapEasings.skyDepth, reducedMotion: 'static luminous atmosphere' },
  orbPulse: { durationMs: 4200, easing: lifeMapEasings.orbThread, reducedMotion: 'soft opacity pulse only' },
  avatarBreathing: { durationMs: 7600, easing: lifeMapEasings.skyDepth, reducedMotion: 'single aura glow' },
  skyGradientBreathing: { durationMs: 12000, easing: lifeMapEasings.skyDepth, reducedMotion: 'crossfade gradient' },
  auroraDrift: { durationMs: 16000, easing: lifeMapEasings.skyDepth, reducedMotion: 'still aurora veil' },
  cloudDrift: { durationMs: 22000, easing: 'linear', reducedMotion: 'no cloud translation' },
  groundMist: { durationMs: 14000, easing: lifeMapEasings.skyDepth, reducedMotion: 'still mist' },
  skyPortalShimmer: { durationMs: 5200, easing: lifeMapEasings.orbThread, reducedMotion: 'portal glow only' },
  ascentRecognition: { durationMs: 500, easing: lifeMapEasings.orbThread, reducedMotion: 'instant sky brighten' },
  ascentLift: { durationMs: 1800, easing: lifeMapEasings.cinematicLift, reducedMotion: 'premium crossfade' },
  ascentPortalCrossing: { durationMs: 900, easing: lifeMapEasings.skyDepth, reducedMotion: 'no tunnel; fade into starfield' },
  lifeMapArrival: { durationMs: 900, easing: lifeMapEasings.arrivalSettle, reducedMotion: 'fade in stars' },
  starPulse: { durationMs: 3600, easing: lifeMapEasings.skyDepth, reducedMotion: 'static halo' },
  constellationLineDrawing: { durationMs: 1100, easing: lifeMapEasings.arrivalSettle, reducedMotion: 'show line immediately' },
  memoryBloomOpening: { durationMs: 640, easing: lifeMapEasings.orbThread, reducedMotion: 'open detail crossfade' },
  replayPathAnimation: { durationMs: 9000, easing: lifeMapEasings.cinematicLift, reducedMotion: 'step through captions without travel motion' },
  mirrorGlyphCondensation: { durationMs: 1400, easing: lifeMapEasings.arrivalSettle, reducedMotion: 'glyph appears without morph' },
  returnUnwind: { durationMs: 850, easing: lifeMapEasings.skyDepth, reducedMotion: 'crossfade home' },
} as const;

export const moodVisualMap = {
  calm: { sky: 'blue/cyan open sky', color: '#67e8f9', fog: 0.18 },
  low: { sky: 'heavy muted protected atmosphere', color: '#64748b', fog: 0.68 },
  recovery: { sky: 'green-gold reopening', color: '#a3e635', fog: 0.26 },
  dream: { sky: 'violet/indigo slow drift', color: '#8b5cf6', fog: 0.38 },
  shadow: { sky: 'purple-red fog compression', color: '#9f1239', fog: 0.72 },
  focus: { sky: 'cyan-white clarity', color: '#cffafe', fog: 0.12 },
  joy: { sky: 'rose/gold sparkle', color: '#fbbf24', fog: 0.16 },
} as const;

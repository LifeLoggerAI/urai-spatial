import type { EmotionalState, EmotionKey } from './types'

export const URAI_EMOTIONAL_WEATHER = ['Calm','Reflective','Energized','Heavy','Uncertain','Hopeful'] as const
export type EmotionalWeather = typeof URAI_EMOTIONAL_WEATHER[number]

export type EmotionalWeatherPreference = {
  enabled: boolean
  manualOverride?: EmotionalWeather | null
}

export type EmotionalWeatherReading = {
  weather: EmotionalWeather | null
  confidence: number
  source: 'disabled' | 'manual' | 'inference'
  uncertain: boolean
  medicalDiagnosis: false
  updatedAt: number
}

const clamp01=(value:number)=>Math.max(0,Math.min(1,value))

const PRIMARY_WEATHER: Record<EmotionKey,EmotionalWeather> = {
  calm:'Calm',
  joy:'Energized',
  grief:'Heavy',
  anger:'Heavy',
  fear:'Uncertain',
  focus:'Reflective',
  awe:'Reflective',
  loneliness:'Heavy',
  hope:'Hopeful',
  overload:'Heavy',
  neutral:'Uncertain',
}

export function deriveEmotionalWeather(
  state: EmotionalState,
  preference: EmotionalWeatherPreference = { enabled:true },
): EmotionalWeatherReading {
  if (!preference.enabled) {
    return { weather:null,confidence:0,source:'disabled',uncertain:true,medicalDiagnosis:false,updatedAt:state.updatedAt }
  }
  if (preference.manualOverride && URAI_EMOTIONAL_WEATHER.includes(preference.manualOverride)) {
    return { weather:preference.manualOverride,confidence:1,source:'manual',uncertain:false,medicalDiagnosis:false,updatedAt:state.updatedAt }
  }

  let weather=PRIMARY_WEATHER[state.primary]
  if (state.primary === 'neutral' && state.arousal <= .3 && state.clarity >= .65) weather='Calm'
  if ((state.primary === 'joy' || state.primary === 'focus') && state.arousal >= .58) weather='Energized'
  if (state.valence >= .4 && (state.primary === 'hope' || state.secondary === 'hope')) weather='Hopeful'
  if (state.clarity < .35 && state.volatility > .45) weather='Uncertain'
  if ((state.primary === 'grief' || state.primary === 'loneliness') && state.arousal < .6) weather='Reflective'
  if (state.primary === 'overload' && state.intensity >= .55) weather='Heavy'

  const blendLead=state.blends[0]?.weight ?? 0
  const confidence=clamp01(
    blendLead * .45
    + state.clarity * .35
    + (1-state.volatility) * .2,
  )
  const uncertain=confidence < .58 || state.clarity < .35

  return {
    weather: uncertain && confidence < .4 ? 'Uncertain' : weather,
    confidence,
    source:'inference',
    uncertain,
    medicalDiagnosis:false,
    updatedAt:state.updatedAt,
  }
}

export function correctEmotionalWeather(
  reading: EmotionalWeatherReading,
  correction: EmotionalWeather,
): EmotionalWeatherReading {
  if (!URAI_EMOTIONAL_WEATHER.includes(correction)) return reading
  return {
    weather:correction,
    confidence:1,
    source:'manual',
    uncertain:false,
    medicalDiagnosis:false,
    updatedAt:Date.now(),
  }
}

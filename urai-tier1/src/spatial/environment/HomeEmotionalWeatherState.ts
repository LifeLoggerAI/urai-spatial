export type HomeEmotionalWeatherName = 'calm' | 'reflective' | 'energized' | 'heavy' | 'uncertain' | 'hopeful'

export type HomeAtmosphereParameters = {
  readonly clarity: number
  readonly cloudCover: number
  readonly aerosolDensity: number
  readonly windCoherence: number
  readonly horizonTransmission: number
  readonly celestialVisibility: number
}

export const URAI_HOME_EMOTIONAL_WEATHER_EVENT = 'urai:home-emotional-weather'

export const HOME_EMOTIONAL_WEATHER_PRESETS: Record<HomeEmotionalWeatherName, HomeAtmosphereParameters> = {
  calm: {
    clarity: .78,
    cloudCover: .26,
    aerosolDensity: .31,
    windCoherence: .84,
    horizonTransmission: .68,
    celestialVisibility: .54,
  },
  reflective: {
    clarity: .68,
    cloudCover: .34,
    aerosolDensity: .42,
    windCoherence: .90,
    horizonTransmission: .60,
    celestialVisibility: .61,
  },
  energized: {
    clarity: .86,
    cloudCover: .22,
    aerosolDensity: .24,
    windCoherence: .77,
    horizonTransmission: .74,
    celestialVisibility: .58,
  },
  heavy: {
    clarity: .52,
    cloudCover: .46,
    aerosolDensity: .58,
    windCoherence: .80,
    horizonTransmission: .48,
    celestialVisibility: .35,
  },
  uncertain: {
    clarity: .61,
    cloudCover: .38,
    aerosolDensity: .48,
    windCoherence: .54,
    horizonTransmission: .52,
    celestialVisibility: .44,
  },
  hopeful: {
    clarity: .84,
    cloudCover: .20,
    aerosolDensity: .26,
    windCoherence: .86,
    horizonTransmission: .78,
    celestialVisibility: .64,
  },
}

export type HomeTimeOfDayName = 'dawn' | 'day' | 'dusk' | 'night'

export type AdaptiveBlueHour = {
  readonly phase: HomeTimeOfDayName
  readonly luminance: number
  readonly temperatureBias: number
  readonly celestialMultiplier: number
}

export function resolveHomeEmotionalWeather(value: unknown): HomeEmotionalWeatherName {
  return typeof value === 'string' && value in HOME_EMOTIONAL_WEATHER_PRESETS
    ? value as HomeEmotionalWeatherName
    : 'calm'
}

/**
 * Home preserves one coherent architectural world while local time produces
 * visibly distinct dawn, day, dusk and night atmosphere. The cycle changes
 * sky luminance, horizon warmth and celestial visibility without swapping the
 * world into an unrelated fantasy environment.
 */
export function resolveAdaptiveBlueHour(date = new Date()): AdaptiveBlueHour {
  const hour = date.getHours() + date.getMinutes() / 60
  if (hour >= 5 && hour < 9) return { phase: 'dawn', luminance: 1.02, temperatureBias: .12, celestialMultiplier: .44 }
  if (hour >= 9 && hour < 17) return { phase: 'day', luminance: 1.26, temperatureBias: .035, celestialMultiplier: .10 }
  if (hour >= 17 && hour < 21) return { phase: 'dusk', luminance: .96, temperatureBias: .18, celestialMultiplier: .64 }
  return { phase: 'night', luminance: .58, temperatureBias: -.035, celestialMultiplier: 1.34 }
}

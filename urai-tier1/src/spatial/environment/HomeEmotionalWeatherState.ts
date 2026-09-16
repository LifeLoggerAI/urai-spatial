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

export type AdaptiveBlueHour = {
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
 * Home always remains in UrAi's perpetual blue hour. Local time only nudges
 * luminance, residual horizon temperature and celestial visibility inside a
 * deliberately narrow envelope; it never turns Home into literal noon/night.
 */
export function resolveAdaptiveBlueHour(date = new Date()): AdaptiveBlueHour {
  const hour = date.getHours() + date.getMinutes() / 60
  if (hour >= 5 && hour < 10) return { luminance: 1.03, temperatureBias: -.025, celestialMultiplier: .94 }
  if (hour >= 10 && hour < 17) return { luminance: 1.08, temperatureBias: -.010, celestialMultiplier: .88 }
  if (hour >= 17 && hour < 22) return { luminance: 1.00, temperatureBias: .040, celestialMultiplier: 1.02 }
  return { luminance: .93, temperatureBias: -.012, celestialMultiplier: 1.12 }
}

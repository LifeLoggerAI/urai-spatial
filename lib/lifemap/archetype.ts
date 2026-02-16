
/**
 * @fileoverview This file contains the core logic for the Archetype Evolution Engine.
 * It is based on the mathematical model defined in ARCHETYPE_MODEL_SPECIFICATION.md.
 */

// I. Core Components & Variables

/**
 * The fundamental unit of input is a daily EmotionVector ($E_v$).
 * $E_v = {valence, arousal, agency}$
 */
export interface EmotionVector {
  /** A float from -1.0 (negative) to 1.0 (positive). */
  valence: number;
  /** A float from 0.0 (calm) to 1.0 (energetic). */
  arousal: number;
  /** A float from 0.0 (passive) to 1.0 (proactive). */
  agency: number;
}

/**
 * Each of the core Seasonal Archetypes is defined by a target EmotionVector point in 3D space.
 * This forms a static ArchetypeMatrix ($A_M$).
 */
export const ArchetypeMatrix: Record<string, EmotionVector> = {
  Explorer: { valence: 0.7, arousal: 0.8, agency: 0.9 },
  Protector: { valence: 0.1, arousal: 0.6, agency: 0.7 },
  Dormant: { valence: 0.0, arousal: 0.1, agency: 0.2 },
  // TODO: Add other archetypes and tune these values.
};

// II. Layer 1: The Seasonal Archetype

/**
 * Calculates the average of all EmotionVectors for a given day.
 * This represents the aggregate emotional state for that day.
 *
 * @param vectors The array of EmotionVectors recorded for the day.
 * @returns A single, averaged EmotionVector.
 */
export function calculateDailyAverage(vectors: EmotionVector[]): EmotionVector {
  if (vectors.length === 0) {
    return { valence: 0, arousal: 0, agency: 0 };
  }

  const sum = vectors.reduce(
    (acc, v) => ({
      valence: acc.valence + v.valence,
      arousal: acc.arousal + v.arousal,
      agency: acc.agency + v.agency,
    }),
    { valence: 0, arousal: 0, agency: 0 }
  );

  return {
    valence: sum.valence / vectors.length,
    arousal: sum.arousal / vectors.length,
    agency: sum.agency / vectors.length,
  };
}

/**
 * Calculates the 90-day weighted average emotion vector ($E_{w,d}$).
 * This gives more weight to recent days.
 *
 * @param dailyAverages An array of the last 90 daily average EmotionVectors, sorted from most recent to least recent.
 * @param decayFactor A factor between 0 and 1 for the exponential decay.
 * @returns The weighted average EmotionVector.
 */
export function calculateWeightedSeasonalVector(
  dailyAverages: EmotionVector[],
  decayFactor: number = 0.95
): EmotionVector {
  let weightedSum = { valence: 0, arousal: 0, agency: 0 };
  let weightSum = 0;

  for (let i = 0; i < dailyAverages.length; i++) {
    const dayVector = dailyAverages[i];
    // The most recent day (index 0) gets the highest weight
    const weight = Math.pow(decayFactor, i);

    weightedSum.valence += dayVector.valence * weight;
    weightedSum.arousal += dayVector.arousal * weight;
    weightedSum.agency += dayVector.agency * weight;
    weightSum += weight;
  }

  if (weightSum === 0) {
    return { valence: 0, arousal: 0, agency: 0 };
  }

  return {
    valence: weightedSum.valence / weightSum,
    arousal: weightedSum.arousal / weightSum,
    agency: weightedSum.agency / weightSum,
  };
}

/**
 * Calculates the Euclidean distance between two EmotionVectors in 3D space.
 */
function euclideanDistance(v1: EmotionVector, v2: EmotionVector): number {
    const dv = v1.valence - v2.valence;
    const da = v1.arousal - v2.arousal;
    const dg = v1.agency - v2.agency;
    return Math.sqrt(dv*dv + da*da + dg*dg);
}


/**
 * Determines the current Seasonal Archetype ($A_{season}$) by finding the closest
 * point in the ArchetypeMatrix to the user's weighted emotion vector.
 *
 * @param weightedVector The user's 90-day weighted emotion vector ($E_{w,d}$).
 * @returns The name of the closest archetype.
 */
export function determineSeasonalArchetype(weightedVector: EmotionVector): string {
  let closestArchetype = 'Dormant';
  let minDistance = Infinity;

  for (const archetype in ArchetypeMatrix) {
    const archetypeVector = ArchetypeMatrix[archetype];
    const distance = euclideanDistance(weightedVector, archetypeVector);

    if (distance < minDistance) {
      minDistance = distance;
      closestArchetype = archetype;
    }
  }

  return closestArchetype;
}


// III. Layer 2: The Narrative Archetype

/**
 * Defines the mapping from a transition between two Seasonal Archetypes to a named Narrative Arc.
 * The key is a string in the format "from_to", e.g., "Dormant_Explorer".
 */
export const NarrativeMatrix: Record<string, string> = {
  "Dormant_Explorer": "Awakening",
  "Explorer_Protector": "Settling",
  // TODO: Define more narrative arcs for other transitions
};

export interface NarrativeArc {
  arc: string; // e.g., "Awakening"
  from: string; // The starting archetype
  to: string; // The ending archetype
  startDate: Date;
  endDate: Date;
}

/**
 * Detects a change in the seasonal archetype and returns a new NarrativeArc if one has occurred.
 *
 * @param previousArchetype The seasonal archetype from the previous period.
 * @param currentArchetype The seasonal archetype for the current period.
 * @param date The date the change was detected.
 * @returns A new NarrativeArc or null if no change occurred.
 */
export function detectStateChange(previousArchetype: string, currentArchetype: string, date: Date): Omit<NarrativeArc, 'endDate'> | null {
  if (previousArchetype !== currentArchetype) {
    const transitionKey = `${previousArchetype}_${currentArchetype}`;
    const narrativeArcName = NarrativeMatrix[transitionKey];

    if (narrativeArcName) {
      return {
        arc: narrativeArcName,
        from: previousArchetype,
        to: currentArchetype,
        startDate: date,
      };
    }
  }
  return null;
}

// IV. Layer 3: The Self-Archetype (Long Cycle)

/**
 * A log representing a period of time spent in a single seasonal archetype.
 */
export interface ArchetypeLog {
  archetype: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Analyzes the entire history of a user's seasonal archetypes to determine
 * their dominant, long-term Self-Archetype.
 *
 * @param history An array of ArchetypeLog objects, representing the user's journey.
 * @returns The name of the most dominant archetype.
 */
export function determineSelfArchetype(history: ArchetypeLog[]): string {
  if (history.length === 0) {
    return 'Primordial'; // A default state before any data is gathered
  }

  const archetypeDurations: Record<string, number> = {};

  // 1. Calculate the total time spent in each seasonal archetype.
  for (const log of history) {
    const duration = log.endDate.getTime() - log.startDate.getTime();
    if (!archetypeDurations[log.archetype]) {
      archetypeDurations[log.archetype] = 0;
    }
    archetypeDurations[log.archetype] += duration;
  }

  // 2. Determine the most dominant archetype.
  let dominantArchetype = '';
  let maxDuration = -1;

  for (const archetype in archetypeDurations) {
    if (archetypeDurations[archetype] > maxDuration) {
      maxDuration = archetypeDurations[archetype];
      dominantArchetype = archetype;
    }
  }

  // 3. Assign the Self-Archetype.
  return dominantArchetype;
}

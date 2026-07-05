"use client";

/**
 * Error Weighting Engine
 * ----------------------
 * Converts prediction error signals into weighting factors
 * for simulation behavior, ranking, and adaptive systems.
 */

export type SimulationEntity = {
  id: string;
  weight: number;
  errorAffinity: number;
};

export type PredictionError = {
  forkError: number;
  mergeError: number;
  driftError: number;
  totalError: number;
};

export class ErrorWeightingEngine {
  private errorHistory: PredictionError[] = [];

  /** Record incoming system error signal */
  recordError(error: PredictionError) {
    this.errorHistory.push(error);
  }

  /** Compute rolling average error pressure */
  computeErrorPressure(): number {
    const total = this.errorHistory.reduce((a, b) => a + b.totalError, 0);
    return total / (this.errorHistory.length || 1);
  }

  /**
   * Apply error-based weighting to simulation entities
   */
  applyErrorWeighting(
    entities: Record<string, SimulationEntity>
  ): Record<string, SimulationEntity> {
    const pressure = this.computeErrorPressure();

    return Object.fromEntries(
      Object.entries(entities).map(([key, entity]) => {
        let weight = entity.weight;

        // amplify entities sensitive to error signals
        if (entity.errorAffinity > 0.5) {
          weight *= 1 + pressure;
        }

        // dampen low-sensitivity entities slightly
        if (entity.errorAffinity < 0.2) {
          weight *= 0.95;
        }

        return [key, { ...entity, weight }];
      })
    );
  }

  /**
   * Generate new simulation entity from high error conditions
   */
  generateEntityFromError(error: PredictionError) {
    if (error.totalError < 0.7) return null;

    return {
      id: "error-derived",
      weight: error.totalError,
      errorAffinity: 1.0
    };
  }
}

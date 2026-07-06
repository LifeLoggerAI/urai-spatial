/**
 * URAI v60 State Convergence
 * Deterministic state fingerprinting for multi-kernel validation.
 */

import { URAIState } from "../kernel";

function stable(value: any): any {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = stable(value[key]);
        return acc;
      }, {});
  }

  return value;
}

export class StateConvergence {
  fingerprint(state: URAIState): string {
    return JSON.stringify(stable(state));
  }

  compare(a: URAIState, b: URAIState): boolean {
    return this.fingerprint(a) === this.fingerprint(b);
  }

  assert(a: URAIState, b: URAIState) {
    if (!this.compare(a, b)) {
      throw new Error(
        `State divergence detected. A=${this.fingerprint(a)} B=${this.fingerprint(b)}`
      );
    }
  }
}

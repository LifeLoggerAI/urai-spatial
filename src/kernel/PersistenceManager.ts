// URAI Spatial Runtime - Persistence Layer
// Provides state save/load for SimulationState across sessions

import { SimulationState, createInitialState } from './SimulationState';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export type PersistenceOptions = {
  filePath?: string;
};

export class PersistenceManager {
  private filePath: string;

  constructor(options: PersistenceOptions = {}) {
    this.filePath = options.filePath ?? path.resolve(process.cwd(), 'urai-simulation-state.json');
  }

  /**
   * Save simulation state to disk
   */
  save(state: SimulationState) {
    const payload = {
      savedAt: Date.now(),
      state,
    };

    writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  /**
   * Load simulation state from disk
   */
  load(): SimulationState {
    if (!existsSync(this.filePath)) {
      return createInitialState();
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);

      return parsed.state as SimulationState;
    } catch (err) {
      console.error('[PersistenceManager] Failed to load state, resetting.', err);
      return createInitialState();
    }
  }

  /**
   * Check if saved state exists
   */
  exists(): boolean {
    return existsSync(this.filePath);
  }
}

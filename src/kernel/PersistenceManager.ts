// URAI Spatial Runtime - Persistence Layer
// Persists JSON-safe runtime state outside the repository by default.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export type PersistenceOptions = {
  filePath?: string;
};

type PersistenceEnvelope<TState> = {
  schemaVersion: "urai-runtime-state-1";
  savedAt: number;
  state: TState;
};

export class PersistenceManager<TState> {
  private readonly filePath: string;

  constructor(options: PersistenceOptions = {}) {
    this.filePath =
      options.filePath ??
      process.env.URAI_SIMULATION_STATE_PATH ??
      path.join(tmpdir(), "urai-spatial", "simulation-state.json");
  }

  getPath(): string {
    return this.filePath;
  }

  save(state: TState): void {
    const payload: PersistenceEnvelope<TState> = {
      schemaVersion: "urai-runtime-state-1",
      savedAt: Date.now(),
      state,
    };

    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(payload, null, 2), "utf-8");
  }

  load(): TState | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<PersistenceEnvelope<TState>>;

      if (parsed.schemaVersion !== "urai-runtime-state-1" || !("state" in parsed)) {
        throw new Error("Unsupported or incomplete runtime state envelope.");
      }

      return parsed.state as TState;
    } catch (error) {
      console.error("[PersistenceManager] Failed to load state; starting clean.", error);
      return null;
    }
  }

  exists(): boolean {
    return existsSync(this.filePath);
  }
}

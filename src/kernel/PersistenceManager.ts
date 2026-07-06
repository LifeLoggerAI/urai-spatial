import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type PersistenceOptions = { filePath?: string };
type PersistenceEnvelope<TState> = { schemaVersion: "urai-runtime-state-1"; savedAt: number; state: TState };

export function resolveRuntimeStatePath(): string {
  const configuredPath = process.env.URAI_SIMULATION_STATE_PATH?.trim();
  if (configuredPath) return path.resolve(configuredPath);
  const configuredDirectory = process.env.URAI_RUNTIME_STATE_DIR?.trim();
  const directory = configuredDirectory ? path.resolve(configuredDirectory) : path.join(homedir(), ".urai", "runtime");
  return path.join(directory, "simulation-state.json");
}

export class PersistenceManager<TState> {
  private readonly filePath: string;
  constructor(options: PersistenceOptions = {}) {
    this.filePath = options.filePath ? path.resolve(options.filePath) : resolveRuntimeStatePath();
  }
  getPath(): string { return this.filePath; }
  save(state: TState): void {
    const payload: PersistenceEnvelope<TState> = { schemaVersion: "urai-runtime-state-1", savedAt: Date.now(), state };
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(payload, null, 2), "utf-8");
    renameSync(temporaryPath, this.filePath);
  }
  load(): TState | null {
    if (!existsSync(this.filePath)) return null;
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf-8")) as Partial<PersistenceEnvelope<TState>>;
      if (parsed.schemaVersion !== "urai-runtime-state-1" || !("state" in parsed)) throw new Error("Invalid runtime state envelope");
      return parsed.state as TState;
    } catch (error) {
      console.error("[PersistenceManager] Failed to load state; starting clean.", error);
      return null;
    }
  }
  exists(): boolean { return existsSync(this.filePath); }
}

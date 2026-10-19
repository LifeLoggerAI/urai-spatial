/**
 * Precise ambient ESM declaration for councilEncounterSession.mjs.
 * This is local Council encounter state, not Founder voice/provider authority.
 * Returned snapshots are frozen; dispose() is terminal and cannot be reversed.
 */
export interface CouncilEncounterSnapshot {
  readonly actor: number | null
  readonly generation: number
  readonly selected: string | null
  readonly near: boolean
  readonly consent: boolean
  readonly active: number | null
  readonly disposed: boolean
}
export interface CouncilEncounterUpdate {
  actorGeneration: number
  agentId: string
  inRange: boolean
  processingConsent: boolean
}
export interface CouncilEncounterBegin {
  actorGeneration: number
  agentId: string
}
export interface CouncilEncounterSession {
  snapshot(): Readonly<CouncilEncounterSnapshot>
  /** Returns true when the selected actor, proximity, consent or owner changes; invalid inputs fail closed. */
  update(context: CouncilEncounterUpdate): boolean
  /** Returns the unique current turn generation, or null if admission fails. */
  begin(context: CouncilEncounterBegin): number | null
  isCurrent(turn: number | null | undefined, actorGeneration: number, agentId: string): boolean
  finish(turn: number | null | undefined): boolean
  /** Invalidate active turn without allowing a stale response to revive it. */
  interrupt(): void
  /** Terminal disposal of the encounter and all its actor associations. */
  dispose(): void
}
export function createCouncilEncounterSession(): Readonly<CouncilEncounterSession>

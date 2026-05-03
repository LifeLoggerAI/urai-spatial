import { CANON_ACTIONS } from './tier2Canon'

export function assertCanonicalAction(type: string): void {
  if (!(CANON_ACTIONS as readonly string[]).includes(type)) {
  }
}

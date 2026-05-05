/**
 * TIER-1 CANON LOCKED — DO NOT MODIFY WITHOUT CANON MIGRATION.
 */
import { TIER1_ESC_UNWIND_CHAIN, TIER1_HOME_INVARIANT, TIER1_PHASE_CHAIN, TIER1_ROUTES, TIER1_TERMS } from './tier1.ts'

export function validateTier1CanonShape() {
  const errors: string[] = []
  if (TIER1_TERMS.tierName !== 'Tier-1') errors.push('tierName must be Tier-1')
  if (TIER1_PHASE_CHAIN.join('>') !== 'HOME>ASCENT>LIFEMAP>FOCUS>REPLAY') errors.push('phase chain mismatch')
  if (TIER1_ESC_UNWIND_CHAIN.join('>') !== 'REPLAY>FOCUS>LIFEMAP>HOME') errors.push('esc chain mismatch')
  if (TIER1_ROUTES.home !== '/' || TIER1_ROUTES.lifeMap !== '/life-map') errors.push('route canon mismatch')
  if (!Object.values(TIER1_HOME_INVARIANT).every(Boolean)) errors.push('home invariant booleans must stay true')
  return { ok: errors.length === 0, errors }
}

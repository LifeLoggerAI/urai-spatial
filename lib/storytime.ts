
/**
 * @fileoverview Defines the core data structures for the URAI Storytime workflow.
 * These structures are based on the principles and workflow documents for sharing
 * abstracted memory archetypes.
 */

/**
 * Represents the abstracted, public-facing "shape" of a memory.
 * This data is what is shared publicly in a story, not the raw memory itself.
 */
export interface SharedMemoryArchetype {
  /** The perceived significance or impact of the memory. Range: 0.0 to 1.0 */
  magnitude: number;

  /** The emotional tone of the memory. Range: -1.0 (negative) to 1.0 (positive) */
  valence: number;

  /** A set of neutral, abstracted keywords describing the memory's content. */
  keywords: string[];
}

/**
 * A secure token generated upon user consent, linking a private memory to a
 * public story via its archetype. This serves as a verifiable record of consent.
 */
export interface ConsentToken {
  /** The unique, non-reversible hash of the source memory. */
  sourceMemoryHash: string;

  /** The ID of the story to which the memory archetype is being contributed. */
  storyId: string;

  /** The abstracted archetype data that was shared. */
  archetype: SharedMemoryArchetype;

  /** The UTC timestamp (in milliseconds) when consent was granted. */
  timestamp: number;

  /** The version of the consent protocol used. */
  protocolVersion: '1.0';
}

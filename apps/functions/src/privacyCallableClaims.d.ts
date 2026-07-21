export {}

declare global {
  /**
   * Firebase callable authentication claims are JSON objects whose registered
   * fields include auth_time. The v1 CallableContext token is combined with an
   * empty-object fallback in privacyOperations, so TypeScript otherwise erases
   * this standard claim even though runtime access remains guarded.
   */
  interface Object {
    readonly auth_time?: unknown
  }
}

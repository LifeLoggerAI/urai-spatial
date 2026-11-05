export declare function createSpeechRecognitionSession(): Readonly<{
  grant(): number
  revoke(): number
  isCurrent(token: unknown): boolean
  readonly active: boolean
  readonly revision: number
}>

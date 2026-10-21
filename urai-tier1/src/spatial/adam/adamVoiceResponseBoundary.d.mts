export class AdamVoiceResponseError extends Error {
  constructor(code: string)
  readonly code: string
}
export function readAuthorizedAdamVoice(response: Response, input: {
  signal: AbortSignal
  isAuthorized: () => boolean
}): Promise<Blob>

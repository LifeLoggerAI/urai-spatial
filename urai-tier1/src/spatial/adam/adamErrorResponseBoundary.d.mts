export function readBoundedAdamError(response: Response, options: {
  signal: AbortSignal
  isCurrent: () => boolean
  fallbackCode: string
}): Promise<{ code: string }>

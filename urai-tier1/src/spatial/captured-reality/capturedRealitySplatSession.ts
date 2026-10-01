import { streamCapturedRealitySplat } from './capturedRealitySplatStream'
import { createCapturedSplatResources, type CapturedSplatResources, type SplatWorker } from './capturedRealitySplatResources'

/** One private owner/lifecycle scope. No URL, byte, GPU, or worker cache. */
export function createCapturedRealitySplatSession({
  url, maxBytes, maxTextureSize, chunkSize, alphaHash, onResource, onProgress, onFailure,
  fetcher, workerFactory,
}: {
  url: string
  maxBytes: number
  maxTextureSize: number
  chunkSize: number
  alphaHash: boolean
  onResource?: (resource: CapturedSplatResources) => void
  onProgress?: (loaded: number, total: number) => void
  onFailure?: () => void
  fetcher?: typeof fetch
  workerFactory?: () => SplatWorker
}) {
  const abort = new AbortController()
  let resource: CapturedSplatResources | undefined
  let disposed = false
  let total = 0
  const dispose = () => {
    if (disposed) return
    disposed = true
    abort.abort()
    resource?.dispose()
    resource = undefined
  }
  const fail = () => {
    if (disposed) return
    dispose()
    onFailure?.()
  }
  const completion = streamCapturedRealitySplat({
    url, maxBytes, chunkSize, signal: abort.signal, fetcher,
    onHeader(bytes) {
      total = bytes
      resource = createCapturedSplatResources(bytes, { maxTextureSize, alphaHash, onFailure: fail, workerFactory })
      onResource?.(resource)
    },
    async onChunk(chunk, loaded) {
      abort.signal.throwIfAborted()
      resource!.append(chunk)
      onProgress?.(loaded, total)
      // Let a real exit/revocation event run between bounded CPU upload batches.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    },
  }).then((receipt) => {
    abort.signal.throwIfAborted()
    return receipt
  }).catch((error) => {
    const wasAborted = abort.signal.aborted
    dispose()
    // Never surface fetch/worker details that can contain a signed private URL.
    if (wasAborted) throw new DOMException('Captured place loading was cancelled.', 'AbortError')
    throw new Error('Captured place data could not be displayed.')
  })
  return { completion, dispose, get disposed() { return disposed } }
}

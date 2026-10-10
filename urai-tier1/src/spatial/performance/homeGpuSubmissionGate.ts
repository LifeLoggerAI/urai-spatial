type FenceContext = Pick<WebGL2RenderingContext, 'fenceSync' | 'clientWaitSync' | 'deleteSync' | 'flush'
  | 'SYNC_GPU_COMMANDS_COMPLETE' | 'ALREADY_SIGNALED' | 'CONDITION_SATISFIED' | 'TIMEOUT_EXPIRED' | 'WAIT_FAILED'>
type RenderResult = { submitted: boolean; completionObserved: boolean; cadenceObserved: boolean }

// Keep at most one unfinished main-world submission on fence-capable contexts.
// Polling never waits on the GPU; input/animation callbacks can continue while a
// busy renderer retains its last presented frame, then submit the latest state.
export function createHomeGpuSubmissionGate(context: WebGLRenderingContext | WebGL2RenderingContext) {
  const fenceContext = context as Partial<FenceContext>
  const supported = ['fenceSync', 'clientWaitSync', 'deleteSync', 'flush'].every(name => typeof (fenceContext as Record<string, unknown>)[name] === 'function')
  let enabled = supported
  let pending: WebGLSync | null = null
  let lost = false
  let disposed = false
  const clearFence = () => {
    if (pending && !lost) { try { fenceContext.deleteSync?.(pending) } catch { /* An invalidated context has no live fence to release. */ } }
    pending = null
  }
  return {
    get mode() { return disposed ? 'disposed' : lost ? 'context-lost' : enabled ? 'fenced' : 'unavailable' },
    activate() {
      if (!disposed) return
      disposed = false
      enabled = supported
      lost = context.isContextLost()
    },
    contextLost() { lost = true; pending = null },
    contextRestored() { lost = false; pending = null; enabled = supported },
    dispose() { clearFence(); disposed = true },
    submit(renderLatest: () => void, visible = true): RenderResult {
      if (disposed || !visible || lost || context.isContextLost()) return { submitted: false, completionObserved: false, cadenceObserved: false }
      let completionObserved = false
      if (enabled && pending) {
        let status: number | undefined
        try { status = fenceContext.clientWaitSync!(pending, 0, 0) } catch { enabled = false }
        if (enabled && status === fenceContext.TIMEOUT_EXPIRED) return { submitted: false, completionObserved: false, cadenceObserved: false }
        completionObserved = enabled && (status === fenceContext.ALREADY_SIGNALED || status === fenceContext.CONDITION_SATISFIED)
        if (!completionObserved) enabled = false
        clearFence()
      }
      renderLatest()
      if (enabled) {
        try {
          pending = fenceContext.fenceSync!(fenceContext.SYNC_GPU_COMMANDS_COMPLETE!, 0)
          if (pending) fenceContext.flush!()
          else enabled = false
        } catch { clearFence(); enabled = false }
      }
      // Unsupported drivers retain the normal renderer path; its real render
      // cadence can still drive quality adaptation, without claiming a GPU fence.
      return { submitted: true, completionObserved, cadenceObserved: completionObserved || !enabled }
    },
  }
}

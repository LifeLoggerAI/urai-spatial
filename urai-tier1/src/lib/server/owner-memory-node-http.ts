/**
 * Review-only Node transport for the protected Memory identity handler.
 * No listener, route registration, service credentials or public API is created.
 * A separately authorized dynamic host must mount and review this callback.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleOwnerMemoryWithProtectedFirebase } from './authenticated-owner-memory'

export type OwnerMemoryRequestHandler = (request: Request) => Promise<Response>

export function createOwnerMemoryNodeHttpHandler(
  protectedHandler: OwnerMemoryRequestHandler = handleOwnerMemoryWithProtectedFirebase,
) {
  return async function ownerMemoryNodeHttp(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      // Never derive an origin or trust proxy headers from the incoming request.
      const target = new URL(req.url || '/', 'http://127.0.0.1')
      if (target.pathname !== '/internal/owner-memory' || target.hash) {
        res.writeHead(404, {
          'Cache-Control': 'private, no-store, max-age=0',
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        })
        res.end(JSON.stringify({ ok: false, code: 'not_found' }))
        return
      }
      const bearer = req.headers.authorization
      const forwarded = new Request(target, {
        method: req.method || 'GET',
        headers: typeof bearer === 'string' ? { authorization: bearer } : {},
      })
      const result = await protectedHandler(forwarded)
      const body = await result.text()
      res.writeHead(result.status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Vary': 'Authorization',
      })
      res.end(body)
    } catch {
      if (res.headersSent) { res.destroy(); return }
      res.writeHead(503, {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      })
      res.end(JSON.stringify({ ok: false, code: 'protected_read_unavailable' }))
    }
  }
}

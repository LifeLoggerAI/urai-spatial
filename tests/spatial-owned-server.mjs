import { createServer } from 'node:net'

export function ownedChildExited(child) {
  return Boolean(child && (child.exitCode !== null || child.signalCode !== null))
}

export async function allocateEphemeralPort() {
  const socket = createServer()
  await new Promise((resolve, reject) => {
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', resolve)
  })
  const address = socket.address()
  if (!address || typeof address === 'string') {
    socket.close()
    throw new Error('URAI_OWNED_PORT_ADDRESS_UNAVAILABLE')
  }
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
  return address.port
}

// A different service can own the port after reservation and respond HTTP 200.
// Only the actual UrAi RootLayout is a valid readiness response.
export function isUraiHomeDocument(html) {
  if (typeof html !== 'string') return false
  const root = html.match(/<html\b[^>]*>/i)?.[0] || ''
  const body = html.match(/<body\b[^>]*>/i)?.[0] || ''
  return /\bdata-urai-domain=(['"])app\1/i.test(root)
    && /\bdata-urai-surface=(['"])spatial\1/i.test(root)
    && /\bdata-urai-home-spatial-shell=(['"])true\1/i.test(body)
}

export async function waitForOwnedHome(baseUrl, child, {
  fetchImpl = fetch,
  timeoutMs = 90000,
  intervalMs = 500,
  now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const endpoint = new URL('/home', baseUrl).toString()
  const until = now() + timeoutMs
  let lastStatus = 'no response'
  while (now() < until) {
    if (ownedChildExited(child)) {
      throw new Error('URAI_OWNED_SERVER_EXITED_BEFORE_READY: ' + String(child.exitCode ?? child.signalCode))
    }
    try {
      const response = await fetchImpl(endpoint, { redirect: 'manual', signal: AbortSignal.timeout(5000) })
      lastStatus = response.status
      if (response.status === 200 && /text\/html/i.test(response.headers?.get?.('content-type') || '')) {
        if (isUraiHomeDocument(await response.text())) return
        lastStatus = '200 HTML without original UrAi root identity'
      }
    } catch (error) {
      lastStatus = error?.message || String(error)
    }
    await sleep(intervalMs)
  }
  throw new Error(`URAI_OWNED_HOME_NOT_READY: ${endpoint}; last status: ${lastStatus}`)
}

/** Cold Next.js development compilation must finish before timed browser
 * navigation, without treating a returned route as browser acceptance. */
export async function warmOwnedLifeMap(baseUrl, child, {
  fetchImpl = fetch, timeoutMs = 180000,
} = {}) {
  const endpoint = new URL('/life-map', baseUrl).toString()
  if (ownedChildExited(child)) throw new Error('URAI_OWNED_LIFEMAP_CHILD_EXITED_BEFORE_WARMUP')
  let response
  try {
    response = await fetchImpl(endpoint, {
      redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw new Error('URAI_OWNED_LIFEMAP_WARMUP_NETWORK_FAILED: ' + (error?.message || String(error)))
  }
  if (ownedChildExited(child)) throw new Error('URAI_OWNED_LIFEMAP_CHILD_EXITED_DURING_WARMUP')
  if (response.status !== 200 || !/text\/html/i.test(response.headers?.get?.('content-type') || '')) {
    throw new Error('URAI_OWNED_LIFEMAP_WARMUP_HTTP_' + String(response.status))
  }
  if (!isUraiHomeDocument(await response.text())) throw new Error('URAI_OWNED_LIFEMAP_NOT_ORIGINAL_DOCUMENT')
  return { endpoint, status: 200 }
}


/** Warm exact, public, neutral realm routes before measuring timed navigation.
 * This proves only a successful owned Next compilation, never an entered world.
 * No selected memory ID, owner context or user-provided URL is permitted. */
export async function warmOwnedJourneyRealm(baseUrl, child, route, {
  fetchImpl = fetch, timeoutMs = 180000,
} = {}) {
  if (route !== '/focus' && route !== '/replay') {
    throw new Error('URAI_OWNED_JOURNEY_WARMUP_ROUTE_REJECTED')
  }
  const realm = route.slice(1).toUpperCase()
  if (ownedChildExited(child)) throw new Error(`URAI_OWNED_${realm}_CHILD_EXITED_BEFORE_WARMUP`)
  const endpoint = new URL(route, baseUrl).toString()
  let response
  try {
    response = await fetchImpl(endpoint, {
      redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw new Error(`URAI_OWNED_${realm}_WARMUP_NETWORK_FAILED: ` + (error?.message || String(error)))
  }
  if (ownedChildExited(child)) throw new Error(`URAI_OWNED_${realm}_CHILD_EXITED_DURING_WARMUP`)
  if (response.status !== 200 || !/text\/html/i.test(response.headers?.get?.('content-type') || '')) {
    throw new Error(`URAI_OWNED_${realm}_WARMUP_HTTP_` + String(response.status))
  }
  if (!isUraiHomeDocument(await response.text())) throw new Error(`URAI_OWNED_${realm}_NOT_ORIGINAL_DOCUMENT`)
  return { endpoint, status: 200 }
}

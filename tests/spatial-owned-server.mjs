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
        return
      }
    } catch (error) {
      lastStatus = error?.message || String(error)
    }
    await sleep(intervalMs)
  }
  throw new Error(`URAI_OWNED_HOME_NOT_READY: ${endpoint}; last status: ${lastStatus}`)
}

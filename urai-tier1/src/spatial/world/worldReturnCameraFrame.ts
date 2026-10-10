import { homeReturnHref } from '../navigation/homeReturnCheckpoint'
import { parseFocusCameraFrame } from '../../app/focus/focusCameraFrame'
import { parseLifeMapCameraFrame, retainLifeMapCameraFrame } from '../../components/lifemap/lifeMapCameraFrame'
import { definitionForDestination } from './destinationRegistry'
import type { UraiDestination, UraiWorldState } from './worldTypes'

// Keep the local Focus pose and its original galaxy pose in separate fields.
// Each admission uses the same bounded parser as the destination camera owner.
export function worldReturnCameraFrame(
  destination: UraiDestination,
  world: Pick<UraiWorldState, 'memoryId'>,
  params: URLSearchParams,
): { href: string; cameraCheckpoint: string } {
  if (destination === 'home') return { href: homeReturnHref(params.toString()), cameraCheckpoint: 'home-sky-return' }
  const definition = definitionForDestination(destination)
  const next = new URLSearchParams()
  let cameraCheckpoint = definition.cameraCheckpoint
  const memoryId = params.get('memoryId') ?? params.get('node')
  const node = params.get('node')
  const returnNode = params.get('returnNode') ?? node
  const sameMemory = Boolean(world.memoryId && world.memoryId === memoryId)
  const validReturnNode = Boolean(returnNode && (
    returnNode === memoryId || returnNode === node ||
    (params.get('demo') === '1' && memoryId === `demo:${returnNode}`)
  ))

  if (sameMemory && destination === 'focus' && node) {
    const frame = parseFocusCameraFrame(params, node, 'focus')
    if (frame) {
      cameraCheckpoint = `focus-return:${node}`
      next.set('node', node)
      next.set('entryCamera', frame.position.join(','))
      next.set('entryTarget', frame.target.join(','))
      next.set('entryFov', String(frame.fov))
    }
    if (validReturnNode && returnNode) retainLifeMapCameraFrame(next, params, returnNode)
  }

  if (sameMemory && destination === 'life-map' && validReturnNode && returnNode) {
    const retained = new URLSearchParams({
      cameraCheckpoint: params.get('lifeMapCheckpoint') ?? '',
      entryCamera: params.get('lifeMapCamera') ?? '',
      entryTarget: params.get('lifeMapTarget') ?? '',
      entryFov: params.get('lifeMapFov') ?? '',
    })
    const frame = parseLifeMapCameraFrame(params, returnNode, 'arrival')
      ?? parseLifeMapCameraFrame(retained, returnNode, 'arrival')
    if (frame) {
      cameraCheckpoint = `life-map-return:${returnNode}`
      next.set('node', returnNode)
      next.set('returnNode', returnNode)
      next.set('entryCamera', frame.position.join(','))
      next.set('entryTarget', frame.target.join(','))
      next.set('entryFov', String(frame.fov))
    }
  }

  const query = next.toString()
  return { href: `${definition.href}${query ? `?${query}` : ''}`, cameraCheckpoint }
}

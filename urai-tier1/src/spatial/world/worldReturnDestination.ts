import type { UraiDestination, UraiWorldState } from './worldTypes'

// Canonical journey: Replay unwinds to Focus with the selected memory.
// Life Movie remains the explicit higher-level return exception.
function fallbackReturnDestination(destination: UraiDestination): UraiDestination {
  if (destination === 'focus') return 'life-map'
  if (destination === 'replay') return 'focus'
  if (destination === 'life-movie') return 'replay'
  if (destination === 'infrastructure-hub') return 'home'
  return 'infrastructure-hub'
}

export function resolveWorldReturnDestination(
  world: Pick<UraiWorldState, 'destination' | 'previousDestination' | 'scenarioOrigin'>,
): UraiDestination {
  if (world.destination === 'replay') {
    return world.previousDestination === 'life-movie' ? 'life-movie' : 'focus'
  }
  if (world.destination === 'possible-futures' && world.scenarioOrigin) {
    return world.scenarioOrigin === 'ground' ? 'infrastructure-hub' : world.scenarioOrigin
  }
  return world.previousDestination ?? fallbackReturnDestination(world.destination)
}

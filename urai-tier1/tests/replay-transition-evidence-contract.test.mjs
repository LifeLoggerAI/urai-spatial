import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const focus = read('src/app/focus/FocusChamberClient.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')
const controller = read('src/spatial/world/WorldTransitionController.tsx')
const provider = read('src/spatial/world/WorldStateProvider.tsx')
const navigation = read('src/spatial/world/worldNavigation.css')

test('Focus to Replay uses the governed selected-memory crossing without a visible portal or radial tunnel', () => {
  assert.match(focus, /requestUraiWorldTravel\(\{ destination: 'replay'/)
  assert.match(focus, /entryPortal: 'focus-memory-aperture'/)
  assert.match(controller, /destination === 'replay' \|\| destination === 'location-map'/)
  assert.match(controller, /return 1900/)
  assert.match(controller, /return 260/)
  assert.match(provider, /return 'travelling'/)
  assert.match(navigation, /Selected-memory crossings must preserve hierarchy without drawing a portal/)
  assert.match(navigation, /\[data-to='replay'\] \.urai-world-transition__aperture[\s\S]*display: none;/)
  assert.match(navigation, /\[data-to='replay'\] \.urai-world-transition__depth[\s\S]*animation: urai-memory-depth-crossing 1\.9s/)
  assert.match(navigation, /@keyframes urai-memory-depth-crossing/)
  assert.match(navigation, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(navigation, /animation-duration: 260ms !important/)
})

test('Replay and Focus unwind through canonical nested parents instead of a one-deep previousDestination bounce', () => {
  assert.match(replay, /const unwind = useCallback\(\(\) => requestUraiWorldReturn\(\), \[\]\)/)
  assert.match(replay, /if \(event\.key === 'Escape'\) \{ event\.preventDefault\(\); unwind\(\); return \}/)
  assert.match(controller, /const onReturn = \(\) => reverseTravel\(\)/)
  assert.match(controller, /function canonicalReturnDestination/)
  assert.match(controller, /if \(destination === 'replay'\) return 'focus'/)
  assert.match(controller, /if \(destination === 'focus'\) return 'life-map'/)
  assert.match(controller, /canonicalReturnDestination\(currentWorld\.destination, currentWorld\.previousDestination\)/)
  assert.match(controller, /executeTravel\(\{/)
  assert.match(provider, /previousDestination: state\.world\.destination/)
  assert.doesNotMatch(controller, /const destination = currentWorld\.previousDestination \?\? fallbackReturnDestination\(currentWorld\.destination\)/)
  assert.doesNotMatch(replay, /requestUraiWorldTravel\(\{ destination: 'life-map'.*unwind/)
})

test('selected-memory transition closeout remains an evidence mapping, not a duplicate standalone media authority', () => {
  assert.match(navigation, /\.urai-world-transition__depth/)
  assert.match(navigation, /urai-memory-depth-crossing/)
  assert.match(navigation, /\[data-from='focus'\]\[data-to='life-map'\][\s\S]*\.urai-world-transition__aperture[\s\S]*display: none;/)
  assert.doesNotMatch(replay, /memory-focus-tunnel\.(glb|png|webm)/i)
  assert.doesNotMatch(replay, /memory-return-to-galaxy-transition\.(glb|png|webm)/i)
})

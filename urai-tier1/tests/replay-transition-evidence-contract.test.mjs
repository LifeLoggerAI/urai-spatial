import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const focus = read('src/app/focus/FocusChamberClient.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')
const controller = read('src/spatial/world/WorldTransitionController.tsx')
const provider = read('src/spatial/world/WorldStateProvider.tsx')
const navigation = read('src/spatial/world/worldNavigation.css')

test('URA-068 memory focus tunnel is the governed Focus to Replay travelling transition', () => {
  assert.match(focus, /requestUraiWorldTravel\(\{ destination: 'replay'/)
  assert.match(focus, /entryPortal: 'focus-memory-aperture'/)
  assert.match(controller, /destination === 'replay' \|\| destination === 'location-map'/)
  assert.match(controller, /return 1900/)
  assert.match(controller, /return 260/)
  assert.match(provider, /return 'travelling'/)
  assert.match(navigation, /\.urai-world-transition\[data-phase='travelling'\]/)
  assert.match(navigation, /animation: urai-world-tunnel-travel 1\.9s/)
  assert.match(navigation, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(navigation, /animation-duration: 260ms !important/)
})

test('URA-069 replay return reuses deterministic reverse travel instead of bypassing Focus', () => {
  assert.match(replay, /const unwind = useCallback\(\(\) => requestUraiWorldReturn\(\), \[\]\)/)
  assert.match(replay, /if \(event\.key === 'Escape'\) \{ event\.preventDefault\(\); unwind\(\); return \}/)
  assert.match(controller, /const onReturn = \(\) => reverseTravel\(\)/)
  assert.match(controller, /if \(destination === 'replay'\) return 'focus'/)
  assert.match(controller, /const destination = currentWorld\.previousDestination \?\? fallbackReturnDestination\(currentWorld\.destination\)/)
  assert.match(controller, /executeTravel\(\{/)
  assert.match(provider, /previousDestination: state\.world\.destination/)
  assert.doesNotMatch(replay, /requestUraiWorldTravel\(\{ destination: 'life-map'.*unwind/)
})

test('Replay transition closeout remains an evidence mapping, not a duplicate standalone media authority', () => {
  assert.match(navigation, /\.urai-world-transition__depth/)
  assert.match(navigation, /repeating-radial-gradient/)
  assert.match(navigation, /urai-world-tunnel-travel/)
  assert.doesNotMatch(replay, /memory-focus-tunnel\.(glb|png|webm)/i)
  assert.doesNotMatch(replay, /memory-return-to-galaxy-transition\.(glb|png|webm)/i)
})
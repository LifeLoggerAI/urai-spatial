import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const companion = fs.readFileSync(new URL('../src/spatial/world/PersistentWorldCompanion.tsx', import.meta.url), 'utf8')
const shell = fs.readFileSync(new URL('../src/spatial/world/UraiWorldShell.tsx', import.meta.url), 'utf8')

test('UrAi world shell does not expose a corporate public-estate mega-menu', () => {
  assert.doesNotMatch(companion, /PUBLIC_ESTATE|Public constellation|URAI Studio|URAI Privacy|URAI Labs|URAI Foundation/)
  assert.doesNotMatch(companion, /target="_blank"|Travel through the URAI world|Travel to private URAI realms/)
  assert.match(companion, /Private companion conversation and sensory controls\. World travel stays in the world\./)
})

test('Orb remains a companion rather than a universal destination registry', () => {
  assert.doesNotMatch(companion, /PRIMARY_DESTINATIONS|SECONDARY_DESTINATIONS|destinationButtons|requestUraiWorldTravel/)
  assert.match(companion, /<OrbConversationPanel \/>/)
  assert.match(companion, /aria-label=\{open \? 'Close UrAi Orb companion' : 'Open UrAi Orb companion'\}/)
  assert.match(companion, /aria-label="Return through the world"/)
  assert.match(shell, /<PersistentWorldCompanion \/>/)
})

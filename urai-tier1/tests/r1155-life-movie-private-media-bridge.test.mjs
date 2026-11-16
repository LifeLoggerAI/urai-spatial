import test from 'node:test'
import assert from 'node:assert/strict'
import { selectLifeMovieMedia } from '../src/spatial/life-movie/selectLifeMovieMedia.ts'

const demo = () => ({ demo: true, authorization: 'owner', privacy: 'private', sourceMedia: [
  { kind: 'image', url: 'https://example.invalid/disclosed-demo-image' },
  { kind: 'video', url: 'https://example.invalid/disclosed-demo-video' },
], sourceMediaReceipts: [] })
const privateMemory = () => ({ ...demo(), demo: false, sourceMedia: [{ kind: 'video', url: 'https://storage.googleapis.com/legacy-public-token' }], sourceMediaReceipts: [{ kind: 'video', mediaReceiptId: 'a'.repeat(64) }] })
const ready = (kind = 'video', url = 'blob:https://urai.invalid/opaque-session') => ({status:'ready', media:[{kind,url}]})
const denied = status => ({status,media:[{kind:'video',url:'blob:https://urai.invalid/stale'}]})

test('returns no media when there is no selected memory', () => assert.equal(selectLifeMovieMedia(null,ready()),null))
test('disclosed demo selects demo media by video then image then audio', () => assert.equal(selectLifeMovieMedia(demo(), denied('unavailable')).url,'https://example.invalid/disclosed-demo-video'))
test('private memory renders only fresh authorized revocable blob media', () => assert.deepEqual(selectLifeMovieMedia(privateMemory(),ready()),{kind:'video',url:'blob:https://urai.invalid/opaque-session'}))
test('non-demo raw Firebase or Storage URLs never become playback', () => assert.equal(selectLifeMovieMedia(privateMemory(), ready('video','https://storage.googleapis.com/legacy-public-token')),null))
test('non-demo data/javascript URLs do not become playback', () => { for(const url of ['data:video/mp4;base64,AAAA','javascript:alert(1)']) assert.equal(selectLifeMovieMedia(privateMemory(),ready('video',url)),null) })
test('private media denied while authority is absent/loading/unavailable', () => { for(const status of ['absent','loading','unavailable']) assert.equal(selectLifeMovieMedia(privateMemory(),denied(status)),null) })
test('private media denied for missing owner authority or hidden/shareable privacy', () => { for (const patch of [{authorization:'guest'},{privacy:'hidden'},{privacy:'shareable'}]) assert.equal(selectLifeMovieMedia({...privateMemory(),...patch},ready()),null) })
test('private media denied without canonical media receipt', () => assert.equal(selectLifeMovieMedia({...privateMemory(),sourceMediaReceipts:[]},ready()),null))
test('private media denied when hook kind mismatches selected receipt', () => assert.equal(selectLifeMovieMedia(privateMemory(),ready('image')),null))
test('private media rejects whitespace-injected blob URLs', () => assert.equal(selectLifeMovieMedia(privateMemory(),ready('video','blob:https://urai.invalid/id\nhttps://bad.invalid')),null))
test('private media prefers same receipt order as authorized hook', () => { const m={...privateMemory(),sourceMediaReceipts:[{kind:'image',mediaReceiptId:'b'.repeat(64)},{kind:'video',mediaReceiptId:'c'.repeat(64)}]}; assert.equal(selectLifeMovieMedia(m,{status:'ready',media:[{kind:'image',url:'blob:https://urai.invalid/image'},{kind:'video',url:'blob:https://urai.invalid/video'}]}).kind,'video') })
test('private source never falls back to legacy persisted URL when playable media absent', () => assert.equal(selectLifeMovieMedia(privateMemory(),{status:'ready',media:[]}),null))

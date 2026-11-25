import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { nativeNavigationPath, observeNativeNavigation } from '../src/lib/native/nativeDeepLinks.ts'
import { androidAssetLinks, appleAppSiteAssociation, configureAndroidAppLinks } from '../../scripts/prepare-native-links.mjs'

test('native navigation admits only canonical HTTPS route roots without credentials', async () => {
  const links = JSON.parse(await fs.readFile(new URL('../src/lib/native/paths.json', import.meta.url)))
  for (const pathname of links.paths) assert.equal(nativeNavigationPath(`https://urai.app${pathname}`), pathname)
  for (const url of [null, '', '/home', 'http://urai.app/home', 'https://www.urai.app/home', 'https://urai.app.evil.test/home', 'https://evil.test/https://urai.app/home', 'https://user:secret@urai.app/home', 'https://urai.app:444/home', 'urai://home', 'https://urai.app/auth/callback', 'https://urai.app/home?code=synthetic', 'https://urai.app/home?id_token=synthetic', 'https://urai.app/home?returnTo=https://evil.test', 'https://urai.app/home#access_token=synthetic', 'https://urai.app/home?', 'https://urai.app/home#', 'https://urai.app/%68ome', ' https://urai.app/home', 'https://urai.app/home\\evil', 'https://urai.app/home\n']) assert.equal(nativeNavigationPath(url), null, String(url))
})

test('native links handle cold and warm delivery and stop after listener cleanup', async () => {
  let event, removed = 0
  const order = [], routes = []
  const app = { addListener: async (name, callback) => { order.push(name); event = callback; return { remove: async () => { removed++ } } }, getLaunchUrl: async () => { order.push('launch'); return { url: 'https://urai.app/home' } } }
  const dispose = await observeNativeNavigation(app, value => routes.push(value), () => true)
  await Promise.resolve()
  assert.deepEqual(order, ['appUrlOpen', 'launch'])
  event({ url: 'https://urai.app/focus' })
  event({ url: 'https://urai.app/home?code=synthetic' })
  assert.deepEqual(routes, ['/home', '/focus'])
  await dispose()
  event({ url: 'https://urai.app/replay' })
  assert.deepEqual(routes, ['/home', '/focus'])
  assert.equal(removed, 1)
})

test('canonical Life Map opens on cold and warm native delivery and is associated on both platforms', async () => {
  assert.equal(nativeNavigationPath('https://urai.app/life-map'), '/life-map')
  assert.equal(nativeNavigationPath('https://urai.app/lifemap'), null)
  let receive
  const routes = []
  const dispose = await observeNativeNavigation({
    addListener: async (_name, listener) => { receive = listener; return { remove: async () => {} } },
    getLaunchUrl: async () => ({ url: 'https://urai.app/life-map' }),
  }, route => routes.push(route), () => true)
  await Promise.resolve()
  receive({ url: 'https://urai.app/life-map' })
  assert.deepEqual(routes, ['/life-map', '/life-map'])
  await dispose()
  const association = appleAppSiteAssociation('SYNTH12345', 'com.urailabs.urai')
  assert.ok(association.applinks.details[0].paths.includes('/life-map'))
  assert.equal(association.applinks.details[0].paths.includes('/lifemap'), false)
})

test('a pending cold launch does not delay removal and an inactive runtime never navigates', async () => {
  let launch, event, removed = false, active = true
  const routes = []
  const app = { addListener: async (name, callback) => { event = callback; return { remove: async () => { removed = true } } }, getLaunchUrl: () => new Promise(resolve => { launch = resolve }) }
  const dispose = await observeNativeNavigation(app, value => routes.push(value), () => active)
  active = false
  event({ url: 'https://urai.app/home' })
  await dispose()
  assert.equal(removed, true)
  launch({ url: 'https://urai.app/replay' })
  await Promise.resolve()
  assert.deepEqual(routes, [])
})

test('Android association uses observed Play app-signing identity and generated manifest is idempotent', async () => {
  const entries = await androidAssetLinks()
  assert.equal(entries[0].target.package_name, 'com.urailabs.urai')
  assert.deepEqual(entries[0].target.sha256_cert_fingerprints, ['B8:8D:29:6D:94:DD:02:1C:FD:53:9F:89:8B:FB:3B:2B:0F:2C:AD:8E:52:D8:75:89:58:71:D6:5E:BD:C6:39:D6'])
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'urai-native-links-test-'))
  try {
    const file = path.join(dir, 'app/src/main/AndroidManifest.xml')
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, '<manifest><application android:allowBackup="true"><activity android:name=".MainActivity">\n        </activity></application></manifest>')
    await configureAndroidAppLinks(dir)
    const first = await fs.readFile(file, 'utf8')
    await configureAndroidAppLinks(dir)
    assert.equal(await fs.readFile(file, 'utf8'), first)
    assert.match(first, /android:autoVerify="true"/)
    assert.match(first, /android:host="urai.app" android:path="\/focus"/)
    assert.match(first, /android:host="urai.app" android:path="\/life-map"/)
    assert.doesNotMatch(first, /android:path="\/lifemap"/)
    assert.match(first, /android:allowBackup="false"/)
    assert.match(first, /android:usesCleartextTraffic="false"/)
    assert.equal((first.match(/android\.permission\.ACCESS_COARSE_LOCATION/g) || []).length, 1)
    assert.equal((first.match(/android\.permission\.ACCESS_FINE_LOCATION/g) || []).length, 1)
    for (const feature of ['location', 'location.gps', 'location.network']) {
      assert.ok(first.includes(`android:name="android.hardware.${feature}" android:required="false"`))
    }
    assert.match(first, /android:dataExtractionRules="@xml\/urai_data_extraction_rules"/)
    assert.match(await fs.readFile(path.join(dir, 'app/src/main/res/xml/urai_backup_exclusions.xml'), 'utf8'), /<exclude domain="database" path="\."/)
    const extraction = await fs.readFile(path.join(dir, 'app/src/main/res/xml/urai_data_extraction_rules.xml'), 'utf8')
    assert.match(extraction, /<cloud-backup>/); assert.match(extraction, /<device-transfer>/)
    assert.equal((extraction.match(/<exclude /g) || []).length, 18)
    assert.doesNotMatch(first, /custom_url_scheme|android\.permission\.(?:ACCESS_BACKGROUND_LOCATION|CAMERA|RECORD_AUDIO|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|POST_NOTIFICATIONS)/)
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})

test('foreground geolocation preparation preserves existing grants and rejects mandatory location hardware', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'urai-native-location-test-'))
  try {
    const file = path.join(dir, 'app/src/main/AndroidManifest.xml')
    await fs.mkdir(path.dirname(file), { recursive: true })
    const template = '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET" /><uses-permission android:name=\'android.permission.ACCESS_COARSE_LOCATION\' /><uses-feature android:name=\'android.hardware.location.gps\' android:required=\'false\' /><application android:allowBackup="true"><activity android:name=".MainActivity">\n        </activity></application></manifest>'
    await fs.writeFile(file, template)
    await configureAndroidAppLinks(dir)
    const configured = await fs.readFile(file, 'utf8')
    assert.equal((configured.match(/android\.permission\.ACCESS_COARSE_LOCATION/g) || []).length, 1)
    assert.equal((configured.match(/android\.permission\.ACCESS_FINE_LOCATION/g) || []).length, 1)
    assert.equal((configured.match(/android\.hardware\.location\.gps/g) || []).length, 1)
    assert.equal((configured.match(/<uses-permission /g) || []).length, 3)
    assert.match(configured, /android\.permission\.INTERNET/)
    await configureAndroidAppLinks(dir)
    assert.equal(await fs.readFile(file, 'utf8'), configured)
    const required = template.replace("android:required='false'", "android:required='true'")
    await fs.writeFile(file, required)
    await assert.rejects(configureAndroidAppLinks(dir), /ANDROID_LOCATION_FEATURE_MUST_BE_OPTIONAL/)
    assert.equal(await fs.readFile(file, 'utf8'), required)
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})

test('Apple association cannot be generated without supplied Team and bundle identity', () => {
  for (const team of [undefined, '', 'TEAMID', 'EXAMPLE1234', 'PLACEHOLDER', 'short']) assert.throws(() => appleAppSiteAssociation(team, 'com.urailabs.urai'), /REAL_APPLE_TEAM_ID_REQUIRED/)
  assert.throws(() => appleAppSiteAssociation('SYNTH12345', ''), /OWNER_CONFIRMED_IOS_BUNDLE_ID_REQUIRED/)
  const fixture = appleAppSiteAssociation('SYNTH12345', 'com.urailabs.urai')
  assert.equal(fixture.applinks.details[0].appID, 'SYNTH12345.com.urailabs.urai')
  assert.ok(fixture.applinks.details[0].paths.includes('/home'))
})


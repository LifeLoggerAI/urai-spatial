import fs from 'node:fs'

const manifestPath = new URL('./android/app/src/main/AndroidManifest.xml', import.meta.url)
let xml = fs.readFileSync(manifestPath, 'utf8')

const activityMatch = xml.match(/<activity\b[^>]*android:name="\.MainActivity"[^>]*>/)
if (!activityMatch) throw new Error('Generated Capacitor MainActivity was not found.')

let activityTag = activityMatch[0]
if (!activityTag.includes('android:launchMode=')) {
  activityTag = activityTag.replace(/>$/, ' android:launchMode="singleTask">')
  xml = xml.replace(activityMatch[0], activityTag)
} else if (!activityTag.includes('android:launchMode="singleTask"')) {
  throw new Error('MainActivity launchMode must remain singleTask for OAuth App Link returns.')
}

if (!xml.includes('android:host="urai.app"') || !xml.includes('android:pathPrefix="/settings"')) {
  const filter = `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="urai.app" android:pathPrefix="/settings" />
            </intent-filter>`
  const anchor = '</activity>'
  const index = xml.indexOf(anchor, xml.indexOf(activityTag))
  if (index < 0) throw new Error('MainActivity closing tag was not found.')
  xml = xml.slice(0, index) + filter + '\n        ' + xml.slice(index)
}

fs.writeFileSync(manifestPath, xml)
console.log('Configured verified HTTPS App Link return: https://urai.app/settings')

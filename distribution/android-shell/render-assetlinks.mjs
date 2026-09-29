import fs from 'node:fs'

const fingerprint = String(process.env.ANDROID_UPLOAD_CERT_SHA256 || process.argv[2] || '')
  .trim()
  .replace(/:/g, '')
  .toUpperCase()

if (!/^[0-9A-F]{64}$/.test(fingerprint)) {
  throw new Error('ANDROID_UPLOAD_CERT_SHA256 must be a 32-byte SHA-256 certificate fingerprint.')
}

const colonized = fingerprint.match(/.{2}/g)?.join(':')
if (!colonized) throw new Error('Unable to normalize certificate fingerprint.')

const payload = [{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: 'com.urailabs.urai',
    sha256_cert_fingerprints: [colonized],
  },
}]

const output = process.env.ANDROID_ASSETLINKS_OUTPUT || 'android-assetlinks.json'
fs.writeFileSync(output, JSON.stringify(payload, null, 2) + '\n')
console.log(`Wrote ${output} for com.urailabs.urai`)

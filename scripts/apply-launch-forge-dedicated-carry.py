from pathlib import Path

path = Path('scripts/forge-launch-critical-assets.mjs')
text = path.read_text()
old = """const generated = []
for (const asset of manifest.assets) {
  const generator = generators[asset.id]
  if (!generator) throw new Error(`No generator registered for ${asset.id}`)
  const absolutePath = path.join(repoRoot, asset.fixedPath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  const payload = generator()
  fs.writeFileSync(absolutePath, payload)
  const receipt = buildReceipt(asset, absolutePath, payload)
  const receiptPath = path.join(receiptRoot, `${asset.id}.json`)
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n')
  generated.push(receipt)
  console.log(`${asset.id}: ${receipt.bytes} bytes ${receipt.sha256}`)
}
"""
new = """const generated = []
for (const asset of manifest.assets) {
  const generator = generators[asset.id]
  const absolutePath = path.join(repoRoot, asset.fixedPath)
  const receiptPath = path.join(receiptRoot, `${asset.id}.json`)

  if (!generator) {
    // Some launch-critical assets are produced by dedicated governed pipelines
    // (for example the skinned human candidates). The generic forge must not
    // replace those certified binaries with an unrelated procedural stand-in.
    if (!fs.existsSync(absolutePath) || !fs.existsSync(receiptPath)) {
      throw new Error(`No generator registered for ${asset.id} and no governed dedicated-pipeline artifact/receipt is present`)
    }
    const payload = fs.readFileSync(absolutePath)
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
    const digest = crypto.createHash('sha256').update(payload).digest('hex')
    if (receipt.id !== asset.id) throw new Error(`Dedicated receipt id mismatch for ${asset.id}`)
    if (receipt.fixedPath !== asset.fixedPath) throw new Error(`Dedicated receipt path mismatch for ${asset.id}`)
    if (receipt.sha256 !== digest) throw new Error(`Dedicated artifact hash mismatch for ${asset.id}`)
    if (receipt.bytes !== payload.length) throw new Error(`Dedicated artifact byte-count mismatch for ${asset.id}`)
    generated.push(receipt)
    console.log(`${asset.id}: carried governed dedicated-pipeline artifact ${receipt.bytes} bytes ${receipt.sha256}`)
    continue
  }

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  const payload = generator()
  fs.writeFileSync(absolutePath, payload)
  const receipt = buildReceipt(asset, absolutePath, payload)
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n')
  generated.push(receipt)
  console.log(`${asset.id}: ${receipt.bytes} bytes ${receipt.sha256}`)
}
"""

old_count = text.count(old)
new_count = text.count(new)
if new_count == 1 and old_count == 0:
    print('LAUNCH_FORGE_DEDICATED_CARRY_ALREADY_PATCHED')
    raise SystemExit(0)
if old_count != 1 or new_count != 0:
    raise SystemExit(f'launch forge ownership boundary is ambiguous: old={old_count}, new={new_count}')

path.write_text(text.replace(old, new, 1))
print('LAUNCH_FORGE_DEDICATED_CARRY_PATCHED')

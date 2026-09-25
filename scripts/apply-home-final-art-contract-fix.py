from pathlib import Path

path = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
text = path.read_text()
replacements = {
    'photographic-rock-pbr-v16': 'photographic-rock-pbr-v18-low-frequency',
    'photographic-obsidian-ritual-platform-v16': 'photographic-obsidian-ritual-platform-v18-integrated-floor',
}
for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
path.write_text(text)
print('HOME_FINAL_ART_CONTRACT_ALIGNED')

from pathlib import Path

path = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
text = path.read_text()
old = 'photographic-rock-pbr-v16'
new = 'photographic-rock-pbr-v18-low-frequency'
if old not in text:
    raise SystemExit(f'missing stale photographic marker: {old}')
path.write_text(text.replace(old, new))
print('HOME_FINAL_ART_CONTRACT_ALIGNED')

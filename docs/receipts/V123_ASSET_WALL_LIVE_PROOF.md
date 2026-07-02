# URAI V1/V2/V3 Asset Wall Live Proof

Generated: 2026-07-02T03:34:36Z

## Result

The V1/V2/V3 asset wall registry and Focus/Replay final cue pass are deployed live on `https://urai.app`.

- Asset wall audit exit: 0
- Typecheck exit: 0
- Static build exit: 0
- Firebase deploy exit: 0
- Screenshot proof exit: 0
- Firebase deploy succeeded on attempt 3
- Launch proof receipt: `/home/adam/urai-final-receipts/aaa-launch-proof-f642e6cc-2026-07-02T03-34-27-930Z/final-report.md`
- Deploy receipt: `/home/adam/urai-final-receipts/deploy-v123-asset-wall-and-focus-replay-cues-20260702T032447Z`

## Latest commits in deployed build

```text
f642e6cc Record AAA V1 V2 V3 asset wall
d7b5666a Add V1 V2 V3 asset wall audit
eae60ea7 Add V3 XR asset registry
17b77c07 Add V2 living system asset registry
72791ccc Inline Focus and Replay cue styles
5ddb081c Add Focus and Replay cue styles
6c7fc985 Add Focus and Replay route polish cues
c764b22c Add final green proof screenshot archive
cc012082 Record final green launch proof
0d3ea697 Restore Focus and Replay launch fingerprints
d0d001a3 Add visible final asset spine scene layer
a58db36f Wire final asset spine runtime bridge
```

## Live route proof

```text
200 https://urai.app/home?v123=1782963263
200 https://urai.app/ground?v123=1782963263
200 https://urai.app/life-map?v123=1782963263
200 https://urai.app/focus?memoryId=quiet-reset&v123=1782963263
200 https://urai.app/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&v123=1782963263
200 https://urai.app/mirror?v123=1782963263
200 https://urai.app/passport?v123=1782963263
200 https://urai.app/status?v123=1782963263
200 https://urai.app/privacy-controls?v123=1782963263
200 https://urai.app/location-map?v123=1782963263
200 https://urai.app/spatial/ar-vr?v123=1782963263
200 https://urai.app/assets/urai/final/manifests/urai-final-assets.json?v123=1782963263
```

## Launch proof summary

```text
PASS git-status (0)
OK 200 /
OK 200 /home
OK 200 /ground
OK 200 /life-map
OK 200 /focus
OK 200 /replay
OK 200 /mirror
OK 200 /passport
OK 200 /status
OK 200 /privacy-controls
OK 200 /location-map
OK 200 /spatial/ar-vr
OK 200 /demo
OK 200 /demo/replay-film
OK 200 /asset-audit
OK 200 /tier3
OK 200 /tier4
OK 200 /tier5
PROOF_EXIT=0
```

## Asset wall audit snapshot

```text
V1 public route final-art assets: present=42 missing=0 total=42
V2 living system state assets: present=0 missing=36 total=36
V3 XR physical proof assets: present=3 missing=26 total=29
```

## Meaning

- V1 route asset paths are filled and live-proofed.
- V2 living-state asset registry exists, but the actual V2 state pack is not filled yet.
- V3 XR registry exists, but physical Quest/device proof is not complete.
- Focus and Replay cue polish is deployed live.
- This receipt does not claim bespoke AAA final art, V2 completion, or V3 physical proof.

## Next production target

Start V1 visual-quality replacement and screenshot review before filling V2/V3:

1. Review the 24 screenshot proof images.
2. Replace any weak V1 route art at exact current paths.
3. Re-run `node scripts/audit-v123-asset-wall.mjs`.
4. Re-run typecheck, static build, deploy, and screenshot proof.
5. Move to V2 state assets only after V1 route visuals pass human-eye review.

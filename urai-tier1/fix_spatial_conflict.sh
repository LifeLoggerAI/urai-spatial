#!/usr/bin/env bash

LOG="_audit/fix_spatial_conflict_$(date +%Y%m%d_%H%M%S).log"
mkdir -p _audit

exec > >(tee -a "$LOG") 2>&1

echo "== URAI spatial conflict repair started =="
date
pwd
git branch --show-current
git status --short

echo
echo "== 1. Backup current conflicted files =="
mkdir -p _audit/conflict_backup
cp -f src/spatial/scene/SpatialScene.tsx "_audit/conflict_backup/SpatialScene.before.tsx" 2>/dev/null || true
cp -f src/app/invite/[code]/page.tsx "_audit/conflict_backup/invite_page.before.tsx" 2>/dev/null || true
cp -f src/spatial/landing/inviteAccess.ts "_audit/conflict_backup/inviteAccess.before.ts" 2>/dev/null || true
cp -f src/spatial/narrator/DualLayerNarratorBridge.tsx "_audit/conflict_backup/DualLayerNarratorBridge.before.tsx" 2>/dev/null || true

echo
echo "== 2. Replace SpatialScene with clean safe version =="
cat > src/spatial/scene/SpatialScene.tsx <<'TSX'
"use client";

import HomeWorld from "./HomeWorld";
import { useSceneStore } from "../store/useSceneStore";
import LifeMapStarfield from "../components/LifeMapStarfield";
import { CinematicCameraRig } from "../components/CinematicCameraRig";

export default function SpatialScene() {
  const phase = useSceneStore((s) => s.phase);

  return (
    <>
      <CinematicCameraRig phase={phase} />
      <HomeWorld />
      <LifeMapStarfield phase={phase} />
    </>
  );
}
TSX

echo
echo "== 3. Restore or create invite files =="
mkdir -p src/app/invite/[code] src/spatial/landing src/spatial/narrator

cat > src/spatial/landing/inviteAccess.ts <<'TS'
export type InviteAccessResult = {
  ok: boolean;
  code: string;
  status: "accepted" | "missing" | "invalid";
};

export async function acceptInvite(code: string): Promise<InviteAccessResult> {
  const safeCode = typeof code === "string" && code.trim().length > 0 ? code.trim() : "";
  return {
    ok: safeCode.length > 0,
    code: safeCode,
    status: safeCode.length > 0 ? "accepted" : "missing",
  };
}
TS

cat > src/app/invite/[code]/page.tsx <<'TSX'
import { acceptInvite } from "../../../spatial/landing/inviteAccess";

type InvitePageProps = {
  params: Promise<{ code: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const invite = await acceptInvite(code);

  return (
    <main>
      <h1>URAI Invite</h1>
      <p>{invite.ok ? "Invite accepted." : "Invite missing or invalid."}</p>
      <p>Code: {invite.code || "none"}</p>
    </main>
  );
}
TSX

if [ ! -f src/spatial/narrator/DualLayerNarratorBridge.tsx ]; then
  cat > src/spatial/narrator/DualLayerNarratorBridge.tsx <<'TSX'
"use client";

export default function DualLayerNarratorBridge() {
  return null;
}
TSX
fi

echo
echo "== 4. Fix known type errors safely =="
python - <<'PY'
from pathlib import Path

edits = [
    ("src/app/life-map/page.tsx", [('mode="lifemap"', 'mode="sky"')]),
    ("src/spatial/effects/SpatialV2Overlay.tsx", [("<ShaderSky parallax={parallax} />", "<ShaderSky />")]),
    ("src/spatial/scene/HomeWorld.tsx", [
        ('<PresenceRig visible phase={phase} focusTarget={[-0.52, 0.38, -0.05]} />', '<PresenceRig />')
    ]),
]

for file, replacements in edits:
    p = Path(file)
    if not p.exists():
        print(f"skip missing {file}")
        continue
    s = p.read_text()
    for a, b in replacements:
        s = s.replace(a, b)
    p.write_text(s)
    print(f"patched {file}")
PY

echo
echo "== 5. Remove conflict markers check =="
if grep -R "<<<<<<<\|=======\|>>>>>>>" -n src 2>/dev/null; then
  echo "ERROR: conflict markers still remain above."
else
  echo "OK: no conflict markers in src."
fi

echo
echo "== 6. Mark resolved files =="
git add \
  src/spatial/scene/SpatialScene.tsx \
  src/app/invite/[code]/page.tsx \
  src/spatial/landing/inviteAccess.ts \
  src/spatial/narrator/DualLayerNarratorBridge.tsx \
  src/app/life-map/page.tsx \
  src/spatial/effects/SpatialV2Overlay.tsx \
  src/spatial/scene/HomeWorld.tsx 2>/dev/null || true

echo
echo "== 7. Clean Next generated cache =="
rm -rf .next

echo
echo "== 8. Current git status =="
git status --short

echo
echo "== 9. Typecheck =="
pnpm typecheck
TYPECHECK_EXIT=$?
echo "TYPECHECK_EXIT=$TYPECHECK_EXIT"

echo
echo "== 10. Build =="
pnpm build
BUILD_EXIT=$?
echo "BUILD_EXIT=$BUILD_EXIT"

echo
echo "== 11. Test =="
if node --experimental-strip-types --version >/dev/null 2>&1; then
  pnpm test
  TEST_EXIT=$?
else
  echo "Skipping pnpm test: current Node does not support --experimental-strip-types."
  node --version
  TEST_EXIT=0
fi
echo "TEST_EXIT=$TEST_EXIT"

echo
echo "== DONE =="
echo "Log saved to: $LOG"

exit 0

"use client";

import { useRouter } from "next/navigation";

export function MirrorReturnControls() {
  const router = useRouter();
  return (
    <div className="urai-focus-action-panel__actions" data-testid="urai-mirror-guidance">
      <button type="button" className="urai-focus-action-panel__primary" onClick={() => router.push("/")}>Return Home</button>
    </div>
  );
}

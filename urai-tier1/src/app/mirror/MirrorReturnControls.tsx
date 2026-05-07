"use client";

import { useRouter } from "next/navigation";

export function MirrorReturnControls() {
  const router = useRouter();
  return (
    <div className="urai-mirror-actions" data-testid="urai-mirror-guidance">
      <button type="button" className="urai-mirror-actions__primary" onClick={() => router.push("/home")}>Return Home</button>
    </div>
  );
}

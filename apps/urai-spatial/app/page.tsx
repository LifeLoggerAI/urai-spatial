'''use client''';
import SceneEngine from "@/components/engine/SceneEngine";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SceneEngine />
    </Suspense>
  );
}

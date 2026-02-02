"use client";

import dynamic from "next/dynamic";

const XRScene = dynamic(() => import("../src/XRScene"), { ssr: false });

export default function Page() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <XRScene />
    </div>
  );
}

"use client";

import React from "react";

type Tier1ShellOverlayProps = {
  visible?: boolean;
  [key: string]: any;
};

export default function LifeMapShellOverlay(props: Tier1ShellOverlayProps) {
  if (!props.visible) return null;
  return null;
}

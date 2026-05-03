'use client';

import React from "react";
import { HUD_TAG_CLASS } from "./Tier1ShellConstants";

export type TagProps = {
  children?: React.ReactNode;
  label?: React.ReactNode;
  className?: string;
};

export function Tag({ children, label, className = "" }: TagProps) {
  const value = children ?? label;
  return <span className={[HUD_TAG_CLASS, className].join(" ")}>{value}</span>;
}

export default Tag;

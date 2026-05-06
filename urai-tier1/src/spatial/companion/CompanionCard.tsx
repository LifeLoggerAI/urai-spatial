"use client";

import CompanionWhy from "./CompanionWhy";

export type CompanionCardProps = {
  text: string | null;
  visible?: boolean;
};

export default function CompanionCard({ text, visible = true }: CompanionCardProps) {
  if (!visible || !text) return null;

  return (
    <div className="urai-companion-card">
      <p className="urai-companion-card__text">{text}</p>
      <CompanionWhy />
    </div>
  );
}

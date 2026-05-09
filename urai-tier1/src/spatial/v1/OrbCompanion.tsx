'use client';

export function OrbCompanion({ active = false, onClick }: { active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="urai-v1-orb"
      data-active={active ? 'true' : 'false'}
      data-testid="urai-v1-orb-companion"
      aria-label="Orb companion presence"
      onClick={onClick}
    >
      <span className="urai-v1-orb__core" />
      <span className="urai-v1-orb__halo" />
      <span className="urai-v1-orb__reflection" />
    </button>
  );
}

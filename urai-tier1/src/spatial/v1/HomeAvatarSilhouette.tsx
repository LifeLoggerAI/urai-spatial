'use client';

export function HomeAvatarSilhouette() {
  return (
    <div className="urai-v1-avatar" data-testid="urai-v1-avatar-body" aria-hidden="true">
      <span className="urai-v1-avatar__aura" />
      <span className="urai-v1-avatar__head" />
      <span className="urai-v1-avatar__body" />
      <span className="urai-v1-avatar__ground-reflection" />
    </div>
  );
}

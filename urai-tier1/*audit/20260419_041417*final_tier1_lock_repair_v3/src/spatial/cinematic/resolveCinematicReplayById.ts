export type CinematicReplayState = {
  id: string | null;
  title: string;
  label: string;
};

export function resolveCinematicReplayById(
  starId: string | undefined
): CinematicReplayState | null {
  if (!starId) return null;

  return {
    id: starId,
  };
}

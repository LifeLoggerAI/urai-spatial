import { LaunchRoutePanel } from '../LaunchRoutePanel';
import { RootModeExperience } from '../RootModeExperience';

export const metadata = {
  title: 'URAI Spatial',
  description: 'URAI Spatial opens the home world with direct access to Life Map, Focus, Replay, Passport, and Status.',
};

export default function SpatialPage() {
  return (
    <>
      <LaunchRoutePanel variant="home" />
      <RootModeExperience initialMode="home" />
    </>
  );
}

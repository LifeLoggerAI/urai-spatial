import { LaunchRoutePanel } from '../LaunchRoutePanel';
import { LaunchSeo } from '../LaunchSeo';
import { RootModeExperience } from '../RootModeExperience';

export const metadata = {
  title: 'URAI Spatial',
  description: 'URAI Spatial opens the connected route surface.',
};

export default function SpatialPage() {
  return (
    <>
      <LaunchSeo label="URAI Spatial route is live with connected navigation." />
      <LaunchRoutePanel variant="home" />
      <RootModeExperience initialMode="home" />
    </>
  );
}

import { LaunchSeo } from '../LaunchSeo';
import { MemoryRouteClient } from '@/spatial/layout/MemoryRouteClient';

export const metadata = {
  title: 'URAI Focus',
  description: 'URAI Focus opens one stable memory chamber from the Life Map and keeps Replay one step away.',
};

export default function FocusRoutePage() {
  return (
    <>
      <LaunchSeo label="URAI Focus opens a stable memory chamber wired to Life Map and Replay." />
      <MemoryRouteClient mode="focus" />
    </>
  );
}

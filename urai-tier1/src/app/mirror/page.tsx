import { TierOneExperience } from '@/spatial/layout/TierOneExperience';

export const metadata = {
  title: 'URAI Mirror',
  description:
    'URAI Mirror is the private reflection realm where life patterns can be seen safely without exposing raw memory detail.',
};

export default function MirrorRoutePage() {
  return <TierOneExperience mode="mirror" />;
}

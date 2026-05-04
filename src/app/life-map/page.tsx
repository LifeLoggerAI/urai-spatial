import LifeMapScene from '@/components/spatial/LifeMapScene';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'URAI - Life Map',
  description: 'Explore your living memory map.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function LifeMapPage() {
  const publicDemoMode = process.env.NEXT_PUBLIC_PUBLIC_DEMO_MODE === 'true';
  const recordingMode = process.env.NEXT_PUBLIC_RECORDING_MODE === 'true';
  const dataAttrs = !publicDemoMode && !recordingMode ? { 'data-urai-page': 'life-map' } : {};
  return <div {...dataAttrs}><LifeMapScene /></div>;
}

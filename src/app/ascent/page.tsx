import AscentScene from '@/components/spatial/AscentScene';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'URAI - Ascent',
  description: 'Ascend into your living memory map.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function AscentPage() {
  const publicDemoMode = process.env.NEXT_PUBLIC_PUBLIC_DEMO_MODE === 'true';
  const recordingMode = process.env.NEXT_PUBLIC_RECORDING_MODE === 'true';
  const dataAttrs = !publicDemoMode && !recordingMode ? { 'data-urai-page': 'ascent' } : {};
  return <div {...dataAttrs}><AscentScene /></div>;
}

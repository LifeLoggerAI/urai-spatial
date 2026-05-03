import AscentScene from '@/components/spatial/AscentScene';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'URAI - Ascent',
  description: 'Ascend into your living memory map.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function AscentPage() {
  return <div data-urai-page="ascent"><AscentScene /></div>;
}

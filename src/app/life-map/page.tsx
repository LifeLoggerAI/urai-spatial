import LifeMapScene from '../../components/spatial/LifeMapScene';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'URAI - Life Map',
  description: 'Explore your living memory map.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function LifeMapPage() {
  return <div data-urai-page="life-map"><LifeMapScene /></div>;
}

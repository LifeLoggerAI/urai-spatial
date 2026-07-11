import Link from 'next/link'
import { launchTruth } from '@/data/launchTruth'
import { assetCssStack, statusAssets } from '@/spatial/assets/uraiAssets'

export const metadata = {
  title: 'URAI Status',
  description: 'URAI Spatial implementation and production-certification matrix.',
}

const groups = [
  {
    title: 'Launch spine',
    items: [
      ['/', 'implemented', 'Home threshold entry'],
      ['/home', 'implemented', 'Canonical Home World'],
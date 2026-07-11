import type { MetadataRoute } from 'next'
import {
  URAI_INDEXING_ENABLED,
  URAI_PUBLIC_ORIGIN,
} from '@/lib/discoverability-boundary'

export default function robots(): MetadataRoute.Robots {
  if (URAI_INDEXING_ENABLED) {
    throw new Error('Public indexing requires a reviewed release change and exact production evidence.')
  }

  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
    host: URAI_PUBLIC_ORIGIN,
  }
}

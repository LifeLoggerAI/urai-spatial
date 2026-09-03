import type { Metadata } from 'next'

// Indexing is deny-by-default at the root layout. Public routes must opt in
// explicitly so newly added private or internal pages cannot inherit an
// indexable policy by accident.
export const publicIndexing: Metadata['robots'] = {
  index: true,
  follow: true,
}

'use client'

import Link from 'next/link'
import { useUraiLocale } from '@/lib/i18n/useUraiLocale'

export function FocusSessionUnavailable({ safeHref }: { safeHref: string }) {
  const locale = useUraiLocale()
  return <>
    <h1 {...locale.props('focus.compatibility.unavailableTitle')}>{locale.text('focus.compatibility.unavailableTitle')}</h1>
    <p {...locale.props('focus.compatibility.unavailableDescription')}>{locale.text('focus.compatibility.unavailableDescription')}</p>
    <Link href={safeHref} {...locale.props('focus.compatibility.returnLifeMap')}>{locale.text('focus.compatibility.returnLifeMap')}</Link>
  </>
}

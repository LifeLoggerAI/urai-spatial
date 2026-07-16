'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import HomeSpatialCanvas, { useWebGLAvailable } from './HomeSpatialCanvas'

const doorwayLinks = [
  { href: '/ground?from=home-spatial-shortcuts', label: 'Ground', auditAction: 'home-ground' },
  { href
'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { definitionForDestination } from './destinationRegistry'
import { useUraiWorldState } from './WorldStateProvider'
import {
  URAI_WORLD_RETURN_EVENT,
  URAI_WORLD_TRAVEL_EVENT,
} from './world
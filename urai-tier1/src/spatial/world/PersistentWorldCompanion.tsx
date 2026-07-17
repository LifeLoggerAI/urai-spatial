'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { definitionForDestination, URAI_DESTINATION_REGISTRY } from './destinationRegistry'
import {
  requestUraiWorldReturn,
  requestUraiWorldTravel,
  URAI_WORLD_ORB_OPEN_EVENT,
} from './worldEvents'
import { useUraiWorldState } from './World
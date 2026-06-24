'use client'

import { useEffect } from 'react'
import { useTrackerStore } from '@/stores/tracker'
import type { User, Tracker, Cycle } from '@/types'

interface AppInitProps {
  user: User
  tracker: Pick<Tracker, 'id' | 'name'>
  activeCycle: Cycle | null
}

export function AppInit({ user, tracker, activeCycle }: AppInitProps) {
  const { setCurrentUser, setTracker, setActiveCycle } = useTrackerStore()

  useEffect(() => {
    setCurrentUser(user)
    setTracker(tracker)
    setActiveCycle(activeCycle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, tracker.id, activeCycle?.id])

  return null
}

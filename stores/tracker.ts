'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tracker, User, Cycle } from '@/types'

interface TrackerState {
  trackerId: string | null
  trackerName: string | null
  activeCycle: Cycle | null
  currentUser: User | null
  setTracker: (tracker: Pick<Tracker, 'id' | 'name'>) => void
  setActiveCycle: (cycle: Cycle | null) => void
  setCurrentUser: (user: User) => void
  clear: () => void
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set) => ({
      trackerId: null,
      trackerName: null,
      activeCycle: null,
      currentUser: null,
      setTracker: (tracker) => set({ trackerId: tracker.id, trackerName: tracker.name }),
      setActiveCycle: (cycle) => set({ activeCycle: cycle }),
      setCurrentUser: (user) => set({ currentUser: user }),
      clear: () => set({ trackerId: null, trackerName: null, activeCycle: null, currentUser: null }),
    }),
    { name: 'miyucash-tracker' }
  )
)

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, ChevronRight, Plus, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { createClient as _createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = _createClient as unknown as () => any
import { useTrackerStore } from '@/stores/tracker'

interface TrackerOption {
  id: string
  name: string
  owner_id: string
}

export default function TrackerSelectPage() {
  const router = useRouter()
  const { setTracker, currentUser } = useTrackerStore()
  const [trackers, setTrackers] = useState<TrackerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: memberships } = await supabase
        .from('tracker_members')
        .select('tracker_id')
        .eq('user_id', user.id)
      if (!memberships || memberships.length === 0) {
        router.push('/onboarding')
        return
      }
      const trackerIds = memberships.map((m: { tracker_id: string }) => m.tracker_id)
      const { data: trackerData } = await supabase
        .from('trackers')
        .select('id, name, owner_id')
        .in('id', trackerIds)
      setTrackers((trackerData ?? []) as TrackerOption[])
      setLoading(false)
    }
    load()
  }, [router])

  async function activateTracker(t: TrackerOption) {
    setActivating(t.id)
    setTracker({ id: t.id, name: t.name })
    toast.success(`${t.name} diaktifkan!`)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#B8D4E8]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #B8D4E8 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full opacity-25 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm z-10">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/icons/icon-192.png" alt="MiyuCash" width={72} height={72} className="rounded-2xl shadow-md" />
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#3D4A5C]" style={{ fontFamily: 'var(--font-nunito)' }}>
              Pilih Tracker
            </h1>
            <p className="text-sm text-[#7A8899] mt-1">
              Kamu terdaftar di {trackers.length} tracker
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {trackers.map((t) => (
            <button
              key={t.id}
              onClick={() => activateTracker(t)}
              disabled={!!activating}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-3xl border text-left transition-all active:scale-[0.98] shadow-sm"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(184,212,232,0.3)',
              }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(184,212,232,0.3)' }}>
                <span className="text-base font-extrabold text-[#4A7B9D]" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {t.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#3D4A5C] truncate">{t.name}</p>
                <p className="text-xs text-[#9AAAB8] mt-0.5 flex items-center gap-1">
                  {t.owner_id === currentUser?.id ? (
                    <><Crown className="h-3 w-3" /> Owner</>
                  ) : 'Anggota'}
                </p>
              </div>
              {activating === t.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#4A7B9D] flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#9AAAB8] flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push('/onboarding')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-3xl border transition-all active:scale-[0.98]"
          style={{ background: 'rgba(184,212,232,0.15)', borderColor: 'rgba(184,212,232,0.35)' }}
        >
          <Plus className="h-4 w-4 text-[#4A7B9D]" />
          <span className="text-sm font-bold text-[#4A7B9D]">Buat atau Join Tracker Baru</span>
        </button>
      </div>
    </div>
  )
}

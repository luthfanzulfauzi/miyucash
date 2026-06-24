import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AppInit } from '@/components/layout/app-init'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Resolve which tracker to use: prefer cookie, fallback to first membership
  const cookieStore = await cookies()
  const preferredId = cookieStore.get('miyucash_tracker_id')?.value

  let trackerId: string | null = null

  if (preferredId) {
    const { data } = await supabase
      .from('tracker_members')
      .select('tracker_id')
      .eq('user_id', user.id)
      .eq('tracker_id', preferredId)
      .maybeSingle()
    if (data) trackerId = preferredId
  }

  if (!trackerId) {
    const { data: rows } = await supabase
      .from('tracker_members')
      .select('tracker_id')
      .eq('user_id', user.id)
      .limit(1)
    if (!rows || rows.length === 0) redirect('/onboarding')
    trackerId = (rows[0] as { tracker_id: string }).tracker_id
  }

  // Fetch tracker info
  const { data: trackerRaw } = await supabase
    .from('trackers')
    .select('id, name')
    .eq('id', trackerId)
    .single()

  const tracker = trackerRaw as { id: string; name: string } | null

  if (!tracker) redirect('/onboarding')

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch active cycle
  const { data: activeCycle } = await supabase
    .from('cycles')
    .select('*')
    .eq('tracker_id', tracker.id)
    .eq('is_active', true)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <AppInit
        user={profile!}
        tracker={tracker}
        activeCycle={activeCycle ?? null}
      />
      <main className="pb-20 max-w-2xl mx-auto w-full min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

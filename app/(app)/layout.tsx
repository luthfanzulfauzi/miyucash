import { redirect } from 'next/navigation'
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

  // Check tracker membership
  const { data: membershipRaw } = await supabase
    .from('tracker_members')
    .select('tracker_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const membership = membershipRaw as { tracker_id: string } | null

  if (!membership) {
    redirect('/onboarding')
  }

  // Fetch tracker info
  const { data: trackerRaw } = await supabase
    .from('trackers')
    .select('id, name')
    .eq('id', membership.tracker_id)
    .single()

  const tracker = trackerRaw as { id: string; name: string } | null

  if (!tracker) {
    redirect('/onboarding')
  }

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

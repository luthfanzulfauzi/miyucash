import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Resolves the active tracker for the current user, respecting the cookie.
// Redirects to /login or /onboarding if prerequisites are not met.
export async function getActiveTrackerId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const preferredId = cookieStore.get('miyucash_tracker_id')?.value

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (preferredId) {
    const { data } = await db
      .from('tracker_members')
      .select('tracker_id')
      .eq('user_id', user.id)
      .eq('tracker_id', preferredId)
      .maybeSingle()
    if (data) return preferredId
  }

  // Fallback: first membership (limit 1 avoids maybeSingle multi-row error)
  const { data: rows } = await db
    .from('tracker_members')
    .select('tracker_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!rows || rows.length === 0) redirect('/onboarding')
  return (rows[0] as { tracker_id: string }).tracker_id
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoriesClient } from './categories-client'

export const metadata = { title: 'Kategori' }

export default async function CategoriesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('tracker_members')
    .select('tracker_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/onboarding')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackerId = (membership as any).tracker_id as string

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  return (
    <CategoriesClient
      initialCategories={categories ?? []}
      trackerId={trackerId}
    />
  )
}

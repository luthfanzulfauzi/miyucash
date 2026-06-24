import { createClient, getActiveTrackerId } from '@/lib/supabase/server'
import { CategoriesClient } from './categories-client'

export const metadata = { title: 'Kategori' }

export default async function CategoriesPage() {
  const [supabase, trackerId] = await Promise.all([createClient(), getActiveTrackerId()])

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

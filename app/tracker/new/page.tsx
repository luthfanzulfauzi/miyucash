'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ChevronLeft, FolderPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient as _createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = _createClient as unknown as () => any
import { useTrackerStore } from '@/stores/tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(50, 'Nama terlalu panjang'),
})
type FormValues = z.infer<typeof schema>

export default function NewTrackerPage() {
  const router = useRouter()
  const { setTracker } = useTrackerStore()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: inviteCode, error: codeError } = await supabase.rpc('generate_invite_code')
      if (codeError || !inviteCode) {
        toast.error('Gagal membuat kode undangan. Coba lagi.')
        return
      }

      const { error } = await supabase.from('trackers').insert({
        name: values.name,
        owner_id: user.id,
        invite_code: inviteCode,
      })
      if (error) { toast.error(error.message); return }

      // Fetch new tracker ID
      const { data: newTracker } = await supabase
        .from('trackers')
        .select('id')
        .eq('owner_id', user.id)
        .eq('invite_code', inviteCode)
        .single()

      if (newTracker?.id) {
        await fetch('/api/tracker/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackerId: newTracker.id }),
        })
        setTracker({ id: newTracker.id, name: values.name })
      }

      toast.success(`Tracker "${values.name}" berhasil dibuat!`)
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #B8D4E8 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full opacity-25 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm z-10">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#7A8899] mb-6 hover:text-[#3D4A5C] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/icons/icon-192.png" alt="MiyuCash" width={72} height={72} className="rounded-2xl shadow-md" />
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#3D4A5C]" style={{ fontFamily: 'var(--font-nunito)' }}>
              Buat Tracker Baru
            </h1>
            <p className="text-sm text-[#7A8899] mt-1">
              Pisahkan keuangan dengan tracker berbeda
            </p>
          </div>
        </div>

        {/* Form */}
        <div
          className="rounded-3xl p-6 border shadow-sm"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.3)',
          }}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-[#7A8899] uppercase tracking-wider">
                      Nama Tracker
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="contoh: Rumah Tangga, Bisnis, Liburan…"
                        className="h-11 rounded-xl border-[#B8D4E8]/50 bg-[#F5F0E8]/60 text-sm font-semibold text-[#3D4A5C] focus-visible:ring-[#B8D4E8]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-bold text-sm gap-2 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                  color: '#2D3E50',
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="h-4 w-4" />
                )}
                {loading ? 'Membuat...' : 'Buat Tracker'}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs text-[#9AAAB8] mt-4">
          Tracker baru akan langsung aktif setelah dibuat
        </p>
      </div>
    </div>
  )
}

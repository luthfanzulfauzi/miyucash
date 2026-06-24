'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Users, ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { PixelCat } from '@/components/shared/pixel-cat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const schema = z.object({
  code: z
    .string()
    .min(6, 'Kode harus 6 karakter')
    .max(6, 'Kode harus 6 karakter')
    .regex(/^[A-Za-z0-9]+$/, 'Kode hanya boleh huruf dan angka'),
})

type FormValues = z.infer<typeof schema>

export default function JoinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const supabase = createClient()
      const upperCode = values.code.toUpperCase()

      // Find tracker by invite code
      const { data: trackerRaw } = await supabase
        .from('trackers')
        .select('id, name')
        .eq('invite_code', upperCode)
        .single()

      const tracker = trackerRaw as { id: string; name: string } | null

      if (!tracker) {
        toast.error('Kode tidak valid. Periksa kembali kode dari pasangan kamu.')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Sesi tidak ditemukan. Silakan login ulang.')
        router.push('/login')
        return
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('tracker_members')
        .select('user_id')
        .eq('tracker_id', tracker.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        toast.error('Kamu sudah bergabung di tracker ini.')
        router.push('/dashboard')
        return
      }

      // Check current member count
      const { count } = await supabase
        .from('tracker_members')
        .select('*', { count: 'exact', head: true })
        .eq('tracker_id', tracker.id)

      if ((count ?? 0) >= 2) {
        toast.error('Tracker sudah penuh. Tracker hanya bisa punya 2 anggota.')
        return
      }

      // Join
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: joinError } = await (supabase as any)
        .from('tracker_members')
        .insert({ tracker_id: tracker.id, user_id: user.id })

      if (joinError) {
        toast.error(joinError.message)
        return
      }

      toast.success(`Berhasil bergabung dengan "${tracker.name}"! 🎉`)
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const code = form.watch('code')

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-80 h-80 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-5%] right-[-5%] w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F2C4A0 0%, transparent 70%)' }}
      />

      <div className="z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #C9B8E8 0%, #B8D4E8 100%)',
              }}
            >
              <PixelCat size={56} />
            </div>
          </div>
          <h1
            className="text-2xl font-extrabold text-[#3D4A5C]"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            Join Tracker
          </h1>
          <p className="text-sm text-[#7A8899] mt-1">
            Masukkan kode undangan dari pasangan kamu
          </p>
        </div>

        {/* Form Card */}
        <div
          className="rounded-3xl shadow-xl p-6 border"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(201,184,232,0.4)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#C9B8E8]/40 flex items-center justify-center">
              <Users className="h-4 w-4 text-[#7B5EA7]" />
            </div>
            <h2
              className="text-lg font-extrabold text-[#3D4A5C]"
              style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
            >
              Masukkan Kode
            </h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#4A5A6B] font-semibold text-sm">
                      Kode Undangan (6 karakter)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABCD12"
                        maxLength={6}
                        className="rounded-xl border-[#C9B8E8]/60 bg-white/80 focus-visible:ring-[#C9B8E8] h-12 text-[#3D4A5C] placeholder:text-[#B0BEC8] text-center text-xl font-bold tracking-[0.3em] uppercase"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full h-11 rounded-xl font-bold text-sm gap-2 shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #C9B8E8 0%, #BBA8E0 100%)',
                  color: '#2D3E50',
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                {loading ? 'Bergabung...' : 'Bergabung'}
              </Button>
            </form>
          </Form>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-sm text-[#8B9BB4] hover:text-[#6B7D9A] transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Buat tracker baru
          </Link>
        </div>
      </div>
    </div>
  )
}

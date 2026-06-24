'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Sparkles, Users } from 'lucide-react'

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
  name: z.string().min(3, 'Nama minimal 3 karakter').max(50, 'Nama terlalu panjang'),
})

type FormValues = z.infer<typeof schema>

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Sesi tidak ditemukan. Silakan login ulang.')
        router.push('/login')
        return
      }

      // Generate unique invite code
      const { data: inviteCode, error: codeError } = await supabase.rpc(
        'generate_invite_code',
      )
      if (codeError || !inviteCode) {
        toast.error('Gagal membuat kode undangan. Coba lagi.')
        return
      }

      // Create tracker (triggers will add owner as member + seed categories)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: trackerError } = await (supabase as any)
        .from('trackers')
        .insert({
          name: values.name,
          owner_id: user.id,
          invite_code: inviteCode,
        })

      if (trackerError) {
        toast.error(trackerError.message)
        return
      }

      toast.success('Tracker berhasil dibuat! Selamat datang di MiyuCash 🐱')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div
        className="absolute top-[-8%] right-[-5%] w-80 h-80 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #B8D4E8 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-5%] left-[-5%] w-72 h-72 rounded-full opacity-35 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }}
      />

      <div className="z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #B8D4E8 0%, #C9B8E8 100%)',
              }}
            >
              <PixelCat size={64} />
            </div>
          </div>
          <h1
            className="text-2xl font-extrabold text-[#3D4A5C]"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            Selamat Datang!
          </h1>
          <p className="text-sm text-[#7A8899] mt-1">
            Buat tracker baru atau join bersama pasangan
          </p>
        </div>

        {/* Create Tracker Card */}
        <div
          className="rounded-3xl shadow-xl p-6 border mb-4"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.4)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#B8D4E8]/40 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[#4A7B9D]" />
            </div>
            <h2
              className="text-lg font-extrabold text-[#3D4A5C]"
              style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
            >
              Buat Tracker Baru
            </h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#4A5A6B] font-semibold text-sm">
                      Nama Tracker
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="contoh: Keuangan Kita"
                        className="rounded-xl border-[#B8D4E8]/60 bg-white/80 focus-visible:ring-[#B8D4E8] h-11 text-[#3D4A5C] placeholder:text-[#B0BEC8]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-bold text-sm gap-2 shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                  color: '#2D3E50',
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {loading ? 'Membuat...' : 'Buat Tracker'}
              </Button>
            </form>
          </Form>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#B8D4E8]/40" />
          <span className="text-xs text-[#9AAAB8] font-medium">atau</span>
          <div className="flex-1 h-px bg-[#B8D4E8]/40" />
        </div>

        {/* Join Tracker */}
        <div
          className="rounded-3xl p-4 border"
          style={{
            background: 'rgba(255,255,255,0.55)',
            borderColor: 'rgba(201,184,232,0.4)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#C9B8E8]/40 flex items-center justify-center">
                <Users className="h-4 w-4 text-[#7B5EA7]" />
              </div>
              <div>
                <p
                  className="text-sm font-bold text-[#3D4A5C]"
                  style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
                >
                  Punya kode undangan?
                </p>
                <p className="text-xs text-[#9AAAB8]">Join tracker pasangan</p>
              </div>
            </div>
            <Link href="/join">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-[#C9B8E8] text-[#7B5EA7] hover:bg-[#C9B8E8]/20 font-bold text-xs"
              >
                Join
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

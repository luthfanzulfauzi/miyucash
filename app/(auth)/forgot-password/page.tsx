'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth'
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

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordInput) {
    setLoading(true)
    try {
      const supabase = createClient()
      const redirectTo =
        window.location.origin + '/api/auth/callback?next=/reset-password'

      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setSent(true)
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div
        className="rounded-3xl shadow-xl p-8 border text-center"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(168,216,185,0.4)',
        }}
      >
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #A8D8B9 0%, #90C8A5 100%)' }}
          >
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2
          className="text-2xl font-extrabold text-[#3D4A5C] mb-2"
          style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
        >
          Email terkirim!
        </h2>
        <p className="text-sm text-[#7A8899] mb-6 leading-relaxed">
          Cek inbox kamu dan klik link reset password yang kami kirimkan.
          Link berlaku selama 1 jam.
        </p>
        <Link href="/login">
          <Button
            variant="outline"
            className="rounded-xl border-[#B8D4E8] text-[#4A5A6B] hover:bg-[#B8D4E8]/20 font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke halaman masuk
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div
      className="rounded-3xl shadow-xl p-8 border"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(242,196,160,0.4)',
      }}
    >
      <div className="mb-6">
        <h2
          className="text-2xl font-extrabold text-[#3D4A5C]"
          style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
        >
          Lupa Password
        </h2>
        <p className="text-sm text-[#7A8899] mt-1">
          Masukkan email kamu, kami akan kirimkan link reset password.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#4A5A6B] font-semibold text-sm">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="kamu@email.com"
                    autoComplete="email"
                    className="rounded-xl border-[#F2C4A0]/60 bg-white/80 focus-visible:ring-[#F2C4A0] focus-visible:border-[#F2C4A0] h-11 text-[#3D4A5C] placeholder:text-[#B0BEC8]"
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
            className="w-full h-11 rounded-xl font-bold text-sm mt-2 gap-2 shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #F2C4A0 0%, #EAB090 100%)',
              color: '#2D3E50',
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-[#8B9BB4] hover:text-[#6B7D9A] transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke halaman masuk
        </Link>
      </div>
    </div>
  )
}

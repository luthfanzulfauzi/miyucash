'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, KeyRound } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: ResetPasswordInput) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Password berhasil diubah!')
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-3xl shadow-xl p-8 border"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(184,212,232,0.4)',
      }}
    >
      <div className="mb-6">
        <h2
          className="text-2xl font-extrabold text-[#3D4A5C]"
          style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
        >
          Reset Password
        </h2>
        <p className="text-sm text-[#7A8899] mt-1">
          Buat password baru yang kuat untuk akunmu.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#4A5A6B] font-semibold text-sm">
                  Password Baru
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    className="rounded-xl border-[#B8D4E8]/60 bg-white/80 focus-visible:ring-[#B8D4E8] focus-visible:border-[#B8D4E8] h-11 text-[#3D4A5C] placeholder:text-[#B0BEC8]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#4A5A6B] font-semibold text-sm">
                  Konfirmasi Password Baru
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    className="rounded-xl border-[#B8D4E8]/60 bg-white/80 focus-visible:ring-[#B8D4E8] focus-visible:border-[#B8D4E8] h-11 text-[#3D4A5C] placeholder:text-[#B0BEC8]"
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
              background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
              color: '#2D3E50',
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </Button>
        </form>
      </Form>
    </div>
  )
}

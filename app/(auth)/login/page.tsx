'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, LogIn } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
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

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginInput) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email atau password salah')
        } else {
          toast.error(error.message)
        }
        return
      }
      toast.success('Selamat datang kembali!')
      router.push('/dashboard')
      router.refresh()
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
          Masuk
        </h2>
        <p className="text-sm text-[#7A8899] mt-1">Selamat datang kembali!</p>
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-[#4A5A6B] font-semibold text-sm">
                    Password
                  </FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#8B9BB4] hover:text-[#B8D4E8] transition-colors font-medium"
                  >
                    Lupa password?
                  </Link>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
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
              <LogIn className="h-4 w-4" />
            )}
            {loading ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[#7A8899]">
          Belum punya akun?{' '}
          <Link
            href="/register"
            className="font-bold text-[#8B9BB4] hover:text-[#6B7D9A] transition-colors"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  )
}

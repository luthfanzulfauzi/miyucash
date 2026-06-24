'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
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

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: RegisterInput) {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { name: values.name },
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Email sudah terdaftar. Coba masuk.')
        } else {
          toast.error(error.message)
        }
        return
      }

      if (data.user) {
        toast.success('Akun berhasil dibuat!')
        router.push('/dashboard')
        router.refresh()
      }
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
        borderColor: 'rgba(201,184,232,0.4)',
      }}
    >
      <div className="mb-6">
        <h2
          className="text-2xl font-extrabold text-[#3D4A5C]"
          style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
        >
          Daftar
        </h2>
        <p className="text-sm text-[#7A8899] mt-1">Buat akun baru dan mulai catat bareng!</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#4A5A6B] font-semibold text-sm">
                  Nama
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nama kamu"
                    autoComplete="name"
                    className="rounded-xl border-[#C9B8E8]/60 bg-white/80 focus-visible:ring-[#C9B8E8] focus-visible:border-[#C9B8E8] h-11 text-[#3D4A5C] placeholder:text-[#B0BEC8]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    className="rounded-xl border-[#C9B8E8]/60 bg-white/80 focus-visible:ring-[#C9B8E8] focus-visible:border-[#C9B8E8] h-11 text-[#3D4A5C] placeholder:text-[#B0BEC8]"
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
                <FormLabel className="text-[#4A5A6B] font-semibold text-sm">
                  Password
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    className="rounded-xl border-[#C9B8E8]/60 bg-white/80 focus-visible:ring-[#C9B8E8] focus-visible:border-[#C9B8E8] h-11 text-[#3D4A5C] placeholder:text-[#B0BEC8]"
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
                  Konfirmasi Password
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    className="rounded-xl border-[#C9B8E8]/60 bg-white/80 focus-visible:ring-[#C9B8E8] focus-visible:border-[#C9B8E8] h-11 text-[#3D4A5C] placeholder:text-[#B0BEC8]"
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
              background: 'linear-gradient(135deg, #C9B8E8 0%, #BBA8E0 100%)',
              color: '#2D3E50',
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {loading ? 'Mendaftar...' : 'Daftar'}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[#7A8899]">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="font-bold text-[#8B9BB4] hover:text-[#6B7D9A] transition-colors"
          >
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  User2,
  Lock,
  LogOut,
  ChevronRight,
  Loader2,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'
import Link from 'next/link'
import { createClient as _createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = _createClient as unknown as () => any
import { useTrackerStore } from '@/stores/tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { getInitials } from '@/lib/utils'
import type { User } from '@/types'

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const router = useRouter()
  const { currentUser, setCurrentUser, clear } = useTrackerStore()
  const [profile, setProfile] = useState<User | null>(currentUser)
  const [loading, setLoading] = useState(!currentUser)

  // Name edit
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(currentUser?.name ?? '')
  const [nameSaving, setNameSaving] = useState(false)

  // Password dialog
  const [pwOpen, setPwOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // Sign out dialog
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signOutLoading, setSignOutLoading] = useState(false)

  const pwForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setNameValue(data.name)
        setCurrentUser(data)
      }
    } finally {
      setLoading(false)
    }
  }, [setCurrentUser])

  useEffect(() => {
    if (!currentUser) {
      loadProfile()
    }
  }, [currentUser, loadProfile])

  async function saveName() {
    if (!profile || !nameValue.trim() || nameValue === profile.name) {
      setEditingName(false)
      return
    }
    setNameSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ name: nameValue.trim() })
        .eq('id', profile.id)
      if (error) throw error
      const updated = { ...profile, name: nameValue.trim() }
      setProfile(updated)
      setCurrentUser(updated)
      toast.success('Nama berhasil diperbarui!')
      setEditingName(false)
    } catch {
      toast.error('Gagal menyimpan nama. Coba lagi.')
    } finally {
      setNameSaving(false)
    }
  }

  async function onChangePassword(values: PasswordFormValues) {
    setPwLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: values.newPassword })
      if (error) throw error
      toast.success('Password berhasil diubah!')
      setPwOpen(false)
      pwForm.reset()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengubah password.'
      toast.error(msg)
    } finally {
      setPwLoading(false)
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      clear()
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Gagal keluar. Coba lagi.')
    } finally {
      setSignOutLoading(false)
    }
  }

  const initials = getInitials(profile?.name ?? 'U')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#B8D4E8]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-6 pb-4"
        style={{ background: 'rgba(245,240,232,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <h1
          className="text-2xl font-extrabold text-[#3D4A5C] tracking-tight"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          Setelan
        </h1>
        <p className="text-xs text-[#7A8899] mt-0.5">Kelola profil dan akun kamu</p>
      </div>

      <div className="px-4 pb-10 space-y-4">
        {/* ── Profile card ── */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.25)',
          }}
        >
          {/* Avatar + name header */}
          <div
            className="px-5 pt-6 pb-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(184,212,232,0.3) 0%, rgba(201,184,232,0.2) 100%)',
            }}
          >
            <div
              className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }}
            />
            <div className="flex items-center gap-4 relative z-10">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #B8D4E8 0%, #C9B8E8 100%)',
                }}
              >
                <span
                  className="text-xl font-extrabold text-white"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {initials}
                </span>
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                      className="h-9 rounded-xl border-0 text-sm font-bold text-[#3D4A5C] focus-visible:ring-[#B8D4E8] flex-1"
                      style={{ background: 'rgba(255,255,255,0.78)' }}
                      autoFocus
                    />
                    <Button
                      size="icon"
                      className="w-8 h-8 rounded-xl flex-shrink-0"
                      style={{ background: '#A8D8B9', color: '#2D5A3E' }}
                      onClick={saveName}
                      disabled={nameSaving}
                    >
                      {nameSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 rounded-xl flex-shrink-0"
                      style={{ background: 'rgba(242,168,168,0.3)', color: '#C0605A' }}
                      onClick={() => { setEditingName(false); setNameValue(profile?.name ?? '') }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-base font-extrabold text-[#3D4A5C] truncate"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {profile?.name ?? '—'}
                    </h2>
                    <button
                      onClick={() => setEditingName(true)}
                      className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-white/50"
                      style={{ background: 'rgba(255,255,255,0.35)' }}
                    >
                      <Pencil className="h-3 w-3 text-[#4A7B9D]" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-[#7A8899] mt-0.5 truncate">{profile?.email ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tracker members shortcut ── */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.25)',
          }}
        >
          <p className="px-5 pt-4 pb-2 text-[10px] font-bold text-[#9AAAB8] uppercase tracking-wider">
            Tracker
          </p>
          <Link href="/settings/members">
            <div className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/40 active:bg-white/60">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201,184,232,0.25)' }}
                >
                  <Users className="h-4.5 w-4.5 text-[#7B5EA7]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3D4A5C] leading-tight">Anggota & Kode Undangan</p>
                  <p className="text-xs text-[#9AAAB8] mt-0.5">Kelola anggota tracker</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#C0CAD3] flex-shrink-0" />
            </div>
          </Link>
        </div>

        {/* ── Akun section ── */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.25)',
          }}
        >
          <p className="px-5 pt-4 pb-2 text-[10px] font-bold text-[#9AAAB8] uppercase tracking-wider">
            Keamanan
          </p>

          {/* Change password */}
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/40 active:bg-white/60"
            onClick={() => setPwOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(184,212,232,0.25)' }}
              >
                <Lock className="h-4 w-4 text-[#4A7B9D]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#3D4A5C] leading-tight">Ubah Password</p>
                <p className="text-xs text-[#9AAAB8] mt-0.5">Perbarui password login kamu</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#C0CAD3] flex-shrink-0" />
          </button>

          <Separator style={{ background: 'rgba(184,212,232,0.18)' }} />

          {/* Profile info */}
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(184,212,232,0.18)' }}
              >
                <User2 className="h-4 w-4 text-[#7A8899]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#3D4A5C] leading-tight">ID Akun</p>
                <p className="text-[11px] text-[#9AAAB8] mt-0.5 font-mono">
                  {profile?.id?.slice(0, 8)}…
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Danger zone ── */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(242,168,168,0.2)',
          }}
        >
          <p className="px-5 pt-4 pb-2 text-[10px] font-bold text-[#C0605A] uppercase tracking-wider">
            Lainnya
          </p>
          <button
            className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-red-50/40 active:bg-red-50/60"
            onClick={() => setSignOutOpen(true)}
          >
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(242,168,168,0.2)' }}
            >
              <LogOut className="h-4 w-4 text-[#C0605A]" />
            </div>
            <span className="text-sm font-semibold text-[#C0605A]">Keluar</span>
          </button>
        </div>

        {/* App version footer */}
        <p className="text-center text-xs text-[#C0CAD3] pt-2">
          MiyuCash v1.0
        </p>
      </div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent
          className="rounded-3xl border-0"
          style={{
            background: 'rgba(245,240,232,0.98)',
            backdropFilter: 'blur(20px)',
            maxWidth: '92vw',
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(184,212,232,0.25)' }}
              >
                <Lock className="h-5 w-5 text-[#4A7B9D]" />
              </div>
              <DialogTitle
                className="text-base font-extrabold text-[#3D4A5C]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Ubah Password
              </DialogTitle>
            </div>
          </DialogHeader>

          <Form {...pwForm}>
            <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-3">
              <FormField
                control={pwForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-[#7A8899] uppercase tracking-wide">
                      Password Baru
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNew ? 'text' : 'password'}
                          placeholder="Min. 8 karakter"
                          className="pr-10 rounded-xl border-[#B8D4E8]/50 bg-white/70 h-11 text-[#3D4A5C] focus-visible:ring-[#B8D4E8]"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AAAB8]"
                        >
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={pwForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-[#7A8899] uppercase tracking-wide">
                      Konfirmasi Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Ulangi password baru"
                          className="pr-10 rounded-xl border-[#B8D4E8]/50 bg-white/70 h-11 text-[#3D4A5C] focus-visible:ring-[#B8D4E8]"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AAAB8]"
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 flex-row pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setPwOpen(false); pwForm.reset() }}
                  className="flex-1 rounded-2xl font-bold text-sm h-11"
                  style={{ background: 'rgba(255,255,255,0.60)', color: '#7A8899' }}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 rounded-2xl font-bold text-sm h-11 gap-2 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                    color: '#2D3E50',
                  }}
                >
                  {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Sign out confirm dialog ── */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent
          className="rounded-3xl border-0"
          style={{
            background: 'rgba(245,240,232,0.98)',
            backdropFilter: 'blur(20px)',
            maxWidth: '88vw',
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(242,168,168,0.2)' }}
              >
                <AlertTriangle className="h-5 w-5 text-[#C0605A]" />
              </div>
              <DialogTitle
                className="text-base font-extrabold text-[#3D4A5C]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Keluar dari MiyuCash?
              </DialogTitle>
            </div>
            <p className="text-sm text-[#7A8899] leading-relaxed">
              Kamu akan keluar dari sesi ini. Login lagi kapan saja.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row pt-2">
            <Button
              variant="ghost"
              onClick={() => setSignOutOpen(false)}
              className="flex-1 rounded-2xl font-bold text-sm h-11"
              style={{ background: 'rgba(255,255,255,0.60)', color: '#7A8899' }}
            >
              Batal
            </Button>
            <Button
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="flex-1 rounded-2xl font-bold text-sm h-11 gap-2"
              style={{ background: 'rgba(242,168,168,0.85)', color: '#7A2020' }}
            >
              {signOutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

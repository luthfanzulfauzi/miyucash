'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Users,
  Crown,
  Copy,
  RefreshCw,
  Loader2,
  UserMinus,
  AlertTriangle,
  Pencil,
  Check,
  X,
  CalendarDays,
  ChevronLeft,
  Share2,
  Trash2,
  LogOut,
} from 'lucide-react'
import Link from 'next/link'
import { createClient as _createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = _createClient as unknown as () => any
import { useTrackerStore } from '@/stores/tracker'
import { PixelCat } from '@/components/shared/pixel-cat'
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
  FormMessage,
} from '@/components/ui/form'
import { formatDate, getInitials } from '@/lib/utils'
import type { User } from '@/types'
import { ExportDialog } from '@/components/shared/export-dialog'

interface MemberWithUser {
  tracker_id: string
  user_id: string
  joined_at: string
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'>
}

interface TrackerInfo {
  id: string
  name: string
  owner_id: string
  invite_code: string
}

const trackerNameSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(50, 'Nama terlalu panjang'),
})
type TrackerNameValues = z.infer<typeof trackerNameSchema>

// Avatar color palette
const AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)', text: '#2D3E50' },
  { bg: 'linear-gradient(135deg, #C9B8E8 0%, #B8A8E0 100%)', text: '#2D1E50' },
  { bg: 'linear-gradient(135deg, #F2C4A0 0%, #E8B08A 100%)', text: '#4A2A10' },
  { bg: 'linear-gradient(135deg, #A8D8B9 0%, #98C8A5 100%)', text: '#1E4A30' },
]

function memberColor(idx: number) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length]
}

export default function MembersPage() {
  const { trackerId, trackerName: storeTrackerName, currentUser, setTracker } = useTrackerStore()
  const router = useRouter()
  const [tracker, setTrackerState] = useState<TrackerInfo | null>(null)
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  // Tracker name edit
  const [editingTrackerName, setEditingTrackerName] = useState(false)
  const [trackerNameSaving, setTrackerNameSaving] = useState(false)

  // Danger zone
  const [exportOpen, setExportOpen] = useState(false)
  const [deleteTrackerOpen, setDeleteTrackerOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [leaveTrackerOpen, setLeaveTrackerOpen] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  const nameForm = useForm<TrackerNameValues>({
    resolver: zodResolver(trackerNameSchema),
    defaultValues: { name: storeTrackerName ?? '' },
  })

  // Kick member dialog
  const [kickTarget, setKickTarget] = useState<MemberWithUser | null>(null)
  const [kickLoading, setKickLoading] = useState(false)

  // Refresh invite code dialog
  const [refreshCodeOpen, setRefreshCodeOpen] = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!trackerId) return
    setLoading(true)
    try {
      const supabase = createClient()

      const [{ data: trackerData }, { data: membersData }] = await Promise.all([
        supabase.from('trackers').select('id, name, owner_id, invite_code').eq('id', trackerId).single(),
        supabase
          .from('tracker_members')
          .select('tracker_id, user_id, joined_at, user:users(id, name, email, avatar_url)')
          .eq('tracker_id', trackerId),
      ])

      if (trackerData) {
        setTrackerState(trackerData as TrackerInfo)
        setIsOwner((trackerData as TrackerInfo).owner_id === currentUser?.id)
        nameForm.reset({ name: (trackerData as TrackerInfo).name })
      }
      setMembers((membersData ?? []) as MemberWithUser[])
    } finally {
      setLoading(false)
    }
  }, [trackerId, currentUser?.id, nameForm])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function saveTrackerName(values: TrackerNameValues) {
    if (!tracker || values.name === tracker.name) {
      setEditingTrackerName(false)
      return
    }
    setTrackerNameSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('trackers')
        .update({ name: values.name })
        .eq('id', tracker.id)
      if (error) throw error
      setTrackerState({ ...tracker, name: values.name })
      setTracker({ id: tracker.id, name: values.name })
      toast.success('Nama tracker diperbarui!')
      setEditingTrackerName(false)
    } catch {
      toast.error('Gagal menyimpan. Coba lagi.')
    } finally {
      setTrackerNameSaving(false)
    }
  }

  async function kickMember() {
    if (!kickTarget || !tracker) return
    setKickLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tracker_members')
        .delete()
        .eq('tracker_id', tracker.id)
        .eq('user_id', kickTarget.user_id)
      if (error) throw error
      setMembers((prev) => prev.filter((m) => m.user_id !== kickTarget.user_id))
      toast.success(`${kickTarget.user.name} dikeluarkan dari tracker.`)
      setKickTarget(null)
    } catch {
      toast.error('Gagal mengeluarkan anggota. Coba lagi.')
    } finally {
      setKickLoading(false)
    }
  }

  async function refreshInviteCode() {
    if (!tracker) return
    setRefreshLoading(true)
    try {
      const supabase = createClient()
      const { data: newCode, error: codeError } = await supabase.rpc('generate_invite_code')
      if (codeError || !newCode) throw codeError ?? new Error('Gagal generate kode.')

      const { error } = await supabase
        .from('trackers')
        .update({ invite_code: newCode })
        .eq('id', tracker.id)
      if (error) throw error

      setTrackerState({ ...tracker, invite_code: newCode })
      toast.success('Kode undangan diperbarui!')
      setRefreshCodeOpen(false)
    } catch {
      toast.error('Gagal memperbarui kode. Coba lagi.')
    } finally {
      setRefreshLoading(false)
    }
  }

  function copyCode() {
    if (!tracker) return
    navigator.clipboard.writeText(tracker.invite_code)
    toast.success('Kode disalin!')
  }

  function shareCode() {
    if (!tracker) return
    const text = `Join tracker MiyuCash aku dengan kode: ${tracker.invite_code}`
    if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Teks undangan disalin!')
    }
  }

  async function routeAfterTrackerChange() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: memberships } = await supabase
      .from('tracker_members')
      .select('tracker_id')
      .eq('user_id', user.id)
    if (memberships && memberships.length > 0) {
      router.push('/tracker-select')
    } else {
      router.push('/onboarding')
    }
  }

  async function leaveTracker() {
    if (!tracker || !currentUser) return
    setLeaveLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tracker_members')
        .delete()
        .eq('tracker_id', tracker.id)
        .eq('user_id', currentUser.id)
      if (error) throw error
      toast.success('Kamu keluar dari tracker.')
      await routeAfterTrackerChange()
    } catch {
      toast.error('Gagal keluar. Coba lagi.')
      setLeaveLoading(false)
    }
  }

  async function deleteTracker() {
    if (!tracker || deleteConfirmName !== tracker.name) return
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const { data: cycleRows } = await supabase.from('cycles').select('id').eq('tracker_id', tracker.id)
      const cycleIds = (cycleRows ?? []).map((c: { id: string }) => c.id)
      if (cycleIds.length > 0) {
        await supabase.from('budgets').delete().in('cycle_id', cycleIds)
      }
      await supabase.from('transactions').delete().eq('tracker_id', tracker.id)
      await supabase.from('accounts').delete().eq('tracker_id', tracker.id)
      await supabase.from('categories').delete().eq('tracker_id', tracker.id)
      await supabase.from('cycles').delete().eq('tracker_id', tracker.id)
      await supabase.from('tracker_members').delete().eq('tracker_id', tracker.id)
      const { error } = await supabase.from('trackers').delete().eq('id', tracker.id)
      if (error) throw error
      toast.success('Tracker berhasil dihapus.')
      await routeAfterTrackerChange()
    } catch {
      toast.error('Gagal menghapus tracker. Coba lagi.')
      setDeleteLoading(false)
    }
  }

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
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl w-9 h-9"
              style={{ background: 'rgba(255,255,255,0.78)' }}
            >
              <ChevronLeft className="h-4 w-4 text-[#3D4A5C]" />
            </Button>
          </Link>
          <div>
            <h1
              className="text-xl font-extrabold text-[#3D4A5C] tracking-tight"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Anggota & Undangan
            </h1>
            <p className="text-xs text-[#7A8899] mt-0.5">{members.length} anggota</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-10 space-y-4">
        {/* ── Tracker name card ── */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.25)',
          }}
        >
          <div className="px-5 pt-5 pb-4">
            <p className="text-[10px] font-bold text-[#9AAAB8] uppercase tracking-wider mb-3">
              Nama Tracker
            </p>

            {editingTrackerName ? (
              <Form {...nameForm}>
                <form onSubmit={nameForm.handleSubmit(saveTrackerName)}>
                  <FormField
                    control={nameForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              className="flex-1 h-10 rounded-xl border-[#B8D4E8]/50 bg-[#F5F0E8]/60 text-sm font-bold text-[#3D4A5C] focus-visible:ring-[#B8D4E8]"
                              autoFocus
                              {...field}
                            />
                            <Button
                              type="submit"
                              size="icon"
                              className="w-9 h-9 rounded-xl flex-shrink-0"
                              style={{ background: '#A8D8B9', color: '#2D5A3E' }}
                              disabled={trackerNameSaving}
                            >
                              {trackerNameSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="w-9 h-9 rounded-xl flex-shrink-0"
                              style={{ background: 'rgba(242,168,168,0.3)', color: '#C0605A' }}
                              onClick={() => setEditingTrackerName(false)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            ) : (
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-extrabold text-[#3D4A5C]"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {tracker?.name ?? storeTrackerName ?? '—'}
                </h2>
                {isOwner && (
                  <button
                    onClick={() => setEditingTrackerName(true)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[#B8D4E8]/30"
                    style={{ background: 'rgba(184,212,232,0.15)' }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-[#4A7B9D]" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Members list ── */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.25)',
          }}
        >
          <div
            className="px-5 py-3.5 border-b flex items-center gap-2"
            style={{ borderColor: 'rgba(184,212,232,0.18)' }}
          >
            <Users className="h-4 w-4 text-[#7A8899]" />
            <h3
              className="text-sm font-extrabold text-[#3D4A5C]"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Anggota
            </h3>
            <span
              className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(184,212,232,0.25)',
                color: '#4A7B9D',
              }}
            >
              {members.length}
            </span>
          </div>

          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 px-5 text-center">
              <PixelCat size={60} />
              <p className="text-sm font-semibold text-[#7A8899]">Belum ada anggota</p>
            </div>
          ) : (
            members.map((member, idx) => {
              const isMe = member.user_id === currentUser?.id
              const isTrackerOwner = member.user_id === tracker?.owner_id
              const color = memberColor(idx)

              return (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 px-5 py-4"
                  style={{
                    borderTop: idx > 0 ? '1px solid rgba(184,212,232,0.13)' : undefined,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: color.bg }}
                  >
                    <span
                      className="text-sm font-extrabold"
                      style={{ color: color.text, fontFamily: 'var(--font-nunito)' }}
                    >
                      {getInitials(member.user.name)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#3D4A5C] leading-tight truncate">
                        {member.user.name}
                        {isMe && <span className="ml-1 text-[10px] text-[#9AAAB8] font-medium">(kamu)</span>}
                      </p>
                      {isTrackerOwner && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0"
                          style={{
                            background: 'rgba(245,230,163,0.4)',
                            color: '#8A7A30',
                            border: '1px solid rgba(245,230,163,0.6)',
                          }}
                        >
                          <Crown className="h-2.5 w-2.5" />
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9AAAB8] truncate mt-0.5">{member.user.email}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CalendarDays className="h-3 w-3 text-[#C0CAD3]" />
                      <p className="text-[10px] text-[#C0CAD3]">
                        Bergabung {formatDate(member.joined_at)}
                      </p>
                    </div>
                  </div>

                  {/* Kick button (owner only, not for self, not for tracker owner) */}
                  {isOwner && !isMe && !isTrackerOwner && (
                    <button
                      onClick={() => setKickTarget(member)}
                      className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-red-50"
                      style={{ background: 'rgba(242,168,168,0.15)' }}
                    >
                      <UserMinus className="h-3.5 w-3.5 text-[#C0605A]" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* ── Invite code (owner only) ── */}
        {isOwner && tracker?.invite_code && (
          <div
            className="rounded-3xl border overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(201,184,232,0.25) 0%, rgba(184,212,232,0.2) 100%)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(201,184,232,0.35)',
            }}
          >
            <div className="px-5 pt-5 pb-5">
              <p className="text-[10px] font-bold text-[#7B5EA7] uppercase tracking-wider mb-4">
                Kode Undangan
              </p>

              {/* Code display */}
              <div
                className="rounded-2xl p-4 mb-4 text-center relative"
                style={{ background: 'rgba(255,255,255,0.65)' }}
              >
                <p
                  className="text-3xl font-extrabold tracking-[0.25em] text-[#3D4A5C] select-all"
                  style={{ fontFamily: 'var(--font-nunito)', letterSpacing: '0.25em' }}
                >
                  {tracker.invite_code}
                </p>
                <p className="text-xs text-[#9AAAB8] mt-1.5">
                  Bagikan kode ini ke pasanganmu
                </p>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={copyCode}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.65)',
                    border: '1px solid rgba(184,212,232,0.3)',
                  }}
                >
                  <Copy className="h-4 w-4 text-[#4A7B9D]" />
                  <span className="text-[10px] font-bold text-[#4A7B9D]">Salin</span>
                </button>

                <button
                  onClick={shareCode}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.65)',
                    border: '1px solid rgba(201,184,232,0.3)',
                  }}
                >
                  <Share2 className="h-4 w-4 text-[#7B5EA7]" />
                  <span className="text-[10px] font-bold text-[#7B5EA7]">Bagikan</span>
                </button>

                <button
                  onClick={() => setRefreshCodeOpen(true)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.65)',
                    border: '1px solid rgba(242,168,168,0.3)',
                  }}
                >
                  <RefreshCw className="h-4 w-4 text-[#C0605A]" />
                  <span className="text-[10px] font-bold text-[#C0605A]">Perbarui</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Danger zone ── */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(242,168,168,0.3)',
          }}
        >
          <div className="px-5 pt-5 pb-5 space-y-3">
            <p className="text-[10px] font-bold text-[#C0605A] uppercase tracking-wider">
              Zona Berbahaya
            </p>
            {!isOwner && (
              <button
                onClick={() => setLeaveTrackerOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-[0.98]"
                style={{ background: 'rgba(242,168,168,0.1)', borderColor: 'rgba(242,168,168,0.3)' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(242,168,168,0.2)' }}>
                  <LogOut className="h-4 w-4 text-[#C0605A]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#C0605A]">Keluar dari Tracker</p>
                  <p className="text-xs text-[#9AAAB8] mt-0.5">Hapus tracker ini dari akunmu</p>
                </div>
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setDeleteTrackerOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-[0.98]"
                style={{ background: 'rgba(242,168,168,0.1)', borderColor: 'rgba(242,168,168,0.3)' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(242,168,168,0.2)' }}>
                  <Trash2 className="h-4 w-4 text-[#C0605A]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#C0605A]">Hapus Tracker</p>
                  <p className="text-xs text-[#9AAAB8] mt-0.5">Hapus semua data permanen — tidak bisa dibatalkan</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Kick member dialog ── */}
      <Dialog open={!!kickTarget} onOpenChange={(open) => { if (!open) setKickTarget(null) }}>
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
                Keluarkan Anggota?
              </DialogTitle>
            </div>
            <p className="text-sm text-[#7A8899] leading-relaxed">
              <strong className="text-[#3D4A5C]">{kickTarget?.user.name}</strong> akan dikeluarkan dari tracker ini.
              Mereka tidak akan bisa mengakses data tracker lagi.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row pt-2">
            <Button
              variant="ghost"
              onClick={() => setKickTarget(null)}
              className="flex-1 rounded-2xl font-bold text-sm h-11"
              style={{ background: 'rgba(255,255,255,0.60)', color: '#7A8899' }}
            >
              Batal
            </Button>
            <Button
              onClick={kickMember}
              disabled={kickLoading}
              className="flex-1 rounded-2xl font-bold text-sm h-11 gap-2"
              style={{ background: 'rgba(242,168,168,0.85)', color: '#7A2020' }}
            >
              {kickLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
              Keluarkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Refresh invite code confirm dialog ── */}
      <Dialog open={refreshCodeOpen} onOpenChange={setRefreshCodeOpen}>
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
                style={{ background: 'rgba(245,230,163,0.35)' }}
              >
                <RefreshCw className="h-5 w-5 text-[#8A7A30]" />
              </div>
              <DialogTitle
                className="text-base font-extrabold text-[#3D4A5C]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Perbarui Kode Undangan?
              </DialogTitle>
            </div>
            <p className="text-sm text-[#7A8899] leading-relaxed">
              Kode lama <strong className="text-[#3D4A5C] font-mono">{tracker?.invite_code}</strong> akan tidak berlaku.
              Kamu perlu membagikan kode baru ke siapapun yang ingin bergabung.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row pt-2">
            <Button
              variant="ghost"
              onClick={() => setRefreshCodeOpen(false)}
              className="flex-1 rounded-2xl font-bold text-sm h-11"
              style={{ background: 'rgba(255,255,255,0.60)', color: '#7A8899' }}
            >
              Batal
            </Button>
            <Button
              onClick={refreshInviteCode}
              disabled={refreshLoading}
              className="flex-1 rounded-2xl font-bold text-sm h-11 gap-2"
              style={{
                background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                color: '#2D3E50',
              }}
            >
              {refreshLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Perbarui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ExportDialog for backup ── */}
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />

      {/* ── Leave tracker dialog ── */}
      <Dialog open={leaveTrackerOpen} onOpenChange={(o) => { if (!o) setLeaveTrackerOpen(false) }}>
        <DialogContent className="rounded-3xl border-0" style={{ background: 'rgba(245,240,232,0.98)', backdropFilter: 'blur(20px)', maxWidth: '88vw' }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(242,168,168,0.2)' }}>
                <LogOut className="h-5 w-5 text-[#C0605A]" />
              </div>
              <DialogTitle className="text-base font-extrabold text-[#3D4A5C]" style={{ fontFamily: 'var(--font-nunito)' }}>
                Keluar dari Tracker?
              </DialogTitle>
            </div>
            <p className="text-sm text-[#7A8899] leading-relaxed">
              Tracker <strong className="text-[#3D4A5C]">{tracker?.name}</strong> akan hilang dari akunmu. Data tracker tetap tersimpan untuk anggota lain.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row pt-2">
            <Button variant="ghost" onClick={() => setLeaveTrackerOpen(false)} className="flex-1 rounded-2xl font-bold text-sm h-11" style={{ background: 'rgba(255,255,255,0.60)', color: '#7A8899' }}>
              Batal
            </Button>
            <Button onClick={leaveTracker} disabled={leaveLoading} className="flex-1 rounded-2xl font-bold text-sm h-11 gap-2" style={{ background: 'rgba(242,168,168,0.85)', color: '#7A2020' }}>
              {leaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete tracker dialog ── */}
      <Dialog open={deleteTrackerOpen} onOpenChange={(o) => { if (!o) { setDeleteTrackerOpen(false); setDeleteConfirmName('') } }}>
        <DialogContent className="rounded-3xl border-0" style={{ background: 'rgba(245,240,232,0.98)', backdropFilter: 'blur(20px)', maxWidth: '88vw' }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(242,168,168,0.2)' }}>
                <Trash2 className="h-5 w-5 text-[#C0605A]" />
              </div>
              <DialogTitle className="text-base font-extrabold text-[#3D4A5C]" style={{ fontFamily: 'var(--font-nunito)' }}>
                Hapus Tracker?
              </DialogTitle>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-[#7A8899] leading-relaxed">
                Semua data tracker <strong className="text-[#3D4A5C]">{tracker?.name}</strong> akan dihapus permanen, termasuk transaksi, akun, budget, dan kategori.
              </p>
              <button
                onClick={() => setExportOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-left"
                style={{ background: 'rgba(184,212,232,0.15)', borderColor: 'rgba(184,212,232,0.4)' }}
              >
                <AlertTriangle className="h-4 w-4 text-[#4A7B9D] flex-shrink-0" />
                <span className="text-xs font-semibold text-[#4A7B9D]">Export data dulu sebelum hapus →</span>
              </button>
              <div>
                <p className="text-xs text-[#7A8899] mb-1.5">Ketik <strong className="text-[#3D4A5C]">{tracker?.name}</strong> untuk konfirmasi:</p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={tracker?.name ?? ''}
                  className="h-10 rounded-xl border-[#F2A8A8]/60 bg-white/60 text-sm font-bold text-[#3D4A5C] focus-visible:ring-[#F2A8A8]"
                />
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row pt-2">
            <Button variant="ghost" onClick={() => { setDeleteTrackerOpen(false); setDeleteConfirmName('') }} className="flex-1 rounded-2xl font-bold text-sm h-11" style={{ background: 'rgba(255,255,255,0.60)', color: '#7A8899' }}>
              Batal
            </Button>
            <Button
              onClick={deleteTracker}
              disabled={deleteLoading || deleteConfirmName !== tracker?.name}
              className="flex-1 rounded-2xl font-bold text-sm h-11 gap-2"
              style={{ background: deleteConfirmName === tracker?.name ? 'rgba(192,96,90,0.9)' : 'rgba(192,96,90,0.3)', color: deleteConfirmName === tracker?.name ? 'white' : '#9AAAB8' }}
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

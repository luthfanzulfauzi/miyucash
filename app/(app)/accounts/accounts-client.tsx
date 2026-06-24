'use client'

import { useState, useCallback } from 'react'
import {
  Wallet, Building2, Smartphone, Plus, Pencil, Trash2,
  TrendingUp, TrendingDown, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { PixelCat } from '@/components/shared/pixel-cat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Account, AccountWithBalance } from '@/types'
import type { Database } from '@/types/supabase'

type AccountRow = Database['public']['Tables']['accounts']['Row']

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountsClientProps {
  initialAccounts: AccountWithBalance[]
  trackerId: string
  userId: string
}

interface AccountFormData {
  name: string
  type: 'cash' | 'bank' | 'ewallet'
  initial_balance: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_CONFIG = {
  cash: {
    label: 'Tunai',
    Icon: Wallet,
    gradient: 'from-[#F2C4A0] to-[#F5B8B8]',
    bg: '#F2C4A0',
    text: '#8B4513',
  },
  bank: {
    label: 'Bank',
    Icon: Building2,
    gradient: 'from-[#B8D4E8] to-[#9BC4E0]',
    bg: '#B8D4E8',
    text: '#1A4A6B',
  },
  ewallet: {
    label: 'E-Wallet',
    Icon: Smartphone,
    gradient: 'from-[#C9B8E8] to-[#B8A4E0]',
    bg: '#C9B8E8',
    text: '#3D1A6B',
  },
} as const

function computeBalance(
  account: Account,
  transactions: { type: string; amount: number; account_id: string; to_account_id: string | null }[]
): number {
  let balance = Number(account.initial_balance)
  for (const t of transactions) {
    if (t.type === 'income' && t.account_id === account.id) balance += Number(t.amount)
    if (t.type === 'expense' && t.account_id === account.id) balance -= Number(t.amount)
    if (t.type === 'transfer' && t.account_id === account.id) balance -= Number(t.amount)
    if (t.type === 'transfer' && t.to_account_id === account.id) balance += Number(t.amount)
  }
  return balance
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  accountName,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean
  accountName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm mx-4"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
        <div className="flex flex-col items-center gap-4 pt-2 pb-2">
          <div className="w-14 h-14 rounded-2xl bg-[#F2A8A8]/20 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-rose-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-extrabold text-[#3D4A5C]" style={{ fontFamily: 'var(--font-nunito)' }}>
              Hapus Akun?
            </h3>
            <p className="text-sm text-[#7A8899] mt-1">
              Akun <span className="font-semibold text-[#3D4A5C]">&ldquo;{accountName}&rdquo;</span> akan dihapus permanen.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl border-[#B8D4E8] text-[#7A8899] hover:bg-[#F5F0E8]"
              onClick={onCancel}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              className="flex-1 rounded-2xl bg-rose-400 hover:bg-rose-500 text-white border-0"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Account Form Dialog ──────────────────────────────────────────────────────

function AccountFormDialog({
  open,
  onOpenChange,
  editAccount,
  trackerId,
  userId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editAccount: AccountWithBalance | null
  trackerId: string
  userId: string
  onSuccess: () => void
}) {
  const isEdit = editAccount !== null
  const [form, setForm] = useState<AccountFormData>({
    name: editAccount?.name ?? '',
    type: editAccount?.type ?? 'bank',
    initial_balance: editAccount?.initial_balance?.toString() ?? '0',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<AccountFormData>>({})

  // Sync when editAccount changes
  const syncForm = useCallback(() => {
    setForm({
      name: editAccount?.name ?? '',
      type: editAccount?.type ?? 'bank',
      initial_balance: editAccount?.initial_balance?.toString() ?? '0',
    })
    setErrors({})
  }, [editAccount])

  const validate = (): boolean => {
    const e: Partial<AccountFormData> = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Minimal 2 karakter'
    if (form.name.trim().length > 30) e.name = 'Maksimal 30 karakter'
    const bal = parseFloat(form.initial_balance)
    if (isNaN(bal) || bal < 0) e.initial_balance = 'Saldo tidak valid'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    const supabase = createClient()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      if (isEdit) {
        const { error } = await db
          .from('accounts')
          .update({
            name: form.name.trim(),
            type: form.type,
            initial_balance: parseFloat(form.initial_balance),
          })
          .eq('id', editAccount!.id)
        if (error) throw error
        toast.success('Akun berhasil diperbarui')
      } else {
        const { error } = await db
          .from('accounts')
          .insert({
            tracker_id: trackerId,
            name: form.name.trim(),
            type: form.type,
            initial_balance: parseFloat(form.initial_balance),
            currency: 'IDR',
            created_by: userId,
          })
        if (error) throw error
        toast.success('Akun berhasil ditambahkan')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const config = ACCOUNT_TYPE_CONFIG[form.type]
  const TypeIcon = config.Icon

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (v) syncForm() } }}>
      <DialogContent
        className="rounded-3xl border-0 shadow-2xl max-w-sm mx-4 p-0 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
      >
        {/* Header strip */}
        <div
          className={`h-2 w-full bg-gradient-to-r ${config.gradient}`}
        />

        <div className="p-6 pt-5">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: config.bg + '30' }}
              >
                <TypeIcon className="w-5 h-5" style={{ color: config.text }} />
              </div>
              <DialogTitle
                className="text-xl font-extrabold text-[#3D4A5C]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {isEdit ? 'Edit Akun' : 'Tambah Akun'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#7A8899] uppercase tracking-wider">
                Nama Akun
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: BCA Utama"
                className="rounded-2xl border-[#B8D4E8]/60 bg-[#F5F0E8]/60 focus-visible:ring-[#B8D4E8] text-[#3D4A5C] placeholder:text-[#B8C8D8]"
              />
              {errors.name && <p className="text-xs text-rose-400 pl-1">{errors.name}</p>}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#7A8899] uppercase tracking-wider">
                Tipe Akun
              </Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'cash' | 'bank' | 'ewallet' }))}
              >
                <SelectTrigger className="rounded-2xl border-[#B8D4E8]/60 bg-[#F5F0E8]/60 focus:ring-[#B8D4E8] text-[#3D4A5C]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-[#B8D4E8]/40">
                  {(Object.entries(ACCOUNT_TYPE_CONFIG) as [string, typeof ACCOUNT_TYPE_CONFIG['cash']][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="rounded-xl">
                      <div className="flex items-center gap-2">
                        <cfg.Icon className="w-4 h-4" style={{ color: cfg.text }} />
                        <span>{cfg.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Initial Balance */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#7A8899] uppercase tracking-wider">
                Saldo Awal (Rp)
              </Label>
              <Input
                type="number"
                min="0"
                value={form.initial_balance}
                onChange={(e) => setForm((f) => ({ ...f, initial_balance: e.target.value }))}
                placeholder="0"
                className="rounded-2xl border-[#B8D4E8]/60 bg-[#F5F0E8]/60 focus-visible:ring-[#B8D4E8] text-[#3D4A5C]"
              />
              {errors.initial_balance && <p className="text-xs text-rose-400 pl-1">{errors.initial_balance}</p>}
              <p className="text-xs text-[#B8C8D8] pl-1">
                Saldo sekarang akan dihitung dari saldo awal + semua transaksi
              </p>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full rounded-2xl bg-gradient-to-r ${config.gradient} text-[${config.text}] border-0 font-bold h-11 shadow-md hover:opacity-90 transition-opacity mt-2`}
              style={{ color: config.text }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {isEdit ? 'Simpan Perubahan' : 'Tambah Akun'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountWithBalance
  onEdit: (a: AccountWithBalance) => void
  onDelete: (a: AccountWithBalance) => void
}) {
  const cfg = ACCOUNT_TYPE_CONFIG[account.type]
  const TypeIcon = cfg.Icon
  const isPositive = account.current_balance >= 0

  return (
    <div
      className="relative rounded-3xl p-5 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 4px 24px rgba(61,74,92,0.07), 0 1px 4px rgba(61,74,92,0.04)',
        border: '1.5px solid rgba(184,212,232,0.25)',
      }}
    >
      {/* Decorative blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${cfg.bg}, transparent)` }}
      />

      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${cfg.gradient}`}
            style={{ boxShadow: `0 4px 12px ${cfg.bg}60` }}
          >
            <TypeIcon className="w-6 h-6" style={{ color: cfg.text }} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#3D4A5C] text-base truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
              {account.name}
            </p>
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-0.5"
              style={{ backgroundColor: cfg.bg + '30', color: cfg.text }}
            >
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(account)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7A8899] hover:bg-[#B8D4E8]/20 hover:text-[#4A7B9D] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(account)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7A8899] hover:bg-rose-50 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="mt-4 pt-3 border-t border-[#B8D4E8]/20">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#7A8899] uppercase tracking-wider mb-0.5">
              Saldo Sekarang
            </p>
            <p
              className={`text-2xl font-extrabold tracking-tight ${isPositive ? 'text-[#3D4A5C]' : 'text-rose-400'}`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {formatCurrency(account.current_balance)}
            </p>
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          </div>
        </div>
        {Number(account.initial_balance) !== account.current_balance && (
          <p className="text-[10px] text-[#B8C8D8] mt-1">
            Saldo awal: {formatCurrency(Number(account.initial_balance))}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function AccountsClient({
  initialAccounts,
  trackerId,
  userId,
}: AccountsClientProps) {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>(initialAccounts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<AccountWithBalance | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountWithBalance | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const [{ data: accs }, { data: txns }] = await Promise.all([
      supabase.from('accounts').select('*').eq('tracker_id', trackerId).order('created_at', { ascending: true }),
      supabase.from('transactions').select('type, amount, account_id, to_account_id').eq('tracker_id', trackerId),
    ])
    if (accs) {
      const rows = accs as AccountRow[]
      const withBalance: AccountWithBalance[] = rows.map((a) => ({
        ...a,
        current_balance: computeBalance(a, txns ?? []),
      }))
      setAccounts(withBalance)
    }
  }, [trackerId])

  const openAdd = () => {
    setEditAccount(null)
    setDialogOpen(true)
  }

  const openEdit = (a: AccountWithBalance) => {
    setEditAccount(a)
    setDialogOpen(true)
  }

  const openDelete = (a: AccountWithBalance) => {
    setDeleteTarget(a)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const supabase = createClient()
    try {
      // Check if has transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('id')
        .or(`account_id.eq.${deleteTarget.id},to_account_id.eq.${deleteTarget.id}`)
        .limit(1)

      if (txns && txns.length > 0) {
        toast.error('Akun tidak bisa dihapus karena masih ada transaksi terhubung')
        setDeleteTarget(null)
        return
      }

      const { error } = await supabase.from('accounts').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Akun berhasil dihapus')
      setDeleteTarget(null)
      await refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Summary counts
  const cashCount = accounts.filter((a) => a.type === 'cash').length
  const bankCount = accounts.filter((a) => a.type === 'bank').length
  const ewalletCount = accounts.filter((a) => a.type === 'ewallet').length

  return (
    <div className="min-h-screen px-4 pt-6 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-extrabold text-[#3D4A5C] leading-tight"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Akun Keuangan
          </h1>
          <p className="text-sm text-[#7A8899] mt-0.5">
            {accounts.length} akun terdaftar
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="rounded-2xl bg-gradient-to-r from-[#B8D4E8] to-[#9BC4E0] text-[#1A4A6B] border-0 font-bold shadow-md hover:opacity-90 transition-opacity h-10 px-4 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>

      {/* Total balance card */}
      {accounts.length > 0 && (
        <div
          className="rounded-3xl p-5 mb-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #4A7B9D 0%, #6B9EC0 50%, #8BBAD8 100%)',
            boxShadow: '0 8px 32px rgba(74,123,157,0.25)',
          }}
        >
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

          <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-1">
            Total Semua Akun
          </p>
          <p
            className="text-3xl font-extrabold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {formatCurrency(totalBalance)}
          </p>

          {/* Type counts */}
          <div className="flex gap-3 mt-3">
            {cashCount > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-2.5 py-1">
                <Wallet className="w-3 h-3 text-blue-100" />
                <span className="text-xs font-semibold text-blue-100">{cashCount} Tunai</span>
              </div>
            )}
            {bankCount > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-2.5 py-1">
                <Building2 className="w-3 h-3 text-blue-100" />
                <span className="text-xs font-semibold text-blue-100">{bankCount} Bank</span>
              </div>
            )}
            {ewalletCount > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-2.5 py-1">
                <Smartphone className="w-3 h-3 text-blue-100" />
                <span className="text-xs font-semibold text-blue-100">{ewalletCount} E-Wallet</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <PixelCat size={96} />
          <div className="text-center">
            <p className="font-extrabold text-[#3D4A5C] text-lg" style={{ fontFamily: 'var(--font-nunito)' }}>
              Belum ada akun
            </p>
            <p className="text-sm text-[#7A8899] mt-1 max-w-xs">
              Tambahkan akun bank, e-wallet, atau tunai untuk mulai mencatat keuangan kamu
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="rounded-2xl bg-gradient-to-r from-[#B8D4E8] to-[#9BC4E0] text-[#1A4A6B] border-0 font-bold shadow-md mt-2"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Akun Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editAccount={editAccount}
        trackerId={trackerId}
        userId={userId}
        onSuccess={refetch}
      />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        accountName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  )
}

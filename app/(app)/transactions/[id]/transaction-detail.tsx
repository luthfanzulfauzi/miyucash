'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Wallet,
  FileText,
  X,
  Check,
} from 'lucide-react'
import {
  Utensils, Car, ShoppingBag, Zap, Heart, GraduationCap,
  Home, Coffee, Plane, Dumbbell, Music, ShoppingCart,
  Briefcase, TrendingUp, Gift, Repeat, Circle,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Account, Category, TransactionWithRelations } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  formatCurrency,
  formatDate,
  transactionAmountColor,
  transactionAmountPrefix,
  cn,
  getInitials,
} from '@/lib/utils'

// --- Icon map ---
const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  zap: Zap,
  heart: Heart,
  'graduation-cap': GraduationCap,
  home: Home,
  coffee: Coffee,
  plane: Plane,
  dumbbell: Dumbbell,
  music: Music,
  'shopping-cart': ShoppingCart,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  gift: Gift,
  repeat: Repeat,
  circle: Circle,
}

const TYPE_META = {
  expense: {
    label: 'Pengeluaran',
    Icon: ArrowDownRight,
    bg: 'rgba(242,168,168,0.22)',
    iconColor: '#D97B7B',
    badgeBg: '#F2A8A8',
  },
  income: {
    label: 'Pemasukan',
    Icon: ArrowUpRight,
    bg: 'rgba(168,216,185,0.28)',
    iconColor: '#5DAE8B',
    badgeBg: '#A8D8B9',
  },
  transfer: {
    label: 'Transfer',
    Icon: ArrowLeftRight,
    bg: 'rgba(184,212,232,0.28)',
    iconColor: '#6B9DC0',
    badgeBg: '#B8D4E8',
  },
}

// --- Zod schemas (same as new form) ---
const baseSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: 'Masukkan nominal yang valid' }).positive('Nominal harus lebih dari 0'),
  account_id: z.string().min(1, 'Pilih akun'),
  date: z.string().min(1, 'Pilih tanggal'),
  note: z.string().max(200, 'Catatan maks 200 karakter').optional(),
})

const expenseIncomeSchema = baseSchema.extend({
  category_id: z.string().min(1, 'Pilih kategori'),
})

const transferSchema = baseSchema.extend({
  to_account_id: z.string().min(1, 'Pilih akun tujuan'),
}).refine((d) => d.account_id !== d.to_account_id, {
  message: 'Akun asal dan tujuan tidak boleh sama',
  path: ['to_account_id'],
})

type ExpenseIncomeValues = z.infer<typeof expenseIncomeSchema>
type TransferValues = z.infer<typeof transferSchema>

// --- Amount input ---
function AmountInput({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const formatted = value
    ? Number(value.replace(/\D/g, '')).toLocaleString('id-ID')
    : ''

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-2xl border-0 focus-within:ring-2 focus-within:ring-[#B8D4E8]"
        style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
      >
        <span className="text-[#7A8899] font-semibold text-sm shrink-0">Rp</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={formatted}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '')
            onChange(raw)
          }}
          className="flex-1 bg-transparent text-xl font-extrabold text-[#3D4A5C] outline-none placeholder:text-[#C9D5DF]"
          style={{ fontFamily: 'var(--font-nunito)' }}
        />
      </div>
      {error && <p className="text-xs text-[#D97B7B] mt-1 px-1">{error}</p>}
    </div>
  )
}

// --- Edit form for expense/income ---
function EditExpenseIncomeForm({
  transaction,
  accounts,
  categories,
  onCancel,
  onSaved,
}: {
  transaction: TransactionWithRelations
  accounts: Account[]
  categories: Category[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [amountRaw, setAmountRaw] = useState(String(Math.round(transaction.amount)))
  const [loading, setLoading] = useState(false)
  const filteredCats = categories.filter((c) => c.type === transaction.type as 'expense' | 'income')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExpenseIncomeValues>({
    resolver: zodResolver(expenseIncomeSchema),
    defaultValues: {
      amount: transaction.amount,
      account_id: transaction.account_id,
      category_id: transaction.category_id ?? '',
      date: transaction.date.slice(0, 10),
      note: transaction.note ?? '',
    },
  })

  useEffect(() => {
    const num = Number(amountRaw)
    setValue('amount', isNaN(num) ? 0 : num, { shouldValidate: amountRaw !== '' })
  }, [amountRaw, setValue])

  const onSubmit = async (values: ExpenseIncomeValues) => {
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('transactions')
        .update({
          amount: values.amount,
          account_id: values.account_id,
          category_id: values.category_id,
          date: values.date,
          note: values.note || null,
        })
        .eq('id', transaction.id)
      if (error) throw error
      toast.success('Transaksi berhasil diperbarui!')
      onSaved()
    } catch (err: unknown) {
      toast.error('Gagal memperbarui transaksi')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">Nominal</Label>
        <AmountInput value={amountRaw} onChange={setAmountRaw} error={errors.amount?.message} />
      </div>

      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">Akun</Label>
        <Select
          defaultValue={transaction.account_id}
          onValueChange={(v) => setValue('account_id', v as string, { shouldValidate: true })}
        >
          <SelectTrigger className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.account_id && <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.account_id.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">Kategori</Label>
        <Select
          defaultValue={transaction.category_id ?? ''}
          onValueChange={(v) => setValue('category_id', v as string, { shouldValidate: true })}
        >
          <SelectTrigger className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {filteredCats.map((c) => {
              const Icon = ICON_MAP[c.icon] ?? Circle
              return (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: c.color }} />
                    {c.name}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {errors.category_id && <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.category_id.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">Tanggal</Label>
        <input
          type="date"
          {...register('date')}
          className="w-full px-4 py-2.5 rounded-2xl text-sm text-[#3D4A5C] border-0 outline-none focus:ring-2 focus:ring-[#B8D4E8]"
          style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
        />
        {errors.date && <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.date.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Catatan <span className="normal-case text-[#9AAAB8] font-normal">(opsional)</span>
        </Label>
        <Textarea
          {...register('note')}
          rows={2}
          maxLength={200}
          className="rounded-2xl border-0 text-sm text-[#3D4A5C] resize-none focus-visible:ring-[#B8D4E8] placeholder:text-[#9AAAB8]"
          style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          className="flex-1 rounded-2xl font-bold text-sm text-[#7A8899] h-auto py-3"
          style={{ background: 'rgba(255,255,255,0.60)' }}
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-2xl font-bold text-[#3D4A5C] py-3 h-auto text-sm shadow-sm transition-all active:scale-[0.98]"
          style={{ background: '#B8D4E8' }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Simpan
        </Button>
      </div>
    </form>
  )
}

// --- Edit form for transfer ---
function EditTransferForm({
  transaction,
  accounts,
  onCancel,
  onSaved,
}: {
  transaction: TransactionWithRelations
  accounts: Account[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [amountRaw, setAmountRaw] = useState(String(Math.round(transaction.amount)))
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: transaction.amount,
      account_id: transaction.account_id,
      to_account_id: transaction.to_account_id ?? '',
      date: transaction.date.slice(0, 10),
      note: transaction.note ?? '',
    },
  })

  const fromAccount = watch('account_id')

  useEffect(() => {
    const num = Number(amountRaw)
    setValue('amount', isNaN(num) ? 0 : num, { shouldValidate: amountRaw !== '' })
  }, [amountRaw, setValue])

  const onSubmit = async (values: TransferValues) => {
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('transactions')
        .update({
          amount: values.amount,
          account_id: values.account_id,
          to_account_id: values.to_account_id,
          date: values.date,
          note: values.note || null,
        })
        .eq('id', transaction.id)
      if (error) throw error
      toast.success('Transfer berhasil diperbarui!')
      onSaved()
    } catch (err: unknown) {
      toast.error('Gagal memperbarui transfer')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">Nominal</Label>
        <AmountInput value={amountRaw} onChange={setAmountRaw} error={errors.amount?.message} />
      </div>

      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">Dari Akun</Label>
        <Select
          defaultValue={transaction.account_id}
          onValueChange={(v) => setValue('account_id', v as string, { shouldValidate: true })}
        >
          <SelectTrigger className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.account_id && <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.account_id.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">Ke Akun</Label>
        <Select
          defaultValue={transaction.to_account_id ?? ''}
          onValueChange={(v) => setValue('to_account_id', v as string, { shouldValidate: true })}
        >
          <SelectTrigger className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {accounts.filter((a) => a.id !== fromAccount).map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.to_account_id && <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.to_account_id.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">Tanggal</Label>
        <input
          type="date"
          {...register('date')}
          className="w-full px-4 py-2.5 rounded-2xl text-sm text-[#3D4A5C] border-0 outline-none focus:ring-2 focus:ring-[#B8D4E8]"
          style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
        />
      </div>

      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Catatan <span className="normal-case text-[#9AAAB8] font-normal">(opsional)</span>
        </Label>
        <Textarea
          {...register('note')}
          rows={2}
          maxLength={200}
          className="rounded-2xl border-0 text-sm text-[#3D4A5C] resize-none focus-visible:ring-[#B8D4E8] placeholder:text-[#9AAAB8]"
          style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          className="flex-1 rounded-2xl font-bold text-sm text-[#7A8899] h-auto py-3"
          style={{ background: 'rgba(255,255,255,0.60)' }}
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-2xl font-bold text-[#3D4A5C] py-3 h-auto text-sm shadow-sm transition-all active:scale-[0.98]"
          style={{ background: '#B8D4E8' }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Simpan
        </Button>
      </div>
    </form>
  )
}

// --- Main exported client component ---
export function TransactionDetail({
  transaction,
  accounts,
  categories,
}: {
  transaction: TransactionWithRelations
  accounts: Account[]
  categories: Category[]
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const meta = TYPE_META[transaction.type]
  const { Icon } = meta

  // Category icon
  const CatIcon = transaction.category?.icon
    ? (ICON_MAP[transaction.category.icon] ?? Circle)
    : Circle

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)
      if (error) throw error
      toast.success('Transaksi dihapus')
      router.push('/transactions')
    } catch (err: unknown) {
      toast.error('Gagal menghapus transaksi')
      console.error(err)
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleSaved = () => {
    setIsEditing(false)
    router.refresh()
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-6 pb-4 flex items-center justify-between"
        style={{
          background: 'rgba(245,240,232,0.90)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-colors hover:bg-white/60 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.60)' }}
          >
            <ArrowLeft className="h-4 w-4 text-[#3D4A5C] stroke-[2.5]" />
          </Link>
          <h1
            className="text-xl font-extrabold text-[#3D4A5C] leading-tight"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {isEditing ? 'Edit Transaksi' : 'Detail Transaksi'}
          </h1>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:bg-white/60 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.60)' }}
              aria-label="Edit transaksi"
            >
              <Pencil className="h-4 w-4 text-[#6B9DC0] stroke-[2]" />
            </button>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:bg-white/60 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.60)' }}
              aria-label="Hapus transaksi"
            >
              <Trash2 className="h-4 w-4 text-[#D97B7B] stroke-[2]" />
            </button>
          </div>
        )}

        {isEditing && (
          <button
            onClick={() => setIsEditing(false)}
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:bg-white/60 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.60)' }}
          >
            <X className="h-4 w-4 text-[#7A8899]" />
          </button>
        )}
      </div>

      <div className="px-4 pb-8 space-y-4">
        {/* View mode */}
        {!isEditing && (
          <>
            {/* Amount hero card */}
            <div
              className="rounded-3xl p-6 text-center space-y-3"
              style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Type icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: meta.bg }}
              >
                <Icon className="h-7 w-7 stroke-[2]" style={{ color: meta.iconColor }} />
              </div>

              {/* Amount */}
              <div>
                <p
                  className={cn('text-3xl font-extrabold tabular-nums', transactionAmountColor(transaction.type))}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {transactionAmountPrefix(transaction.type)}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>

              {/* Type badge */}
              <Badge
                className="text-[#3D4A5C] font-bold text-xs px-3 py-1 rounded-full border-0"
                style={{ background: meta.badgeBg }}
              >
                {meta.label}
              </Badge>
            </div>

            {/* Details card */}
            <div
              className="rounded-3xl divide-y divide-[rgba(184,212,232,0.25)]"
              style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Date */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(184,212,232,0.22)' }}
                >
                  <Calendar className="h-4 w-4 text-[#6B9DC0]" />
                </div>
                <div>
                  <p className="text-xs text-[#9AAAB8] font-semibold">Tanggal</p>
                  <p className="text-sm font-bold text-[#3D4A5C]">{formatDate(transaction.date)}</p>
                </div>
              </div>

              {/* Account */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(201,184,232,0.22)' }}
                >
                  <Wallet className="h-4 w-4 text-[#9B7DC0]" />
                </div>
                <div>
                  <p className="text-xs text-[#9AAAB8] font-semibold">
                    {transaction.type === 'transfer' ? 'Dari Akun' : 'Akun'}
                  </p>
                  <p className="text-sm font-bold text-[#3D4A5C]">
                    {transaction.account?.name ?? '—'}
                  </p>
                  {transaction.type === 'transfer' && transaction.to_account && (
                    <p className="text-xs text-[#7A8899] mt-0.5">
                      → {transaction.to_account.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Category (non-transfer only) */}
              {transaction.type !== 'transfer' && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: transaction.category?.color
                        ? `${transaction.category.color}22`
                        : 'rgba(242,196,160,0.22)',
                    }}
                  >
                    <CatIcon
                      className="h-4 w-4"
                      style={{ color: transaction.category?.color ?? '#C9A07A' }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-[#9AAAB8] font-semibold">Kategori</p>
                    <p className="text-sm font-bold text-[#3D4A5C]">
                      {transaction.category?.name ?? '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Note */}
              {transaction.note && (
                <div className="flex items-start gap-3 px-5 py-4">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(245,230,163,0.28)' }}
                  >
                    <FileText className="h-4 w-4 text-[#C0A84A]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#9AAAB8] font-semibold">Catatan</p>
                    <p className="text-sm text-[#3D4A5C] mt-0.5 leading-relaxed">{transaction.note}</p>
                  </div>
                </div>
              )}

              {/* Created by */}
              {transaction.created_by_user && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-[#3D4A5C]"
                    style={{ background: 'rgba(168,216,185,0.28)' }}
                  >
                    {transaction.created_by_user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={transaction.created_by_user.avatar_url}
                        alt=""
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <span className="text-[10px]">{getInitials(transaction.created_by_user.name)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#9AAAB8] font-semibold">Dicatat oleh</p>
                    <p className="text-sm font-bold text-[#3D4A5C]">
                      {transaction.created_by_user.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit mode */}
        {isEditing && (
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {transaction.type !== 'transfer' ? (
              <EditExpenseIncomeForm
                transaction={transaction}
                accounts={accounts}
                categories={categories}
                onCancel={() => setIsEditing(false)}
                onSaved={handleSaved}
              />
            ) : (
              <EditTransferForm
                transaction={transaction}
                accounts={accounts}
                onCancel={() => setIsEditing(false)}
                onSaved={handleSaved}
              />
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          className="rounded-3xl border-0 mx-4"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-[#3D4A5C] font-extrabold text-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Hapus Transaksi?
            </DialogTitle>
            <DialogDescription className="text-[#7A8899] text-sm">
              Transaksi ini akan dihapus permanen dan tidak bisa dipulihkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="flex-1 rounded-2xl font-bold text-sm text-[#7A8899] h-auto py-3"
              style={{ background: 'rgba(245,240,232,0.80)' }}
            >
              Batal
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-2xl font-bold text-sm h-auto py-3 text-white border-0"
              style={{ background: '#D97B7B' }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

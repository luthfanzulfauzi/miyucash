'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useTrackerStore } from '@/stores/tracker'
import type { Account, Category } from '@/types'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Utensils, Car, ShoppingBag, Zap, Heart, GraduationCap,
  Home, Coffee, Plane, Dumbbell, Music, ShoppingCart,
  Briefcase, TrendingUp, Gift, Repeat, Circle,
  type LucideIcon,
} from 'lucide-react'

// --- Zod schemas ---

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

// --- Today helper ---
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// --- Amount input with thousand separators ---
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

// --- ExpenseIncome form ---
function ExpenseIncomeForm({
  type,
  accounts,
  categories,
  onSuccess,
}: {
  type: 'expense' | 'income'
  accounts: Account[]
  categories: Category[]
  onSuccess: () => void
}) {
  const { trackerId } = useTrackerStore()
  const [amountRaw, setAmountRaw] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredCats = categories.filter((c) => c.type === type)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExpenseIncomeValues>({
    resolver: zodResolver(expenseIncomeSchema),
    defaultValues: { date: todayStr() },
  })

  // Sync amount raw → form
  useEffect(() => {
    const num = Number(amountRaw)
    setValue('amount', isNaN(num) ? 0 : num, { shouldValidate: amountRaw !== '' })
  }, [amountRaw, setValue])

  const onSubmit = async (values: ExpenseIncomeValues) => {
    if (!trackerId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('transactions').insert({
        tracker_id: trackerId,
        type,
        amount: values.amount,
        date: values.date,
        account_id: values.account_id,
        to_account_id: null,
        category_id: values.category_id,
        note: values.note || null,
        created_by: user.id,
      })
      if (error) throw error

      toast.success('Transaksi berhasil dicatat!')
      onSuccess()
    } catch (err: unknown) {
      toast.error('Gagal menyimpan transaksi')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Amount */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Nominal
        </Label>
        <AmountInput
          value={amountRaw}
          onChange={setAmountRaw}
          error={errors.amount?.message}
        />
      </div>

      {/* Account */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Akun
        </Label>
        <Select onValueChange={(v) => setValue('account_id', v as string, { shouldValidate: true })}>
          <SelectTrigger
            className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
          >
            <SelectValue placeholder="Pilih akun…" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.account_id && (
          <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.account_id.message}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Kategori
        </Label>
        <Select onValueChange={(v) => setValue('category_id', v as string, { shouldValidate: true })}>
          <SelectTrigger
            className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
          >
            <SelectValue placeholder="Pilih kategori…" />
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
        {errors.category_id && (
          <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.category_id.message}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Tanggal
        </Label>
        <input
          type="date"
          {...register('date')}
          className="w-full px-4 py-2.5 rounded-2xl text-sm text-[#3D4A5C] border-0 outline-none focus:ring-2 focus:ring-[#B8D4E8]"
          style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
        />
        {errors.date && (
          <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.date.message}</p>
        )}
      </div>

      {/* Note */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Catatan <span className="normal-case text-[#9AAAB8] font-normal">(opsional)</span>
        </Label>
        <Textarea
          {...register('note')}
          placeholder="Tambah catatan…"
          rows={2}
          maxLength={200}
          className="rounded-2xl border-0 text-sm text-[#3D4A5C] resize-none focus-visible:ring-[#B8D4E8] placeholder:text-[#9AAAB8]"
          style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
        />
        {errors.note && (
          <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.note.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl font-bold text-[#3D4A5C] py-3 h-auto text-sm shadow-sm transition-all active:scale-[0.98]"
        style={{ background: '#B8D4E8' }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Simpan Transaksi
      </Button>
    </form>
  )
}

// --- Transfer form ---
function TransferForm({
  accounts,
  onSuccess,
}: {
  accounts: Account[]
  onSuccess: () => void
}) {
  const { trackerId } = useTrackerStore()
  const [amountRaw, setAmountRaw] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { date: todayStr() },
  })

  const fromAccount = watch('account_id')

  useEffect(() => {
    const num = Number(amountRaw)
    setValue('amount', isNaN(num) ? 0 : num, { shouldValidate: amountRaw !== '' })
  }, [amountRaw, setValue])

  const onSubmit = async (values: TransferValues) => {
    if (!trackerId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('transactions').insert({
        tracker_id: trackerId,
        type: 'transfer',
        amount: values.amount,
        date: values.date,
        account_id: values.account_id,
        to_account_id: values.to_account_id,
        category_id: null,
        note: values.note || null,
        created_by: user.id,
      })
      if (error) throw error

      toast.success('Transfer berhasil dicatat!')
      onSuccess()
    } catch (err: unknown) {
      toast.error('Gagal menyimpan transfer')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Amount */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Nominal
        </Label>
        <AmountInput
          value={amountRaw}
          onChange={setAmountRaw}
          error={errors.amount?.message}
        />
      </div>

      {/* From account */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Dari Akun
        </Label>
        <Select onValueChange={(v) => setValue('account_id', v as string, { shouldValidate: true })}>
          <SelectTrigger
            className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
          >
            <SelectValue placeholder="Pilih akun asal…" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.account_id && (
          <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.account_id.message}</p>
        )}
      </div>

      {/* To account */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Ke Akun
        </Label>
        <Select onValueChange={(v) => setValue('to_account_id', v as string, { shouldValidate: true })}>
          <SelectTrigger
            className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
          >
            <SelectValue placeholder="Pilih akun tujuan…" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {accounts
              .filter((a) => a.id !== fromAccount)
              .map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {errors.to_account_id && (
          <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.to_account_id.message}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Tanggal
        </Label>
        <input
          type="date"
          {...register('date')}
          className="w-full px-4 py-2.5 rounded-2xl text-sm text-[#3D4A5C] border-0 outline-none focus:ring-2 focus:ring-[#B8D4E8]"
          style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
        />
        {errors.date && (
          <p className="text-xs text-[#D97B7B] mt-1 px-1">{errors.date.message}</p>
        )}
      </div>

      {/* Note */}
      <div>
        <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-1.5 block">
          Catatan <span className="normal-case text-[#9AAAB8] font-normal">(opsional)</span>
        </Label>
        <Textarea
          {...register('note')}
          placeholder="Tambah catatan…"
          rows={2}
          maxLength={200}
          className="rounded-2xl border-0 text-sm text-[#3D4A5C] resize-none focus-visible:ring-[#B8D4E8] placeholder:text-[#9AAAB8]"
          style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl font-bold text-[#3D4A5C] py-3 h-auto text-sm shadow-sm transition-all active:scale-[0.98]"
        style={{ background: '#B8D4E8' }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Simpan Transfer
      </Button>
    </form>
  )
}

// --- Main page ---
export default function NewTransactionPage() {
  const router = useRouter()
  const { trackerId } = useTrackerStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const loadData = useCallback(async () => {
    if (!trackerId) return
    const supabase = createClient()
    const [{ data: accs }, { data: cats }] = await Promise.all([
      supabase.from('accounts').select('*').eq('tracker_id', trackerId).order('name'),
      supabase.from('categories').select('*').eq('tracker_id', trackerId).order('name'),
    ])
    setAccounts(accs ?? [])
    setCategories(cats ?? [])
    setLoadingData(false)
  }, [trackerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSuccess = () => {
    router.push('/transactions')
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-6 pb-4 flex items-center gap-3"
        style={{
          background: 'rgba(245,240,232,0.90)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Link
          href="/transactions"
          className="w-9 h-9 rounded-2xl flex items-center justify-center transition-colors hover:bg-white/60 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.60)' }}
        >
          <ArrowLeft className="h-4 w-4 text-[#3D4A5C] stroke-[2.5]" />
        </Link>
        <div>
          <h1
            className="text-xl font-extrabold text-[#3D4A5C] leading-tight"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Tambah Transaksi
          </h1>
          <p className="text-xs text-[#7A8899]">Catat pengeluaran, pemasukan, atau transfer</p>
        </div>
      </div>

      <div className="px-4 pb-8">
        {loadingData ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-[#B8D4E8]" />
          </div>
        ) : (
          <Tabs defaultValue="expense" className="space-y-5">
            <TabsList
              className="w-full rounded-2xl p-1 h-auto gap-1"
              style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
            >
              <TabsTrigger
                value="expense"
                className="flex-1 rounded-xl py-2 text-xs font-bold transition-all data-[state=active]:text-[#3D4A5C] data-[state=active]:shadow-sm"
                style={{ '--tw-data-active-bg': '#F2A8A8' } as React.CSSProperties}
              >
                <span
                  className="data-[state=active]:text-[#3D4A5C]"
                  data-state="active"
                >
                  Pengeluaran
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="flex-1 rounded-xl py-2 text-xs font-bold transition-all data-[state=active]:shadow-sm"
              >
                Pemasukan
              </TabsTrigger>
              <TabsTrigger
                value="transfer"
                className="flex-1 rounded-xl py-2 text-xs font-bold transition-all data-[state=active]:shadow-sm"
              >
                Transfer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense" className="mt-0">
              <div
                className="rounded-3xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <ExpenseIncomeForm
                  type="expense"
                  accounts={accounts}
                  categories={categories}
                  onSuccess={handleSuccess}
                />
              </div>
            </TabsContent>

            <TabsContent value="income" className="mt-0">
              <div
                className="rounded-3xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <ExpenseIncomeForm
                  type="income"
                  accounts={accounts}
                  categories={categories}
                  onSuccess={handleSuccess}
                />
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="mt-0">
              <div
                className="rounded-3xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <TransferForm accounts={accounts} onSuccess={handleSuccess} />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

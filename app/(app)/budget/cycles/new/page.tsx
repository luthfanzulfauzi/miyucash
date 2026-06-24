'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  CalendarDays,
  Loader2,
  Copy,
  ChevronLeft,
  Sparkles,
} from 'lucide-react'
import { createClient as _createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = _createClient as unknown as () => any
import { useTrackerStore } from '@/stores/tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import Link from 'next/link'

const schema = z
  .object({
    name: z.string().min(3, 'Nama minimal 3 karakter').max(50, 'Nama terlalu panjang'),
    start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
    end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
    copyBudgets: z.boolean(),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['end_date'],
  })

type FormValues = z.infer<typeof schema>

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function NewCyclePage() {
  const router = useRouter()
  const { trackerId, setActiveCycle } = useTrackerStore()
  const [previousCycleId, setPreviousCycleId] = useState<string | null>(null)
  const [hasPreviousBudgets, setHasPreviousBudgets] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: `${today.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
      start_date: formatLocalDate(firstOfMonth),
      end_date: formatLocalDate(lastOfMonth),
      copyBudgets: false,
    },
  })

  useEffect(() => {
    async function checkPreviousCycle() {
      if (!trackerId) return
      const supabase = createClient()
      const { data: prev } = await supabase
        .from('cycles')
        .select('id')
        .eq('tracker_id', trackerId)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prev) {
        setPreviousCycleId(prev.id)
        const { data: budgets } = await supabase
          .from('budgets')
          .select('id')
          .eq('cycle_id', prev.id)
          .limit(1)
        setHasPreviousBudgets((budgets ?? []).length > 0)
      }
    }
    checkPreviousCycle()
  }, [trackerId])

  async function onSubmit(values: FormValues) {
    if (!trackerId) return
    setSubmitting(true)
    try {
      const supabase = createClient()

      // Deactivate any existing active cycle first
      await supabase
        .from('cycles')
        .update({ is_active: false })
        .eq('tracker_id', trackerId)
        .eq('is_active', true)

      // Insert new cycle
      const { data: newCycle, error: cycleError } = await supabase
        .from('cycles')
        .insert({
          tracker_id: trackerId,
          name: values.name,
          start_date: values.start_date,
          end_date: values.end_date,
          is_active: true,
        })
        .select()
        .single()

      if (cycleError || !newCycle) {
        toast.error((cycleError as { message?: string } | null)?.message ?? 'Gagal membuat cycle.')
        return
      }

      // Copy budgets from previous cycle if requested
      if (values.copyBudgets && previousCycleId) {
        const { data: oldBudgets } = await supabase
          .from('budgets')
          .select('category_id, amount')
          .eq('cycle_id', previousCycleId)

        if (oldBudgets?.length) {
          await supabase.from('budgets').insert(
            oldBudgets.map((b: { category_id: string; amount: number }) => ({ ...b, cycle_id: newCycle.id })),
          )
        }
      }

      setActiveCycle(newCycle)
      toast.success('Cycle berhasil dibuat!')
      router.push('/budget')
      router.refresh()
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-6 pb-4"
        style={{ background: 'rgba(245,240,232,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/budget/cycles">
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
              className="text-xl font-extrabold text-[#3D4A5C] tracking-tight leading-tight"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Buat Cycle Baru
            </h1>
            <p className="text-xs text-[#7A8899]">Atur periode budget selanjutnya</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-10">
        {/* Decorative blob */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 relative z-10">
            {/* Name */}
            <div
              className="rounded-3xl p-5 border"
              style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(184,212,232,0.25)',
              }}
            >
              <h2
                className="text-sm font-extrabold text-[#3D4A5C] mb-4 flex items-center gap-2"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                <Sparkles className="h-4 w-4 text-[#4A7B9D]" />
                Informasi Cycle
              </h2>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-[#7A8899] uppercase tracking-wide">
                      Nama Cycle
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="contoh: Juli 2025"
                        className="rounded-xl border-[#B8D4E8]/50 bg-[#F5F0E8]/60 focus-visible:ring-[#B8D4E8] h-11 text-[#3D4A5C] font-semibold placeholder:text-[#B0BEC8] placeholder:font-normal"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Date range */}
            <div
              className="rounded-3xl p-5 border"
              style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(184,212,232,0.25)',
              }}
            >
              <h2
                className="text-sm font-extrabold text-[#3D4A5C] mb-4 flex items-center gap-2"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                <CalendarDays className="h-4 w-4 text-[#4A7B9D]" />
                Periode
              </h2>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-[#7A8899] uppercase tracking-wide">
                        Tanggal Mulai
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="rounded-xl border-[#B8D4E8]/50 bg-[#F5F0E8]/60 focus-visible:ring-[#B8D4E8] h-11 text-[#3D4A5C] font-semibold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Arrow connector */}
                <div className="flex items-center gap-2 py-0.5">
                  <div className="flex-1 h-px" style={{ background: 'rgba(184,212,232,0.3)' }} />
                  <span className="text-[10px] text-[#9AAAB8] font-medium uppercase tracking-wider">sampai</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(184,212,232,0.3)' }} />
                </div>

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-[#7A8899] uppercase tracking-wide">
                        Tanggal Selesai
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="rounded-xl border-[#B8D4E8]/50 bg-[#F5F0E8]/60 focus-visible:ring-[#B8D4E8] h-11 text-[#3D4A5C] font-semibold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Copy budgets (only show if previous cycle has budgets) */}
            {hasPreviousBudgets && (
              <div
                className="rounded-3xl border overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(201,184,232,0.3)',
                }}
              >
                <FormField
                  control={form.control}
                  name="copyBudgets"
                  render={({ field }) => (
                    <FormItem>
                      <div
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-white/30"
                        onClick={() => field.onChange(!field.value)}
                      >
                        {/* Custom checkbox */}
                        <div
                          className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            borderColor: field.value ? '#7B5EA7' : 'rgba(184,212,232,0.5)',
                            background: field.value ? '#C9B8E8' : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {field.value && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="#4A3070" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(201,184,232,0.25)' }}
                          >
                            <Copy className="h-4 w-4 text-[#7B5EA7]" />
                          </div>
                          <div>
                            <Label className="text-sm font-bold text-[#3D4A5C] cursor-pointer">
                              Salin budget dari cycle sebelumnya
                            </Label>
                            <p className="text-xs text-[#9AAAB8] mt-0.5">
                              Gunakan anggaran yang sama seperti periode lalu
                            </p>
                          </div>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl font-bold text-sm shadow-md transition-all hover:shadow-lg active:scale-[0.98] gap-2"
                style={{
                  background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                  color: '#2D3E50',
                }}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {submitting ? 'Membuat cycle...' : 'Buat Cycle'}
              </Button>

              <p className="text-center text-xs text-[#9AAAB8] mt-3">
                Cycle aktif yang ada sebelumnya akan ditutup otomatis.
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

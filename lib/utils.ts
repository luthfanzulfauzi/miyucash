import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: id })
}

/**
 * Today's date in Asia/Jakarta (WIB), as a `YYYY-MM-DD` string.
 * Use this for any "today" default instead of `new Date().toISOString()`,
 * which returns the UTC date and is a day behind for 00:00–06:59 WIB
 * (and always UTC on server components running on Vercel).
 */
export function todayJakarta(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

/**
 * Whole days remaining until (and including) `endDate`, anchored to today in
 * Asia/Jakarta. Inclusive of the end day — a cycle is still active through its
 * end_date — so today == endDate returns 1 and a past endDate returns 0.
 * Date-only math keeps it independent of time-of-day and server timezone.
 */
export function daysRemainingJakarta(endDate: string): number {
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00Z`).getTime()
  const today = new Date(`${todayJakarta()}T00:00:00Z`).getTime()
  return Math.max(0, Math.floor((end - today) / 86400000) + 1)
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy')
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// Returns a hex color (apply via inline `style.background`). Returning a hex
// rather than a Tailwind class avoids the arbitrary-value class being dropped
// when Tailwind's content scanner doesn't see the literal (lib/ isn't scanned).
export function budgetProgressColor(pct: number): string {
  if (pct >= 100) return '#F2A8A8'
  if (pct >= 80) return '#F5C9A3'
  return '#A8D8B9'
}

export function transactionAmountColor(type: 'expense' | 'income' | 'transfer'): string {
  if (type === 'income') return 'text-emerald-600'
  if (type === 'expense') return 'text-rose-500'
  return 'text-muted-foreground'
}

export function transactionAmountPrefix(type: 'expense' | 'income' | 'transfer'): string {
  if (type === 'income') return '+'
  if (type === 'expense') return '-'
  return ''
}

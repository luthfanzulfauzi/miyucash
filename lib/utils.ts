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

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy')
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function budgetProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-[#F2A8A8]'
  if (pct >= 80) return 'bg-[#F5E6A3]'
  return 'bg-[#A8D8B9]'
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

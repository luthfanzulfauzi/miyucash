'use client'

import { useState, useCallback } from 'react'
import {
  Utensils, Car, ShoppingBag, Zap, Heart, Tv, BookOpen,
  MoreHorizontal, Briefcase, Gift, Laptop, TrendingUp, Circle,
  Plus, Pencil, Trash2, Check, Coffee, Home, Music, Plane,
  Dumbbell, Baby, Pill, Scissors, Sparkles, ShoppingCart,
  Bus, Fuel, Phone, Wifi, DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Category } from '@/types'


// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  zap: Zap,
  heart: Heart,
  tv: Tv,
  'book-open': BookOpen,
  'more-horizontal': MoreHorizontal,
  briefcase: Briefcase,
  gift: Gift,
  laptop: Laptop,
  'trending-up': TrendingUp,
  circle: Circle,
  coffee: Coffee,
  home: Home,
  music: Music,
  plane: Plane,
  dumbbell: Dumbbell,
  baby: Baby,
  pill: Pill,
  scissors: Scissors,
  sparkles: Sparkles,
  'shopping-cart': ShoppingCart,
  bus: Bus,
  fuel: Fuel,
  phone: Phone,
  wifi: Wifi,
  'dollar-sign': DollarSign,
}

const ICON_KEYS = Object.keys(ICON_MAP)

// ─── Color Palette ────────────────────────────────────────────────────────────

const PALETTE = [
  '#F2C4A0', // peach
  '#B8D4E8', // blue
  '#C9B8E8', // lavender
  '#F5E6A3', // yellow
  '#F2A8A8', // pink
  '#A8D8B9', // mint
  '#D8D0C8', // warm grey
  '#F5B8B8', // rose
  '#B8E8D0', // teal
  '#E8C4B8', // salmon
  '#C8D8B8', // sage
  '#E8D4B8', // sand
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoriesClientProps {
  initialCategories: Category[]
  trackerId: string
}

interface CategoryFormData {
  name: string
  type: 'expense' | 'income'
  icon: string
  color: string
}

// ─── Icon Picker ──────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 p-3 rounded-2xl bg-[#F5F0E8]/70 border border-[#B8D4E8]/30 max-h-44 overflow-y-auto">
      {ICON_KEYS.map((key) => {
        const Icon = ICON_MAP[key]
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              selected
                ? 'bg-[#B8D4E8] shadow-md scale-110'
                : 'bg-white/60 hover:bg-[#B8D4E8]/30'
            }`}
          >
            <Icon className="w-4 h-4 text-[#3D4A5C]" />
          </button>
        )
      })}
    </div>
  )
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#F5F0E8]/70 border border-[#B8D4E8]/30">
      {PALETTE.map((color) => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
              selected ? 'scale-110 ring-2 ring-offset-2 ring-[#7A8899]' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="w-3.5 h-3.5 text-[#3D4A5C]" />}
          </button>
        )
      })}
    </div>
  )
}

// ─── Category Form Dialog ─────────────────────────────────────────────────────

function CategoryFormDialog({
  open,
  onOpenChange,
  editCategory,
  trackerId,
  onSuccess,
  defaultType,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editCategory: Category | null
  trackerId: string
  onSuccess: () => void
  defaultType: 'expense' | 'income'
}) {
  const isEdit = editCategory !== null
  const [form, setForm] = useState<CategoryFormData>({
    name: editCategory?.name ?? '',
    type: editCategory?.type ?? defaultType,
    icon: editCategory?.icon ?? 'circle',
    color: editCategory?.color ?? '#B8D4E8',
  })
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState('')

  const syncForm = useCallback(() => {
    setForm({
      name: editCategory?.name ?? '',
      type: editCategory?.type ?? defaultType,
      icon: editCategory?.icon ?? 'circle',
      color: editCategory?.color ?? '#B8D4E8',
    })
    setNameError('')
  }, [editCategory, defaultType])

  const handleSubmit = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      setNameError('Minimal 2 karakter')
      return
    }
    if (form.name.trim().length > 30) {
      setNameError('Maksimal 30 karakter')
      return
    }
    setNameError('')
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    try {
      if (isEdit) {
        const { error } = await db
          .from('categories')
          .update({ name: form.name.trim(), icon: form.icon, color: form.color })
          .eq('id', editCategory!.id)
        if (error) throw error
        toast.success('Kategori berhasil diperbarui')
      } else {
        const { error } = await db.from('categories').insert({
          tracker_id: trackerId,
          name: form.name.trim(),
          type: form.type,
          icon: form.icon,
          color: form.color,
          is_default: false,
        })
        if (error) throw error
        toast.success('Kategori berhasil ditambahkan')
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

  const PreviewIcon = ICON_MAP[form.icon] ?? Circle

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (v) syncForm() } }}>
      <DialogContent
        className="rounded-3xl border-0 shadow-2xl max-w-sm mx-4 p-0 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
      >
        {/* Header accent */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${form.color}, ${form.color}88)` }} />

        <div className="p-6 pt-5">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3">
              {/* Live preview */}
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{ backgroundColor: form.color + '40' }}
              >
                <PreviewIcon className="w-5 h-5" style={{ color: form.color }} />
              </div>
              <DialogTitle
                className="text-xl font-extrabold text-[#3D4A5C]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#7A8899] uppercase tracking-wider">
                Nama Kategori
              </Label>
              <Input
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError('') }}
                placeholder="Contoh: Makan Siang"
                className="rounded-2xl border-[#B8D4E8]/60 bg-[#F5F0E8]/60 focus-visible:ring-[#B8D4E8] text-[#3D4A5C] placeholder:text-[#B8C8D8]"
              />
              {nameError && <p className="text-xs text-rose-400 pl-1">{nameError}</p>}
            </div>

            {/* Type — only for add */}
            {!isEdit && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#7A8899] uppercase tracking-wider">
                  Tipe
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'expense' | 'income' }))}
                >
                  <SelectTrigger className="rounded-2xl border-[#B8D4E8]/60 bg-[#F5F0E8]/60 focus:ring-[#B8D4E8] text-[#3D4A5C]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-[#B8D4E8]/40">
                    <SelectItem value="expense" className="rounded-xl">Pengeluaran</SelectItem>
                    <SelectItem value="income" className="rounded-xl">Pemasukan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Icon picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#7A8899] uppercase tracking-wider">
                Ikon
              </Label>
              <IconPicker value={form.icon} onChange={(v) => setForm((f) => ({ ...f, icon: v }))} />
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#7A8899] uppercase tracking-wider">
                Warna
              </Label>
              <ColorPicker value={form.color} onChange={(v) => setForm((f) => ({ ...f, color: v }))} />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-2xl border-0 font-bold h-11 shadow-md hover:opacity-90 transition-opacity mt-2"
              style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)`, color: '#3D4A5C' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  categoryName,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean
  categoryName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className="rounded-3xl border-0 shadow-2xl max-w-sm mx-4"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex flex-col items-center gap-4 pt-2 pb-2">
          <div className="w-14 h-14 rounded-2xl bg-[#F2A8A8]/20 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-rose-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-extrabold text-[#3D4A5C]" style={{ fontFamily: 'var(--font-nunito)' }}>
              Hapus Kategori?
            </h3>
            <p className="text-sm text-[#7A8899] mt-1">
              Kategori <span className="font-semibold text-[#3D4A5C]">&ldquo;{categoryName}&rdquo;</span> akan dihapus permanen.
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

// ─── Category Item ────────────────────────────────────────────────────────────

function CategoryItem({
  category,
  onEdit,
  onDelete,
}: {
  category: Category
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  const Icon = ICON_MAP[category.icon] ?? Circle

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:bg-white/60"
      style={{
        background: 'rgba(255,255,255,0.5)',
        border: '1.5px solid rgba(184,212,232,0.2)',
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: category.color + '35' }}
      >
        <Icon className="w-5 h-5" style={{ color: category.color }} />
      </div>

      {/* Name + badge */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#3D4A5C] text-sm truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
          {category.name}
        </p>
        {category.is_default && (
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full mt-0.5"
            style={{ backgroundColor: '#B8D4E8' + '40', color: '#4A7B9D' }}
          >
            Default
          </span>
        )}
      </div>

      {/* Actions — only for custom */}
      {!category.is_default && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(category)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7A8899] hover:bg-[#B8D4E8]/20 hover:text-[#4A7B9D] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(category)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7A8899] hover:bg-rose-50 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Category List ────────────────────────────────────────────────────────────

function CategoryList({
  categories,
  type,
  onEdit,
  onDelete,
  onAdd,
}: {
  categories: Category[]
  type: 'expense' | 'income'
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
  onAdd: () => void
}) {
  const filtered = categories.filter((c) => c.type === type)
  const defaultCats = filtered.filter((c) => c.is_default)
  const customCats = filtered.filter((c) => !c.is_default)

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <PixelCat size={72} />
        <div className="text-center">
          <p className="font-extrabold text-[#3D4A5C]" style={{ fontFamily: 'var(--font-nunito)' }}>
            Belum ada kategori
          </p>
          <p className="text-sm text-[#7A8899] mt-1">
            Tambah kategori {type === 'expense' ? 'pengeluaran' : 'pemasukan'} kustom
          </p>
        </div>
        <Button
          onClick={onAdd}
          size="sm"
          className="rounded-2xl bg-gradient-to-r from-[#C9B8E8] to-[#B8A4E0] text-[#3D1A6B] border-0 font-bold mt-1"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Tambah Kategori
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-2">
      {/* Default section */}
      {defaultCats.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8C8D8] px-1 mb-2">
            Bawaan ({defaultCats.length})
          </p>
          <div className="space-y-2">
            {defaultCats.map((c) => (
              <CategoryItem key={c.id} category={c} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Custom section */}
      {customCats.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8C8D8] px-1 mb-2">
            Kustom ({customCats.length})
          </p>
          <div className="space-y-2">
            {customCats.map((c) => (
              <CategoryItem key={c.id} category={c} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function CategoriesClient({
  initialCategories,
  trackerId,
}: CategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const expenseCount = categories.filter((c) => c.type === 'expense').length
  const incomeCount = categories.filter((c) => c.type === 'income').length

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('tracker_id', trackerId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
    if (data) setCategories(data)
  }, [trackerId])

  const openAdd = () => {
    setEditCategory(null)
    setDialogOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditCategory(c)
    setDialogOpen(true)
  }

  const openDelete = (c: Category) => {
    setDeleteTarget(c)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const supabase = createClient()
    try {
      const { data: txns } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', deleteTarget.id)
        .limit(1)

      if (txns && txns.length > 0) {
        toast.error('Kategori tidak bisa dihapus karena masih digunakan di transaksi')
        setDeleteTarget(null)
        return
      }

      const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Kategori berhasil dihapus')
      setDeleteTarget(null)
      await refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-extrabold text-[#3D4A5C] leading-tight"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Kategori
          </h1>
          <p className="text-sm text-[#7A8899] mt-0.5">
            {categories.length} kategori tersedia
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="rounded-2xl bg-gradient-to-r from-[#C9B8E8] to-[#B8A4E0] text-[#3D1A6B] border-0 font-bold shadow-md hover:opacity-90 transition-opacity h-10 px-4 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}
      >
        <TabsList
          className="w-full rounded-2xl p-1 h-11 mb-4"
          style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(184,212,232,0.3)',
          }}
        >
          <TabsTrigger
            value="expense"
            className="flex-1 rounded-xl font-bold text-sm data-[state=active]:bg-[#F2A8A8]/30 data-[state=active]:text-rose-600 data-[state=active]:shadow-sm transition-all"
          >
            Pengeluaran
            <span
              className="ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
              style={{
                background: activeTab === 'expense' ? '#F2A8A8' : 'rgba(184,212,232,0.3)',
                color: activeTab === 'expense' ? '#8B1A1A' : '#7A8899',
              }}
            >
              {expenseCount}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="income"
            className="flex-1 rounded-xl font-bold text-sm data-[state=active]:bg-[#A8D8B9]/30 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all"
          >
            Pemasukan
            <span
              className="ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
              style={{
                background: activeTab === 'income' ? '#A8D8B9' : 'rgba(184,212,232,0.3)',
                color: activeTab === 'income' ? '#1A5C2A' : '#7A8899',
              }}
            >
              {incomeCount}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense">
          <CategoryList
            categories={categories}
            type="expense"
            onEdit={openEdit}
            onDelete={openDelete}
            onAdd={openAdd}
          />
        </TabsContent>

        <TabsContent value="income">
          <CategoryList
            categories={categories}
            type="income"
            onEdit={openEdit}
            onDelete={openDelete}
            onAdd={openAdd}
          />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editCategory={editCategory}
        trackerId={trackerId}
        onSuccess={refetch}
        defaultType={activeTab}
      />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        categoryName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  )
}

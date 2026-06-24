'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ExportDialog } from '@/components/shared/export-dialog'
import type { Cycle } from '@/types'

export function TransactionsExportButton({ cycles }: { cycles: Cycle[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold text-sm text-[#4A7B9D] transition-all active:scale-95"
        style={{ background: 'rgba(184,212,232,0.25)' }}
      >
        <Download className="h-4 w-4" />
        Export
      </button>
      <ExportDialog open={open} onClose={() => setOpen(false)} cycles={cycles} />
    </>
  )
}

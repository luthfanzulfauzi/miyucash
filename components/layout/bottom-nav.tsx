'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Wallet, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { href: '/budget', label: 'Budget', icon: PiggyBank },
  { href: '/accounts', label: 'Akun', icon: Wallet },
  { href: '/settings', label: 'Setelan', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(184,212,232,0.35)',
      }}
    >
      <div className="flex max-w-2xl mx-auto px-2 pb-safe">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors rounded-xl',
                isActive
                  ? 'text-[#4A7B9D]'
                  : 'text-[#9AAAB8] hover:text-[#7A8899]',
              )}
            >
              <Icon
                className={cn(
                  'h-[22px] w-[22px] transition-all',
                  isActive && 'stroke-[2.5]',
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-wide transition-all',
                  isActive && 'font-extrabold',
                )}
              >
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#B8D4E8]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

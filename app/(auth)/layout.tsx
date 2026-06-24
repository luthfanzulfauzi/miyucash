import type { Metadata } from 'next'
import { PixelCat } from '@/components/shared/pixel-cat'

export const metadata: Metadata = {
  title: { absolute: 'MiyuCash' },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #B8D4E8 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full opacity-35 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 left-[5%] w-48 h-48 rounded-full opacity-25 blur-2xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F2C4A0 0%, transparent 70%)' }}
      />

      {/* Brand header */}
      <div className="flex flex-col items-center gap-3 mb-8 z-10">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #B8D4E8 0%, #C9B8E8 100%)' }}
          >
            <PixelCat size={64} />
          </div>
          {/* Subtle glow */}
          <div
            className="absolute inset-0 rounded-3xl blur-xl opacity-50 -z-10"
            style={{ background: 'linear-gradient(135deg, #B8D4E8 0%, #C9B8E8 100%)' }}
          />
        </div>
        <div className="text-center">
          <h1
            className="text-3xl font-extrabold tracking-tight text-[#3D4A5C]"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            MiyuCash
          </h1>
          <p className="text-sm text-[#7A8899] mt-0.5 font-medium">
            Catat bareng, hemat bareng.
          </p>
        </div>
      </div>

      {/* Page content */}
      <div className="z-10 w-full max-w-sm">
        {children}
      </div>

      {/* Footer */}
      <p className="z-10 mt-8 text-xs text-[#9AAAB8]">
        © 2026 MiyuCash · dibuat dengan 🐱
      </p>
    </div>
  )
}

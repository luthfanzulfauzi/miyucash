import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Nunito } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: { default: 'MiyuCash', template: '%s | MiyuCash' },
  description: 'Catat bareng, hemat bareng.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MiyuCash' },
}

export const viewport: Viewport = {
  themeColor: '#B8D4E8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} antialiased`}>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  )
}

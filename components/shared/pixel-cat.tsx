import Image from 'next/image'
import { cn } from '@/lib/utils'

interface PixelCatProps {
  className?: string
  size?: number
}

export function PixelCat({ className, size = 80 }: PixelCatProps) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt="MiyuCash mascot - Himalayan cat"
      width={size}
      height={size}
      className={cn('rounded-2xl', className)}
    />
  )
}

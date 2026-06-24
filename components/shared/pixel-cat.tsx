import { cn } from '@/lib/utils'

interface PixelCatProps {
  className?: string
  size?: number
}

export function PixelCat({ className, size = 80 }: PixelCatProps) {
  // Himalayan cat pixel art: cream body, blue-grey points, pink nose, blue eyes
  // 16×16 grid
  const pixels: string[][] = [
    // row 0
    ['t','t','t','t','t','t','t','t','t','t','t','t','t','t','t','t'],
    // row 1 - ear tips
    ['t','t','t','p','p','t','t','t','t','t','p','p','t','t','t','t'],
    // row 2 - ears inner
    ['t','t','p','i','i','p','t','t','t','p','i','i','p','t','t','t'],
    // row 3 - ears base + head start
    ['t','t','p','p','p','p','p','p','p','p','p','p','p','t','t','t'],
    // row 4 - forehead
    ['t','t','p','c','c','c','c','c','c','c','c','c','p','t','t','t'],
    // row 5 - eye row
    ['t','t','p','c','b','c','c','c','c','c','b','c','p','t','t','t'],
    // row 6 - eye detail
    ['t','t','p','c','B','c','c','c','c','c','B','c','p','t','t','t'],
    // row 7 - nose row
    ['t','t','p','c','c','c','n','c','n','c','c','c','p','t','t','t'],
    // row 8 - mouth
    ['t','t','p','c','c','c','c','k','c','c','c','c','p','t','t','t'],
    // row 9 - chin/neck
    ['t','t','t','p','c','c','c','c','c','c','c','p','t','t','t','t'],
    // row 10 - chest fluff start
    ['t','t','t','p','c','f','f','f','f','f','c','p','t','t','t','t'],
    // row 11 - body top
    ['t','p','p','c','c','f','f','f','f','f','c','c','p','p','t','t'],
    // row 12 - body
    ['t','p','c','c','c','c','f','f','f','c','c','c','c','p','t','t'],
    // row 13 - body lower
    ['t','p','c','c','c','c','c','c','c','c','c','c','c','p','t','t'],
    // row 14 - paws
    ['t','t','p','c','c','p','t','t','t','p','c','c','p','t','t','t'],
    // row 15 - bottom
    ['t','t','t','p','p','t','t','t','t','t','p','p','t','t','t','t'],
  ]

  const colorMap: Record<string, string> = {
    't': 'transparent',  // transparent
    'p': '#8B9BB4',      // blue-grey point (Himalayan dark)
    'c': '#F5EFE6',      // cream body
    'i': '#F2C4A0',      // inner ear peach/pink
    'b': '#7BAFD4',      // eye blue (light)
    'B': '#4A90B8',      // eye blue (dark pupil)
    'n': '#E8A0A0',      // nose pink
    'k': '#C9708A',      // mouth pink-red
    'f': '#FDFAF5',      // chest fluff white
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn('pixel-art', className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MiyuCash mascot - Himalayan cat"
    >
      {pixels.map((row, y) =>
        row.map((pixel, x) => {
          if (pixel === 't') return null
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={colorMap[pixel]}
            />
          )
        })
      )}
    </svg>
  )
}

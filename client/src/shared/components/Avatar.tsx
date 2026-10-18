import { initials } from '../lib/format'
import { cn } from '../lib/utils'

const SIZES = {
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-base',
  xl: 'size-20 text-2xl',
} as const

type AvatarProps = {
  name: string
  color: string
  size?: keyof typeof SIZES
  className?: string
}

/**
 * Avatar inisial. Warnanya datang dari server supaya orang yang sama selalu
 * tampil dengan warna yang sama. Gambar dianggap hiasan karena nama pemiliknya
 * selalu ada di teks sebelahnya.
 */
export function Avatar({ name, color, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-wide',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color, color: '#F4F1E9' }}
    >
      {initials(name)}
    </span>
  )
}

import type { ReactNode } from 'react'

/**
 * Kelompok tombol pilihan. Memakai tombol dengan aria-pressed, bukan tab,
 * karena pilihan di sini mengubah data yang ditampilkan, bukan memindah panel.
 * Bentuknya pil terpisah, mengikuti filter cabang di berkas Figma.
 */
export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
}

type SegmentedControlProps<T extends string> = {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={['flex flex-wrap gap-2', className ?? ''].join(' ')}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={[
              'rounded-full border px-4 py-2 text-[13px] font-medium transition-colors',
              selected
                ? 'border-ink bg-ink text-white'
                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

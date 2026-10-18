import type { ReactNode } from 'react'

/**
 * Kelompok tombol pilihan. Memakai tombol dengan aria-pressed, bukan tab,
 * karena pilihan di sini mengubah data yang ditampilkan, bukan memindah panel.
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
      className={[
        'inline-flex flex-wrap gap-1 rounded-md border border-border p-1',
        className ?? '',
      ].join(' ')}
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
              'rounded-sm px-3 py-1 text-xs font-semibold tracking-wide uppercase transition-colors',
              selected
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

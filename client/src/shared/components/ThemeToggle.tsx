import { FiMoon, FiSun } from 'react-icons/fi'

import { useTheme } from '../hooks/useTheme'

/**
 * Sakelar tema. Labelnya menyebut tema yang akan dipakai, bukan tema sekarang,
 * supaya tindakan tombolnya jelas tanpa perlu menebak dari ikon saja.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const nextIsDark = theme !== 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextIsDark ? 'Ganti ke tema gelap' : 'Ganti ke tema terang'}
      title={nextIsDark ? 'Ganti ke tema gelap' : 'Ganti ke tema terang'}
      className={[
        'inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-accent',
        className ?? '',
      ].join(' ')}
    >
      {theme === 'dark' ? (
        <FiSun aria-hidden="true" className="size-4" />
      ) : (
        <FiMoon aria-hidden="true" className="size-4" />
      )}
    </button>
  )
}

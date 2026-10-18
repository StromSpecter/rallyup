import { FiRefreshCw, FiWifiOff } from 'react-icons/fi'

import { Button } from './ui/button'

type ErrorStateProps = {
  message?: string
  onRetry?: () => void
  className?: string
}

/**
 * Keadaan gagal selalu bisa dicoba lagi. Tanpa tombol ulangi, pengguna hanya
 * bisa memuat ulang seluruh halaman.
 */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center ' +
        (className ?? '')
      }
    >
      <FiWifiOff aria-hidden="true" className="size-7 text-muted-foreground" />
      <p className="font-display text-lg uppercase">Gagal memuat data</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {message || 'Server tidak menjawab seperti yang diharapkan.'}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <FiRefreshCw aria-hidden="true" />
          Coba lagi
        </Button>
      ) : null}
    </div>
  )
}

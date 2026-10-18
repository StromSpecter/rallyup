import { useId } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'

// Satu tempat untuk memasangkan label, petunjuk, dan pesan galat dengan
// kontrolnya. Dipakai semua formulir supaya tidak ada input tanpa label yang
// terbaca pembaca layar.

type FieldIds = {
  id: string
  describedBy: string | undefined
}

type FieldShellProps = {
  label: string
  hint?: ReactNode
  error?: string
  className?: string
  children: (ids: FieldIds) => ReactNode
}

function FieldShell({ label, hint, error, className, children }: FieldShellProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, describedBy })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type CommonProps = {
  label: string
  hint?: ReactNode
  error?: string
  className?: string
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: CommonProps & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'id'>) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={error ? 'border-destructive' : undefined}
          {...props}
        />
      )}
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: CommonProps & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className' | 'id'>) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <Textarea
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={error ? 'border-destructive' : undefined}
          {...props}
        />
      )}
    </FieldShell>
  )
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: CommonProps & Omit<React.ComponentPropsWithoutRef<'select'>, 'className' | 'id'>) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
          )}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldShell>
  )
}

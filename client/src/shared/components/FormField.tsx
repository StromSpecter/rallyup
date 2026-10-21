import { useId, Children, isValidElement } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

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
  value,
  onChange,
  disabled,
  required,
}: CommonProps &
  Omit<React.ComponentPropsWithoutRef<'select'>, 'className' | 'id' | 'children'> & {
    children?: ReactNode
  }) {
  const isEmpty = value === '' || value == null
  const radixValue = isEmpty ? '__empty' : String(value)

  const items = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const optionValue = (child.props as { value?: unknown }).value
      const itemValue = optionValue === '' || optionValue == null ? '__empty' : String(optionValue)
      return (
        <SelectItem key={itemValue} value={itemValue}>
          {(child.props as { children?: ReactNode }).children}
        </SelectItem>
      )
    })

  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <Select
          value={radixValue}
          onValueChange={(next) => {
            const original = next === '__empty' ? '' : next
            onChange?.({ target: { value: original } } as React.ChangeEvent<HTMLSelectElement>)
          }}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(error && 'border-destructive')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{items}</SelectContent>
        </Select>
      )}
    </FieldShell>
  )
}

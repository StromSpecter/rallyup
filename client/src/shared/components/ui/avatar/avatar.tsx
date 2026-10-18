import { forwardRef, useState, useEffect } from 'react'
import { cn } from '../../../lib/utils'

const Avatar = forwardRef<any, any>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        className
      )}
      {...props}
    />
  )
})
Avatar.displayName = 'Avatar'

const AvatarImage = forwardRef<any, any>(({ className, src, alt = '', onError, ...props }, ref) => {
  const [error, setError] = useState(false)

  if (!src || error) return null

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      onError={(e) => {
        setError(true)
        onError?.(e)
      }}
      className={cn('aspect-square h-full w-full object-cover', className)}
      {...props}
    />
  )
})
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = forwardRef<any, any>(({ className, delayMs, children, ...props }, ref) => {
  const [show, setShow] = useState(!delayMs)

  useEffect(() => {
    if (!delayMs || show) return
    const id = setTimeout(() => setShow(true), delayMs)
    return () => clearTimeout(id)
  }, [delayMs, show])

  if (!show) return null

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }

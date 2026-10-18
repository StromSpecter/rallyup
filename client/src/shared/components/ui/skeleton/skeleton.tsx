import { forwardRef } from 'react'
import { cn } from '../../../lib/utils'

const Skeleton = forwardRef<any, any>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
})
Skeleton.displayName = 'Skeleton'

export { Skeleton }

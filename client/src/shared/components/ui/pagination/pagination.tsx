/* eslint-disable react-refresh/only-export-components */
import { forwardRef, useState, useCallback } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '../../../lib/utils'

function range(start: any, end: any) {
  const length = end - start + 1
  return Array.from({ length }, (_: any, i: any) => start + i)
}

function paginate({ totalPages, page, siblingCount = 1, boundaryCount = 1 }: any) {
  const totalNumbers = siblingCount * 2 + boundaryCount * 2 + 1
  if (totalPages <= totalNumbers + 1) {
    return range(1, totalPages)
  }

  const leftSibling = Math.max(page - siblingCount, boundaryCount + 1)
  const rightSibling = Math.min(page + siblingCount, totalPages - boundaryCount)

  const showStartEllipsis = leftSibling > boundaryCount + 1
  const showEndEllipsis = rightSibling < totalPages - boundaryCount

  if (!showStartEllipsis && showEndEllipsis) {
    const leftCount = boundaryCount + siblingCount * 2
    return [...range(1, leftCount), 'end-ellipsis', totalPages]
  }

  if (showStartEllipsis && !showEndEllipsis) {
    const rightCount = boundaryCount + siblingCount * 2
    return [1, 'start-ellipsis', ...range(totalPages - rightCount + 1, totalPages)]
  }

  return [1, 'start-ellipsis', ...range(leftSibling, rightSibling), 'end-ellipsis', totalPages]
}

const Pagination = forwardRef<any, any>(
  (
    {
      page: controlledPage,
      defaultPage = 1,
      totalPages,
      onPageChange,
      siblingCount = 1,
      boundaryCount = 1,
      showFirstLast = false,
      disabled = false,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const isControlled = controlledPage !== undefined
    const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage)
    const page = isControlled ? controlledPage : uncontrolledPage

    const setPage = useCallback((value: any) => {
        if (disabled) return
        const next = Math.min(Math.max(value, 1), totalPages)
        if (!isControlled) setUncontrolledPage(next)
        onPageChange?.(next)
      },
      [disabled, isControlled, onPageChange, totalPages]
    )

    const items = paginate({ totalPages, page, siblingCount, boundaryCount })

    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label="Pagination"
        className={cn('mx-auto w-full', className)}
        {...props}
      >
        <PaginationContent size={size}>
          {showFirstLast && (
            <PaginationItem>
              <PaginationLink
                size="icon"
                disabled={disabled || page <= 1}
                onClick={() => setPage(1)}
                aria-label="Go to first page"
              >
                <ChevronsLeft className="size-4" />
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationLink
              size="icon"
              disabled={disabled || page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="size-4" />
            </PaginationLink>
          </PaginationItem>

          {items.map((item: any, i: any) =>
            typeof item === 'number' ? (
              <PaginationItem key={`page-${item}`}>
                <PaginationLink
                  active={item === page}
                  disabled={disabled}
                  onClick={() => setPage(item)}
                  aria-label={`Go to page ${item}`}
                  aria-current={item === page ? 'page' : undefined}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem key={`${item}-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationLink
              size="icon"
              disabled={disabled || page >= totalPages}
              onClick={() => setPage(page + 1)}
              aria-label="Go to next page"
            >
              <ChevronRight className="size-4" />
            </PaginationLink>
          </PaginationItem>

          {showFirstLast && (
            <PaginationItem>
              <PaginationLink
                size="icon"
                disabled={disabled || page >= totalPages}
                onClick={() => setPage(totalPages)}
                aria-label="Go to last page"
              >
                <ChevronsRight className="size-4" />
              </PaginationLink>
            </PaginationItem>
          )}
        </PaginationContent>
      </nav>
    )
  }
)
Pagination.displayName = 'Pagination'

const PaginationContent = forwardRef<any, any>(({ className, size = 'md', ...props }, ref) => {
  return (
    <ul
      ref={ref}
      className={cn(
        'flex items-center justify-center gap-1.5',
        size === 'sm' && 'gap-1',
        size === 'lg' && 'gap-2',
        className
      )}
      {...props}
    />
  )
})
PaginationContent.displayName = 'PaginationContent'

const PaginationItem = forwardRef<any, any>(({ className, ...props }, ref) => {
  return <li ref={ref} className={cn('', className)} {...props} />
})
PaginationItem.displayName = 'PaginationItem'

const paginationLinkVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'h-8 min-w-8 px-3 text-xs',
        md: 'h-9 min-w-9 px-4 text-sm',
        lg: 'h-10 min-w-10 px-5 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'md',
    },
  }
)

const PaginationLink = forwardRef<any, any>(
  ({ className, variant, size = 'md', active = false, asChild = false, disabled, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={(e) => {
          if (active || disabled) {
            e.preventDefault()
            return
          }
          onClick?.(e)
        }}
        className={cn(
          paginationLinkVariants({ variant: active ? 'default' : variant, size }),
          active && 'pointer-events-none',
          className
        )}
        {...props}
      />
    )
  }
)
PaginationLink.displayName = 'PaginationLink'

const PaginationEllipsis = forwardRef<any, any>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="size-4 text-muted-foreground" />
      <span className="sr-only">More pages</span>
    </span>
  )
})
PaginationEllipsis.displayName = 'PaginationEllipsis'

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  paginationLinkVariants,
  paginate,
}

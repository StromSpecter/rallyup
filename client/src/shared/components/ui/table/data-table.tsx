import { forwardRef, useState, useMemo, useEffect } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './table'
import { Pagination } from '../pagination/pagination'

const getValue = (row: any, column: any) => {
  if (column.accessor) return column.accessor(row)
  return row[column.key]
}

const getAlign = (column: any) =>
  cn(
    column.align === 'center' && 'text-center',
    column.align === 'right' && 'text-right'
  )

const DataTable = forwardRef<any, any>(
  (
    {
      columns,
      data = [],
      pageSize = 10,
      showPageSize = false,
      pageSizeOptions = [5, 10, 20, 50],
      searchPlaceholder = 'Search...',
      emptyMessage = 'No results found.',
      showActions = false,
      actions,
      actionsHeader = 'Actions',
      className,
      ...props
    },
    ref
  ) => {
    const [sort, setSort] = useState<any>(null)
    const [searches, setSearches] = useState<any>({})
    const [page, setPage] = useState(1)
    const [size, setSize] = useState(pageSize)

    const handleSort = (key: any) => {
      setSort((prev: any) => {
        if (!prev || prev.key !== key) return { key, direction: 'asc' }
        if (prev.direction === 'asc') return { key, direction: 'desc' }
        return null
      })
      setPage(1)
    }

    const handleSearch = (key: any, value: any) => {
      setSearches((prev: any) => ({ ...prev, [key]: value }))
      setPage(1)
    }

    const filteredRows = useMemo(() => {
      let rows = data
      for (const column of columns) {
        if (!column.searchable) continue
        const query = String(searches[column.key] ?? '').trim().toLowerCase()
        if (!query) continue
        rows = rows.filter((row: any) =>
          String(getValue(row, column) ?? '')
            .toLowerCase()
            .includes(query)
        )
      }
      return rows
    }, [data, columns, searches])

    const sortedRows = useMemo(() => {
      if (!sort) return filteredRows
      const column = columns.find((c: any) => c.key === sort.key)
      if (!column) return filteredRows
      const direction = sort.direction === 'asc' ? 1 : -1
      return [...filteredRows].sort((a: any, b: any) => {
        const aValue = getValue(a, column)
        const bValue = getValue(b, column)
        if (column.sortFn) return column.sortFn(aValue, bValue) * direction
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction
        }
        return (
          String(aValue ?? '').localeCompare(String(bValue ?? ''), undefined, {
            numeric: true,
          }) * direction
        )
      })
    }, [filteredRows, sort, columns])

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / size))

    useEffect(() => {
      if (page > totalPages) setPage(totalPages)
    }, [page, totalPages])

    const visibleRows = useMemo(() => {
      const start = (page - 1) * size
      return sortedRows.slice(start, start + size)
    }, [sortedRows, page, size])

    const startIndex = sortedRows.length === 0 ? 0 : (page - 1) * size + 1
    const endIndex = Math.min(page * size, sortedRows.length)

    return (
      <div
        ref={ref}
        className={cn('w-full', className)}
        {...props}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column: any) => (
                <TableHead
                  key={column.key}
                  className={cn(column.width, getAlign(column))}
                >
                  <div className={cn('flex flex-col gap-1.5', getAlign(column))}>
                    <button
                      type="button"
                      disabled={!column.sortable}
                      onClick={() => handleSort(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 font-medium text-muted-foreground',
                        getAlign(column),
                        column.sortable
                          ? 'cursor-pointer select-none hover:text-foreground'
                          : 'cursor-default'
                      )}
                    >
                      {column.header}
                      {column.sortable &&
                        (sort?.key === column.key ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" />
                        ))}
                    </button>

                    {column.searchable && (
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={searches[column.key] ?? ''}
                          onChange={(e) =>
                            handleSearch(column.key, e.target.value)
                          }
                          placeholder={searchPlaceholder}
                          aria-label={`Search ${column.header}`}
                          className="h-8 w-full min-w-[120px] rounded-md border border-input bg-background pl-7 pr-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}

              {showActions && (
                <TableHead className="w-[80px] text-right">
                  <span className="inline-flex items-center justify-end font-medium text-muted-foreground">
                    {actionsHeader}
                  </span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showActions ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row: any, index: any) => (
                <TableRow key={row.id ?? index}>
                  {columns.map((column: any) => {
                    const value = getValue(row, column)
                    return (
                      <TableCell
                        key={column.key}
                        className={getAlign(column)}
                      >
                        {column.render ? column.render(value, row) : value}
                      </TableCell>
                    )
                  })}
                  {showActions && (
                    <TableCell className="whitespace-nowrap text-right">
                      {actions ? actions(row) : null}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            Showing {startIndex}–{endIndex} of {sortedRows.length}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            {showPageSize && (
              <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
                Rows per page
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {pageSizeOptions.map((option: any) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="sm:mx-0"
            />
          </div>
        </div>
      </div>
    )
  }
)
DataTable.displayName = 'DataTable'

export { DataTable }

// ─── Table Component ──────────────────────────────────────────
// Reusable data table

import React from 'react'

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  width?: string
  render?: (item: T, index: number) => React.ReactNode
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T, index: number) => void
  keyExtractor?: (item: T, index: number) => string | number
}

function Table<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  keyExtractor,
}: TableProps<T>) {
  const getKey = (item: T, index: number): string | number => {
    if (keyExtractor) return keyExtractor(item, index)
    if ('id' in item) return item.id as string | number
    return index
  }

  const getCellValue = (item: T, column: TableColumn<T>): React.ReactNode => {
    if (column.render) {
      return column.render(item, data.indexOf(item))
    }
    const value = item[column.key as keyof T]
    if (value === null || value === undefined) return '-'
    return String(value)
  }

  if (isLoading) {
    return (
      <div className="bg-app-card2 rounded-xl border border-app-border p-8 text-center">
        <span className="animate-spin text-2xl">⏳</span>
        <p className="text-app-muted mt-2">Loading...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-app-card2 rounded-xl border border-app-border p-8 text-center">
        <p className="text-app-muted">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-app-card2 rounded-xl border border-app-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-app-border">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={getKey(item, index)}
                onClick={() => onRowClick?.(item, index)}
                className={`border-b border-app-border last:border-b-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-app-card' : ''
                } transition-colors`}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-4 py-3 text-sm text-app-text"
                  >
                    {getCellValue(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Table

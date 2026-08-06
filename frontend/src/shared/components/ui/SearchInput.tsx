import React, { useState, useRef, useEffect } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  onSubmit?: () => void
  className?: string
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  autoFocus = false,
  onSubmit,
  className = '',
}) => {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div
      className={`relative flex items-center rounded-xl transition-all duration-200
        ${focused
          ? 'bg-t-surface border border-t-primary/30 shadow-soft-sm'
          : 'bg-t-surface-hover border border-transparent'
        } ${className}`}
    >
      <MagnifyingGlass
        size={18}
        weight="bold"
        className="absolute left-3.5 text-t-text-muted pointer-events-none"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        className="w-full bg-transparent pl-10 pr-10 py-2.5 text-body-sm text-t-text placeholder:text-t-text-muted outline-none"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center bg-t-surface-active text-t-text-muted hover:text-t-text transition-colors"
          aria-label="Clear search"
          type="button"
        >
          <X size={12} weight="bold" />
        </button>
      )}
    </div>
  )
}

export default SearchInput

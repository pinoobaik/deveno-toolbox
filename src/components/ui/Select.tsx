import { useId, type SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface SelectOption<T extends string | number> {
  readonly value: T
  readonly label: string
}

interface SelectProps<T extends string | number>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'size'> {
  label: string
  hideLabel?: boolean
  options: readonly SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  description?: string | undefined
  errorMessage?: string | undefined
  containerClassName?: string | undefined
  size?: 'sm' | 'md'
}

const BASE_CLASSES =
  'w-full cursor-pointer rounded-md border bg-neutral-900 text-neutral-100 disabled:cursor-not-allowed disabled:opacity-50'

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'h-8 px-2 text-xs',
  md: 'h-9 px-3 text-sm',
}

/**
 * Labeled native `<select>`.
 *
 * The value type is carried by generics rather than a cast: the incoming
 * `event.target.value` is matched against the declared options, so `onChange`
 * hands back the original value type instead of a string.
 */
export function Select<T extends string | number>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  description,
  errorMessage,
  className,
  containerClassName,
  id,
  size = 'md',
  ...props
}: SelectProps<T>) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = `${fieldId}-description`
  const errorId = `${fieldId}-error`

  const describedBy =
    [description ? descriptionId : null, errorMessage ? errorId : null].filter(Boolean).join(' ') ||
    undefined

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      <label
        htmlFor={fieldId}
        className={cn('text-sm font-medium text-neutral-300', hideLabel && 'sr-only')}
      >
        {label}
      </label>

      {description ? (
        <p id={descriptionId} className="text-xs text-neutral-500">
          {description}
        </p>
      ) : null}

      <select
        id={fieldId}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={describedBy}
        value={String(value)}
        onChange={(event) => {
          const next = options.find((option) => String(option.value) === event.target.value)
          if (next !== undefined) onChange(next.value)
        }}
        className={cn(
          BASE_CLASSES,
          SIZE_CLASSES[size],
          errorMessage
            ? 'border-red-800 focus:border-red-500'
            : 'border-neutral-800 focus:border-neutral-600',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>

      {errorMessage ? (
        <p id={errorId} className="text-xs text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

import { useId } from 'react'

import { cn } from '@/lib/cn'

export interface SegmentedOption<T extends string | number> {
  readonly value: T
  readonly label: string
}

interface SegmentedControlProps<T extends string | number> {
  /** Group label. Rendered visibly, or for assistive technology only. */
  label: string
  hideLabel?: boolean
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  containerClassName?: string | undefined
  className?: string | undefined
}

/**
 * Mutually exclusive choice rendered as a compact segment row.
 *
 * Built from native radio inputs so arrow-key selection, group semantics, and
 * focus handling come from the platform instead of custom keyboard code. The
 * inputs stay focusable while visually hidden, and the visible segment is a
 * following sibling, so it mirrors checked and focus state through `peer-*`
 * variants rather than suppressing the focus outline.
 */
export function SegmentedControl<T extends string | number>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  disabled = false,
  containerClassName,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId()

  return (
    <fieldset className={cn('m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0', containerClassName)}>
      <legend className={cn('p-0 text-sm font-medium text-neutral-300', hideLabel && 'sr-only')}>
        {label}
      </legend>

      <div
        className={cn(
          'inline-flex w-fit rounded-md border border-neutral-800 bg-neutral-900 p-0.5',
          className,
        )}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${String(option.value)}`

          return (
            <label
              key={optionId}
              htmlFor={optionId}
              className={cn(
                'flex-1 cursor-pointer transition-colors',
                disabled && 'cursor-not-allowed',
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={groupId}
                className="peer sr-only"
                value={String(option.value)}
                checked={option.value === value}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              />
              <span
                className={cn(
                  'block rounded px-2.5 py-1.5 text-center text-xs font-medium',
                  'text-neutral-400 hover:text-neutral-200',
                  'peer-checked:bg-neutral-800 peer-checked:text-neutral-50',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-400',
                  'peer-disabled:opacity-50',
                )}
              >
                {option.label}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
